import type { Types } from "mongoose";
import ChatAttachment from "@/models/chatAttachment";
import cloudinary from "@/lib/cloudinary";

/** Delete stored ciphertext and its records. Failures are logged and left for the next sweep. */
export async function destroyAttachments(filter: Record<string, unknown>) {
  const rows = (await ChatAttachment.find(filter).limit(200).select("publicId").lean()) as unknown as Array<{ _id: Types.ObjectId; publicId: string }>;
  let removed = 0;
  for (const row of rows) {
    try {
      await cloudinary.uploader.destroy(row.publicId, { resource_type: "raw", type: "authenticated", invalidate: true });
      await ChatAttachment.deleteOne({ _id: row._id });
      removed += 1;
    } catch (error) {
      console.error("Attachment delete failed", row.publicId, error);
    }
  }
  return { found: rows.length, removed };
}
