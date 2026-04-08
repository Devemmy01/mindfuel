import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Save from "@/models/save";
import User from "@/models/user";

// PATCH /api/saves/[id]/note - Update or create note for a saved post
// [id] is the postId
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDB();
    const { id: postId } = await params;
    const { userId: firebaseId, note } = await req.json();

    if (!firebaseId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const user = await User.findOne({ firebaseId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find if save exists
    let save = await Save.findOne({ userId: user._id, postId });

    if (!save) {
      // If not saved, create a new save with the note
      save = await Save.create({
        userId: user._id,
        postId,
        note: note || "",
      });
      return NextResponse.json({ message: "Created save and note", save, saved: true }, { status: 201 });
    } else {
      // Update existing save note
      save.note = note || "";
      await save.save();
      return NextResponse.json({ message: "Updated note", save, saved: true }, { status: 200 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update note", message: errorMessage },
      { status: 500 }
    );
  }
}
