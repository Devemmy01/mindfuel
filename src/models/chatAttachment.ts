import { Schema, model, models, Document, Types } from "mongoose";

/**
 * An encrypted chat photo. The stored object is ciphertext only; the key is
 * the conversation key, which the server never has.
 */
export interface IChatAttachment extends Document {
  conversation: Types.ObjectId;
  uploader: Types.ObjectId;
  publicId: string;
  size: number;
  createdAt: Date;
}

const ChatAttachmentSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    uploader: { type: Schema.Types.ObjectId, ref: "User", required: true },
    publicId: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ChatAttachmentSchema.index({ uploader: 1, createdAt: -1 });

export default models.ChatAttachment || model<IChatAttachment>("ChatAttachment", ChatAttachmentSchema);
