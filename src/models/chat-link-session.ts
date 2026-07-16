import { Schema, model, models, Document, type Model } from "mongoose";

export interface IChatLinkSession extends Document {
  ownerId: string;
  codeHash: string;
  status: "pending" | "requested" | "ready" | "consumed";
  targetPublicKey?: string;
  targetDeviceName?: string;
  verification?: string;
  encryptedIdentity?: {
    ciphertext: string;
    iv: string;
    wrappedKey: string;
  };
  expiresAt: Date;
}

const ChatLinkSessionSchema = new Schema<IChatLinkSession>(
  {
    ownerId: { type: String, required: true, index: true },
    codeHash: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["pending", "requested", "ready", "consumed"],
      default: "pending",
      required: true,
    },
    targetPublicKey: { type: String, default: "" },
    targetDeviceName: { type: String, default: "" },
    verification: { type: String, default: "" },
    encryptedIdentity: {
      ciphertext: { type: String, default: "" },
      iv: { type: String, default: "" },
      wrappedKey: { type: String, default: "" },
      _id: false,
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

ChatLinkSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ChatLinkSession = (models.ChatLinkSession as Model<IChatLinkSession> | undefined) ||
  model<IChatLinkSession>("ChatLinkSession", ChatLinkSessionSchema);

export default ChatLinkSession;
