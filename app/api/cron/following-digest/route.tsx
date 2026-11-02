import { createHash } from "node:crypto";
import * as React from "react";
import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/api-auth";
import { absoluteUrl } from "@/lib/links";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";
import Follow from "@/models/follow";
import { digestDue, localParts, resolveSettings } from "@/lib/notification-policy";
import { buildFollowingDigest, digestHeadline, digestWindowStart, type Digest } from "@/lib/following-digest";
import { recordStat } from "@/lib/notify";
import { unsubscribeFor } from "@/lib/unsubscribe";
import { resend } from "@/lib/resend";
import FollowingDigestEmail from "@/emails/FollowingDigestEmail";

export const maxDuration = 60;

const BATCH_SIZE = 100;
/** Bounds one run inside maxDuration. */
const MAX_PER_RUN = 1_000;

type Candidate = {
  _id: unknown;
  email?: string;
  name?: string;
  preferences?: { notifications?: boolean; dailyEmail?: boolean } | null;
  notificationSettings?: Record<string, unknown> | null;
  lastDigestSentOn?: string | null;
  lastDigestAt?: Date | null;
};

function shortAge(iso: string, now: Date) {
  const minutes = Math.max(1, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/**
 * Hourly: at 8am local time, email each member the public reflections people
 * they follow shared since their last digest. Nothing new means no email.
 * Triggered by .github/workflows/hourly-reminders.yml.
 */
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDB();
    const now = new Date();
    const followers = await Follow.distinct("follower");
    const users = (await User.find({ _id: { $in: followers }, email: { $exists: true, $ne: "" } })
      .select("email name preferences notificationSettings lastDigestSentOn lastDigestAt")
      .lean()) as unknown as Candidate[];

    const results = { checked: users.length, due: 0, empty: 0, sent: 0, failed: 0 };
    const outgoing: Array<{ user: Candidate; date: string; previous: string | null; digest: Digest }> = [];

    for (const user of users) {
      if (outgoing.length >= MAX_PER_RUN) break;
      if (!user.email || !digestDue(user, now)) continue;
      results.due += 1;
      const date = localParts(now, resolveSettings(user).timezone).date;
      const digest = await buildFollowingDigest(String(user._id), digestWindowStart(user.lastDigestAt, now), now);
      if (!digest) {
        results.empty += 1;
        continue;
      }
      // Claim today's digest first so an overlapping run can't send it twice.
      const claim = await User.updateOne(
        { _id: user._id, lastDigestSentOn: { $ne: date } },
        { $set: { lastDigestSentOn: date } },
      );
      if (claim.modifiedCount === 1) outgoing.push({ user, date, previous: user.lastDigestSentOn ?? null, digest });
    }

    for (let index = 0; index < outgoing.length; index += BATCH_SIZE) {
      const chunk = outgoing.slice(index, index + BATCH_SIZE);
      const emails = chunk.map(({ user, digest }) => {
        const userId = String(user._id);
        const unsubscribe = unsubscribeFor(userId, "following");
        const headline = digestHeadline(digest);
        return {
          from: "MindFuel <hello@mind-fuel.app>",
          to: user.email as string,
          subject: headline,
          headers: unsubscribe.headers,
          react: (
            <FollowingDigestEmail
              headline={headline}
              posts={digest.posts.map((post) => ({
                ...post,
                url: absoluteUrl(`/post/${post.id}?source=email-following`),
                age: shortAge(post.createdAt, now),
              }))}
              morePosts={Math.max(0, digest.totalPosts - digest.posts.length)}
              feedUrl={absoluteUrl("/feed?source=email-following")}
              settingsUrl={absoluteUrl("/settings/notifications")}
              unsubscribeUrl={unsubscribe.url}
            />
          ) as React.ReactElement,
        };
      });
      const idempotencyKey = `following-digest/${createHash("sha256")
        .update(chunk.map(({ user, date }) => `${String(user._id)}:${date}`).join(","))
        .digest("hex")
        .slice(0, 32)}`;

      const response = await resend.batch.send(emails, { idempotencyKey }).catch((error: unknown) => ({ error }));
      if (response && "error" in response && response.error) {
        console.error("Following digest batch failed", response.error);
        results.failed += chunk.length;
        await recordStat("following", "email", "failed", chunk.length);
        // Release the claim. lastDigestAt didn't move, so these posts roll into the next digest.
        await Promise.all(chunk.map(({ user, date, previous }) =>
          User.updateOne({ _id: user._id, lastDigestSentOn: date }, { $set: { lastDigestSentOn: previous } }),
        ));
        continue;
      }
      results.sent += chunk.length;
      await recordStat("following", "email", "sent", chunk.length);
      await User.bulkWrite(chunk.map(({ user }) => ({
        updateOne: { filter: { _id: user._id }, update: { $set: { lastDigestAt: now } } },
      })));
    }

    return NextResponse.json({ success: true, ...results });
  } catch (error: unknown) {
    console.error("Following digest error:", error);
    return NextResponse.json({ success: false, error: "Failed to send digests" }, { status: 500 });
  }
}
