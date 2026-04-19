import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User, { IUser } from "@/models/user";
import cloudinary from "@/lib/cloudinary";

const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB base64 overhead

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
        { error: "Image size exceeds 15MB limit" },
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

    // Handle image - use Cloudinary for base64 uploads
    if (uploadedImage !== undefined && uploadedImage !== null) {
      if (uploadedImage === "") {
        updateData.image = "";
        updateData.uploadedImage = "";
      } else if (uploadedImage.startsWith("data:image")) {
        // This is a new base64 upload, send to Cloudinary
        try {
          const uploadResponse = await cloudinary.uploader.upload(uploadedImage, {
            folder: "mindfuel_profiles",
            resource_type: "image",
            // Transformation: Square crop, auto format, auto quality
            transformation: [
              { width: 400, height: 400, crop: "fill", gravity: "face" },
              { fetch_format: "auto", quality: "auto" }
            ]
          });

          updateData.image = uploadResponse.secure_url;
          updateData.uploadedImage = uploadResponse.secure_url;
        } catch (uploadError) {
          console.error("Cloudinary upload error:", uploadError);
          return NextResponse.json(
            { error: "Failed to upload image to Cloudinary" },
            { status: 500 }
          );
        }
      } else {
        // It's already a URL or a local path (like /pp1.png)
        updateData.image = uploadedImage;
        updateData.uploadedImage = uploadedImage;
      }
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
