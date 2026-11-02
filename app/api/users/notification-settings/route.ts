import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getViewerUid, unauthorized } from "@/lib/api-auth";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";
import {
  CATEGORIES,
  isValidTimezone,
  resolveSettings,
  type NotificationSettings,
} from "@/lib/notification-policy";

export const maxDuration = 5;

type Subscription = { endpoint?: string; deviceId?: string; userAgent?: string; platform?: string; createdAt?: Date; lastSeen?: Date };

function deviceView(subscription: Subscription) {
  // Never send endpoints to the client; an opaque id is enough to remove one.
  const id = subscription.deviceId || createHash("sha256").update(subscription.endpoint || "").digest("hex").slice(0, 16);
  return {
    id,
    userAgent: subscription.userAgent || null,
    platform: subscription.platform || null,
    createdAt: subscription.createdAt || null,
    lastSeen: subscription.lastSeen || null,
  };
}

export async function GET(req: NextRequest) {
  const uid = await getViewerUid(req);
  if (!uid) return unauthorized();
  await connectToDB();
  const user = await User.findOne({ firebaseId: uid })
    .select("preferences notificationSettings pushSubscriptions")
    .lean() as { preferences?: object; notificationSettings?: object; pushSubscriptions?: Subscription[] } | null;
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(
    {
      settings: resolveSettings(user as Parameters<typeof resolveSettings>[0]),
      devices: (user.pushSubscriptions || []).map(deviceView),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

function sanitize(input: unknown): Partial<NotificationSettings> | null {
  if (!input || typeof input !== "object") return null;
  const body = input as Record<string, unknown>;
  const result: Partial<NotificationSettings> = {};
  for (const channel of ["push", "email"] as const) {
    const toggles = body[channel];
    if (toggles && typeof toggles === "object") {
      const clean: Record<string, boolean> = {};
      for (const category of CATEGORIES) {
        const value = (toggles as Record<string, unknown>)[category];
        if (typeof value === "boolean") clean[category] = value;
      }
      result[channel] = clean as NotificationSettings["push"];
    }
  }
  const isHour = (value: unknown) => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 23;
  if (isHour(body.reminderHour)) result.reminderHour = body.reminderHour as number;
  if (body.timezone !== undefined) {
    if (!isValidTimezone(body.timezone)) return null;
    result.timezone = body.timezone;
  }
  if (typeof body.skipWeekends === "boolean") result.skipWeekends = body.skipWeekends;
  for (const key of ["quietStart", "quietEnd"] as const) {
    if (body[key] === null) result[key] = null;
    else if (isHour(body[key])) result[key] = body[key] as number;
  }
  return result;
}

export async function PUT(req: NextRequest) {
  const uid = await getViewerUid(req);
  if (!uid) return unauthorized();
  const changes = sanitize(await req.json().catch(() => null));
  if (!changes) return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  await connectToDB();
  const user = await User.findOne({ firebaseId: uid }).select("preferences notificationSettings");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Store the fully resolved settings so legacy switches no longer apply.
  const current = resolveSettings(user.toObject() as Parameters<typeof resolveSettings>[0]);
  const next: NotificationSettings = {
    ...current,
    ...changes,
    push: { ...current.push, ...(changes.push || {}) },
    email: { ...current.email, ...(changes.email || {}) },
  };
  user.notificationSettings = next as unknown as Record<string, unknown>;
  user.markModified("notificationSettings");
  await user.save();
  return NextResponse.json({ settings: next });
}
