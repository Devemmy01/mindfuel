import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";
import { requireFirebaseUser } from "@/lib/firebase-admin";
import { decryptRecoveryBackup } from "@/lib/chat-recovery-server";
import { isValidRecoveryPin, MAX_RECOVERY_ATTEMPTS } from "@/lib/chat-recovery-shared";

// Decrypts the recovery backup server-side (rather than handing the
// ciphertext to the client) so the failed-attempt lockout below is actually
// enforceable — see chat-recovery-server.ts for why a client-side decrypt
// can't be rate-limited once the blob has left the server.
export async function POST(req: NextRequest) {
  const auth = await requireFirebaseUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let pin: unknown;
  try {
    ({ pin } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (typeof pin !== "string" || !isValidRecoveryPin(pin)) {
    return NextResponse.json({ error: "Enter the PIN you set when recovery was turned on." }, { status: 400 });
  }

  await connectToDB();

  // Reserve an attempt atomically (before decrypting) so two concurrent
  // requests can't both slip in under the lockout threshold.
  const reserved = await User.findOneAndUpdate(
    {
      firebaseId: auth.uid,
      "chatKeyRecovery.ciphertext": { $exists: true },
      "chatKeyRecovery.lockedAt": { $exists: false },
      $or: [
        { "chatKeyRecovery.failedAttempts": { $exists: false } },
        { "chatKeyRecovery.failedAttempts": { $lt: MAX_RECOVERY_ATTEMPTS } },
      ],
    },
    { $inc: { "chatKeyRecovery.failedAttempts": 1 } },
    { new: false },
  ).select("+chatKeyRecovery");

  const backup = reserved?.chatKeyRecovery;
  if (!backup?.ciphertext) {
    const existing = await User.findOne({ firebaseId: auth.uid }).select("+chatKeyRecovery");
    if (!existing?.chatKeyRecovery?.ciphertext) {
      return NextResponse.json({ error: "No recovery PIN has been set up for this account." }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Too many incorrect attempts. This backup is locked — link a trusted device instead, or set up a new PIN from one." },
      { status: 423 },
    );
  }

  const identity = decryptRecoveryBackup(pin, backup);

  if (!identity) {
    const attemptsUsed = (backup.failedAttempts || 0) + 1; // the increment reserved above
    const lockedOut = attemptsUsed >= MAX_RECOVERY_ATTEMPTS;
    if (lockedOut) {
      await User.updateOne({ firebaseId: auth.uid }, { $set: { "chatKeyRecovery.lockedAt": new Date() } });
    }
    const remaining = MAX_RECOVERY_ATTEMPTS - attemptsUsed;
    return NextResponse.json(
      {
        error: lockedOut
          ? "Incorrect PIN. This backup is now locked — link a trusted device instead, or set up a new PIN from one."
          : `Incorrect PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      },
      { status: lockedOut ? 423 : 401 },
    );
  }

  await User.updateOne(
    { firebaseId: auth.uid },
    { $set: { "chatKeyRecovery.failedAttempts": 0 }, $unset: { "chatKeyRecovery.lockedAt": "" } },
  );

  return NextResponse.json({ identity });
}
