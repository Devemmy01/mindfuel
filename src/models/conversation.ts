import { Schema, model, models, Document, Types } from "mongoose";

export interface IConversation extends Document {
  participants: Types.ObjectId[];
  visibleTo: Types.ObjectId[];
  participantKey: string;
  lastMessage?: Types.ObjectId;
  lastMessageAt: Date;
  encryptionVersion: number;
  encryptedKeys: Array<{ user: Types.ObjectId; wrappedKey: string }>;
  /**
   * Key sets this conversation used before its current one, newest first.
   * Messages are never re-encrypted, so a message sent under an older key
   * can only be read while that key is kept here.
   */
  previousKeys: Array<{ encryptedKeys: Array<{ user: Types.ObjectId; wrappedKey: string }>; retiredAt: Date }>;
  /** Recipients who haven't accepted this conversation yet (message requests). */
  requestFor: Types.ObjectId[];
  /** Recipients who deleted the request; the sender isn't told. */
  declinedBy: Types.ObjectId[];
  /** Participants who muted message notifications for this conversation. */
  mutedBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    // Empty conversations are visible only to users who explicitly opened
    // them. Once a message exists, both participants see the conversation.
    visibleTo: [{ type: Schema.Types.ObjectId, ref: "User" }],
    participantKey: { type: String, required: true, unique: true, index: true },
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message" },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    encryptionVersion: { type: Number, default: 0 },
    mutedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    requestFor: [{ type: Schema.Types.ObjectId, ref: "User" }],
    declinedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    encryptedKeys: [{
      user: { type: Schema.Types.ObjectId, ref: "User", required: true },
      wrappedKey: { type: String, required: true },
      _id: false,
    }],
    previousKeys: [{
      encryptedKeys: [{
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        wrappedKey: { type: String, required: true },
        _id: false,
      }],
      retiredAt: { type: Date, default: Date.now },
      _id: false,
    }],
  },
  { timestamps: true }
);

ConversationSchema.index({ participants: 1, lastMessageAt: -1 });

export default models.Conversation || model<IConversation>("Conversation", ConversationSchema);
