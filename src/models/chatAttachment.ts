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
  /** Set when the photo is sent; unsent uploads are swept after a day. */
  message?: Types.ObjectId | null;
  createdAt: Date;
}

const ChatAttachmentSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    uploader: { type: Schema.Types.ObjectId, ref: "User", required: true },
    publicId: { type: String, required: true },
    size: { type: Number, required: true },
    message: { type: Schema.Types.ObjectId, ref: "Message", default: null, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ChatAttachmentSchema.index({ uploader: 1, createdAt: -1 });
ChatAttachmentSchema.index({ message: 1, createdAt: 1 });

export default models.ChatAttachment || model<IChatAttachment>("ChatAttachment", ChatAttachmentSchema);
