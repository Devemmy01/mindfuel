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

    const userDoc = await User.findOne({ firebaseId }).select(
      "name username image firebaseId bio streakDays lastReflectionDate longestStreak earnedMilestones createdAt updatedAt"
    );
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const forceRecalculate = req.nextUrl.searchParams.get("recalculate") === "true";
    let shouldSave = false;

    if (forceRecalculate) {
      // Full streak recalculation from posts — only run when explicitly requested
      // (e.g. after a post deletion). Not run on every profile visit.
      const userPosts = await Post.find({ userId: userDoc._id })
        .select("createdAt")
        .sort({ createdAt: -1 })
        .lean() as unknown as Array<{ createdAt: Date }>;

      const postDates = userPosts.map((p) => p.createdAt);
      const streakUpdate = recalculateStreakFromPosts(postDates, userDoc.longestStreak || 0);
      const correctedStreak = decayStreak(streakUpdate.lastReflectionDate, streakUpdate.streakDays);

      const existingMilestoneIds = ((userDoc.earnedMilestones || []) as Array<{ id?: string }>)
        .map((m) => m.id)
        .filter((id): id is string => Boolean(id));
      const backfilledMilestoneIds = getHistoricalMilestoneUnlocks(userPosts, existingMilestoneIds);

      if (
        correctedStreak !== userDoc.streakDays ||
        streakUpdate.lastReflectionDate?.getTime() !== new Date(userDoc.lastReflectionDate || 0).setHours(0, 0, 0, 0)
      ) {
        userDoc.streakDays = correctedStreak;
        userDoc.lastReflectionDate = streakUpdate.lastReflectionDate;
        userDoc.longestStreak = streakUpdate.longestStreak;
        shouldSave = true;
      }

      if (backfilledMilestoneIds.length > 0) {
        userDoc.earnedMilestones.push(
          ...backfilledMilestoneIds.map((id) => {
            const milestone = getMilestoneById(id);
            return { id: milestone?.id || id, earnedAt: new Date() };
          })
        );
        shouldSave = true;
      }
    } else {
      // Fast path: only check for streak decay using the already-stored lastReflectionDate.
      // This avoids a full Post.find() on every profile load.
      const correctedStreak = decayStreak(userDoc.lastReflectionDate, userDoc.streakDays || 0);
      if (correctedStreak !== userDoc.streakDays) {
        userDoc.streakDays = correctedStreak;
        shouldSave = true;
      }
    }

    if (shouldSave) {
      await userDoc.save();
    }

    return NextResponse.json(
      { user: userDoc.toObject() },
      { status: 200, headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch user", message: errorMessage },
      { status: 500 }
    );
  }
}
