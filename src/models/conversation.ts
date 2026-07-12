import { Schema, model, models, Document, Types } from "mongoose";

export interface IConversation extends Document {
  participants: Types.ObjectId[];
  participantKey: string;
  lastMessage?: Types.ObjectId;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    participantKey: { type: String, required: true, unique: true, index: true },
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message" },
    lastMessageAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

ConversationSchema.index({ participants: 1, lastMessageAt: -1 });

export default models.Conversation || model<IConversation>("Conversation", ConversationSchema);
