import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import { requireFirebaseUser } from "@/lib/firebase-admin";
import ChatLinkSession from "@/models/chat-link-session";

const SESSION_LIFETIME_MS = 10 * 60 * 1000;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function hashCode(code: string) {
  return createHash("sha256").update(code.replace(/[^A-Z0-9]/gi, "").toUpperCase()).digest("hex");
}

function createCode() {
  const bytes = randomBytes(8);
  let value = "";
  for (let index = 0; index < 8; index += 1) {
    value += CODE_ALPHABET[bytes[index] % CODE_ALPHABET.length];
  }
  return `${value.slice(0, 4)}-${value.slice(4)}`;
}

function verificationFor(publicKey: string) {
  const digest = createHash("sha256").update(publicKey).digest();
  return String(digest.readUInt32BE(0) % 1_000_000).padStart(6, "0");
}

function validPublicKey(value: unknown): value is string {
  return typeof value === "string" && value.length >= 300 && value.length <= 1000;
}

export async function GET(req: NextRequest) {
  const auth = await requireFirebaseUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectToDB();
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const session = sessionId
    ? await ChatLinkSession.findOne({ _id: sessionId, ownerId: auth.uid, expiresAt: { $gt: new Date() } }).lean()
    : null;
  if (!session) return NextResponse.json({ error: "Link session expired" }, { status: 404 });
  return NextResponse.json({
    session: {
      id: String(session._id),
      status: session.status,
      targetPublicKey: session.targetPublicKey || undefined,
      targetDeviceName: session.targetDeviceName || undefined,
      verification: session.verification || undefined,
      encryptedIdentity: session.status === "ready" ? session.encryptedIdentity : undefined,
      expiresAt: session.expiresAt,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireFirebaseUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectToDB();
  const body = await req.json();
  const action = String(body.action || "");

  if (action === "create") {
    await ChatLinkSession.deleteMany({ ownerId: auth.uid, status: { $ne: "consumed" } });
    let code = createCode();
    while (await ChatLinkSession.exists({ codeHash: hashCode(code) })) code = createCode();
    const session = await ChatLinkSession.create({
      ownerId: auth.uid,
      codeHash: hashCode(code),
      status: "pending",
      expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
    });
    return NextResponse.json({ sessionId: String(session._id), code, expiresAt: session.expiresAt });
  }

  if (action === "request") {
    const codeHash = hashCode(String(body.code || ""));
    if (!validPublicKey(body.publicKey)) {
      return NextResponse.json({ error: "Invalid device key" }, { status: 400 });
    }
    const session = await ChatLinkSession.findOne({
      ownerId: auth.uid,
      codeHash,
      status: "pending",
      expiresAt: { $gt: new Date() },
    });
    if (!session) return NextResponse.json({ error: "Invalid or expired link code" }, { status: 404 });
    session.targetPublicKey = body.publicKey;
    session.targetDeviceName = String(body.deviceName || "New device").slice(0, 120);
    session.verification = verificationFor(body.publicKey);
    session.status = "requested";
    await session.save();
    return NextResponse.json({ sessionId: String(session._id), verification: session.verification });
  }

  if (action === "approve") {
    const { sessionId, encryptedIdentity } = body;
    const session = await ChatLinkSession.findOne({
      _id: sessionId,
      ownerId: auth.uid,
      status: "requested",
      expiresAt: { $gt: new Date() },
    });
    if (!session) return NextResponse.json({ error: "Link request expired" }, { status: 404 });
    const validBundle = encryptedIdentity &&
      typeof encryptedIdentity.ciphertext === "string" && encryptedIdentity.ciphertext.length <= 10_000 &&
      typeof encryptedIdentity.iv === "string" && encryptedIdentity.iv.length <= 100 &&
      typeof encryptedIdentity.wrappedKey === "string" && encryptedIdentity.wrappedKey.length <= 1000;
    if (!validBundle) return NextResponse.json({ error: "Invalid encrypted identity" }, { status: 400 });
    session.encryptedIdentity = encryptedIdentity;
    session.status = "ready";
    await session.save();
    return NextResponse.json({ success: true });
  }

  if (action === "confirm") {
    const session = await ChatLinkSession.findOne({
      _id: body.sessionId,
      ownerId: auth.uid,
      status: "ready",
      expiresAt: { $gt: new Date() },
    });
    if (!session) return NextResponse.json({ error: "Link session expired" }, { status: 404 });
    session.status = "consumed";
    session.encryptedIdentity = undefined;
    session.expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    await session.save();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
