import { Schema, model, models, Document, Types } from "mongoose";

export interface IChatTypingState extends Document {
  conversation: Types.ObjectId;
  user: Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChatTypingStateSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

ChatTypingStateSchema.index({ conversation: 1, user: 1 }, { unique: true });
ChatTypingStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default models.ChatTypingState ||
  model<IChatTypingState>("ChatTypingState", ChatTypingStateSchema);
