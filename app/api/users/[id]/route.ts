import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";
import { decayStreak } from "@/lib/streakUtils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDB();
    const { id: firebaseId } = await params;

    if (!firebaseId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const userDoc = await User.findOne({ firebaseId });
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check for streak decay
    const currentStreak = userDoc.streakDays || 0;
    const correctedStreak = decayStreak(userDoc.lastReflectionDate, currentStreak);

    if (correctedStreak !== currentStreak) {
      userDoc.streakDays = correctedStreak;
      await userDoc.save();
    }

    return NextResponse.json({ user: userDoc.toObject() }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch user", message: errorMessage },
      { status: 500 }
    );
  }
}
