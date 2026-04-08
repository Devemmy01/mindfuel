import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const { firebaseId, name, bio, uploadedImage } = await req.json();

    if (!firebaseId) {
      return NextResponse.json(
        { error: "firebaseId is required" },
        { status: 400 }
      );
    }

    // Validate image size if provided
    if (uploadedImage && uploadedImage.length > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "Image size exceeds 5MB limit" },
        { status: 400 }
      );
    }

    // Prepare update object - always include all fields
    const updateData: Record<string, unknown> = {};
    
    if (name !== undefined && name !== null) {
      updateData.name = name;
    }
    if (bio !== undefined && bio !== null) {
      updateData.bio = bio;
    }
    
    // Handle image - if uploadedImage is provided (including empty string or path), update it
    if (uploadedImage !== undefined && uploadedImage !== null) {
      updateData.image = uploadedImage;
      updateData.uploadedImage = uploadedImage;
    }

    // If no updates provided, return error
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const updatedUser = await User.findOneAndUpdate(
      { firebaseId },
      { $set: updateData },
      { new: true }
    ).lean();

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: updatedUser }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Profile update error:", errorMessage);
    return NextResponse.json(
      { error: "Failed to update profile", message: errorMessage },
      { status: 500 }
    );
  }
}
