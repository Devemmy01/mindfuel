import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User, { IUser } from "@/models/user";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const { firebaseId, name, username, bio, uploadedImage } = await req.json();

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
    if (username !== undefined && username !== null) {
      // Clean username: remove spaces, lowercase, max 20 chars
      const cleanUsername = username.replace(/\s+/g, "").toLowerCase().slice(0, 20);
      
      // Basic validation
      if (cleanUsername.length < 3) {
        return NextResponse.json(
          { error: "Username must be at least 3 characters" },
          { status: 400 }
        );
      }
      if (!/^[a-z0-9_.]+$/.test(cleanUsername)) {
         return NextResponse.json(
          { error: "Username can only contain letters, numbers, underscores, and dots" },
          { status: 400 }
        );
      }
      
      // 1. Fetch current user to see if we're actually changing the username
      const currentUserRecord = await User.findOne({ firebaseId }).lean() as IUser | null;
      
      // 2. Only check for duplicates if the username is different from current
      if (currentUserRecord?.username !== cleanUsername) {
        const existingUser = await User.findOne({ 
          username: cleanUsername, 
          firebaseId: { $ne: firebaseId } 
        }).lean() as IUser | null;

        if (existingUser) {
          console.log(`[Username Collision] User ${firebaseId} tried to claim "${cleanUsername}" which is already held by ${existingUser.firebaseId} (${existingUser.name})`);
          return NextResponse.json(
            { error: "This username is already taken" },
            { status: 400 }
          );
        }
      }
      
      updateData.username = cleanUsername;
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
    ).lean() as IUser | null;

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
