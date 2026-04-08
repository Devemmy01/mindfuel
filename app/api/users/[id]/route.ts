import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDB();
    const { id: firebaseId } = await params;

    if (!firebaseId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const user = await User.findOne({ firebaseId }).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch user", message: errorMessage },
      { status: 500 }
    );
  }
}
