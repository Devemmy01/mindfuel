import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";
export const maxDuration = 60; // Increase timeout to 60 seconds

// POST /api/upload — Upload an image to Cloudinary, return the URL
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert File to base64 data URI
    // Fall back to image/jpeg when file.type is empty (e.g. HEIC on some browsers)
    const mimeType = file.type || "image/jpeg";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const dataUri = `data:${mimeType};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "mindfuel/posts",
      // "auto" lets Cloudinary detect the resource type so videos/HEIC/etc. don't fail
      resource_type: "auto",
      transformation: [
        { width: 1200, crop: "limit" },
        { quality: "auto:good" },
        // Note: fetch_format is a delivery parameter, not a valid upload transformation
      ],
    });

    return NextResponse.json({ url: result.secure_url }, { status: 200 });
  } catch (error: unknown) {
    // Log the full Cloudinary error (visible in server logs / Vercel logs)
    console.error("Upload error:", error);
    const msg =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
