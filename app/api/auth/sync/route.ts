import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const { firebaseId, email, name, image } = await req.json();

    if (!firebaseId || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Upsert user
    const user = await User.findOneAndUpdate(
      { firebaseId },
      { 
        $set: { 
          email, 
          name, 
          image: image || "" 
        } 
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ user }, { status: 200 });
  } catch (error: unknown) {
    console.error("Auth sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to sync auth", message: errorMessage },
      { status: 500 }
    );
  }
}
