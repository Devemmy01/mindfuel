import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Report from "@/models/report";
import User from "@/models/user";

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const { postId, userId: firebaseId, reason } = await req.json();

    if (!postId || !firebaseId) {
      return NextResponse.json({ error: "Post ID and User ID are required" }, { status: 400 });
    }

    const reporter = await User.findOne({ firebaseId });
    if (!reporter) {
      return NextResponse.json({ error: "Reporter not found" }, { status: 404 });
    }

    // Check if user already reported this post
    const existingReport = await Report.findOne({ postId, reporterId: reporter._id });
    if (existingReport) {
      return NextResponse.json({ message: "Post already reported" }, { status: 200 });
    }

    const report = await Report.create({
      postId,
      reporterId: reporter._id,
      reason: reason || "Inappropriate content",
    });

    return NextResponse.json({ message: "Report received", report }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to submit report", message: errorMessage },
      { status: 500 }
    );
  }
}
