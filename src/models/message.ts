import { Schema, model, models, Document, Types } from "mongoose";

export interface IMessage extends Document {
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  replyTo?: Types.ObjectId;
  text: string;
  ciphertext?: string;
  iv?: string;
  encryptionVersion?: number;
  reactions?: Array<{ emoji: string; users: Types.ObjectId[] }>;
  readBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    replyTo: { type: Schema.Types.ObjectId, ref: "Message", default: null },
    text: { type: String, trim: true, maxlength: 2000, default: "" },
    ciphertext: { type: String, default: "" },
    iv: { type: String, default: "" },
    encryptionVersion: { type: Number, default: 0 },
    reactions: [{
      emoji: { type: String, required: true, maxlength: 32 },
      users: [{ type: Schema.Types.ObjectId, ref: "User" }],
      _id: false,
    }],
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ conversation: 1, sender: 1, readBy: 1 });
MessageSchema.index({ replyTo: 1 });

export default models.Message || model<IMessage>("Message", MessageSchema);
