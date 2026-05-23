import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";
import Post from "@/models/post";
import { decayStreak, recalculateStreakFromPosts } from "@/lib/streakUtils";
import { getHistoricalMilestoneUnlocks, getMilestoneById } from "@/lib/milestones";

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

    // Recalculate streak based on actual posts to ensure accuracy
    const userPosts = await Post.find({ userId: userDoc._id })
      .select("createdAt")
      .sort({ createdAt: -1 })
      .lean() as unknown as Array<{ createdAt: Date }>;

    const postDates = userPosts.map((p) => p.createdAt);
    const streakUpdate = recalculateStreakFromPosts(postDates, userDoc.longestStreak || 0);

    // Check for streak decay and update if needed
    const currentStreak = streakUpdate.streakDays;
    const correctedStreak = decayStreak(streakUpdate.lastReflectionDate, currentStreak);
    const existingMilestoneIds = ((userDoc.earnedMilestones || []) as Array<{ id?: string }>)
      .map((m) => m.id)
      .filter((id): id is string => Boolean(id));
    const backfilledMilestoneIds = getHistoricalMilestoneUnlocks(userPosts, existingMilestoneIds);

    let shouldSave = false;

    // Update if streak changed due to decay or recalculation
    if (correctedStreak !== userDoc.streakDays || streakUpdate.lastReflectionDate?.getTime() !== new Date(userDoc.lastReflectionDate || 0).setHours(0, 0, 0, 0)) {
      userDoc.streakDays = correctedStreak;
      userDoc.lastReflectionDate = streakUpdate.lastReflectionDate;
      userDoc.longestStreak = streakUpdate.longestStreak;
      shouldSave = true;
    }

    if (backfilledMilestoneIds.length > 0) {
      userDoc.earnedMilestones.push(
        ...backfilledMilestoneIds.map((id) => {
          const milestone = getMilestoneById(id);
          return {
            id: milestone?.id || id,
            earnedAt: new Date(),
          };
        })
      );
      shouldSave = true;
    }

    if (shouldSave) {
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
