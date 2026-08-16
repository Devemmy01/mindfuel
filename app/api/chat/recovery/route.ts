import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";
import { requireFirebaseUser } from "@/lib/firebase-admin";
import { MAX_RECOVERY_ATTEMPTS } from "@/lib/chat-recovery-shared";

function isBase64Field(value: unknown, maxLength: number) {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength && /^[A-Za-z0-9+/=]+$/.test(value);
}

// Reports only whether a backup exists (and whether it's currently locked
// out) — never the ciphertext itself. Decrypting happens server-side in
// POST /api/chat/recovery/restore, where a failed-PIN lockout can actually
// be enforced; handing the raw blob to the client here would let it be
// brute-forced offline with no further server involvement.
export async function GET(req: NextRequest) {
  const auth = await requireFirebaseUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectToDB();
  const user = await User.findOne({ firebaseId: auth.uid }).select("+chatKeyRecovery");
  const backup = user?.chatKeyRecovery;
  if (!backup?.ciphertext) return NextResponse.json({ available: false });
  return NextResponse.json({
    available: true,
    locked: Boolean(backup.lockedAt) || (backup.failedAttempts || 0) >= MAX_RECOVERY_ATTEMPTS,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireFirebaseUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { ciphertext, iv, salt, iterations } = await req.json();
    if (
      !isBase64Field(ciphertext, 4000) ||
      !isBase64Field(iv, 100) ||
      !isBase64Field(salt, 100) ||
      typeof iterations !== "number" ||
      !Number.isInteger(iterations) ||
      iterations < 100_000 ||
      iterations > 1_000_000
    ) {
      return NextResponse.json({ error: "Invalid recovery backup" }, { status: 400 });
    }
    await connectToDB();
    // A fresh backup means a fresh PIN, so any prior lockout no longer applies.
    await User.findOneAndUpdate(
      { firebaseId: auth.uid },
      { $set: { chatKeyRecovery: { ciphertext, iv, salt, iterations, updatedAt: new Date(), failedAttempts: 0 } } },
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unable to save recovery backup" }, { status: 500 });
  }
}
