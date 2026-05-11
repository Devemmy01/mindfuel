import { Schema, model, models, Document } from "mongoose";

export interface IPollVote extends Document {
  userId: Schema.Types.ObjectId;
  postId: Schema.Types.ObjectId;
  optionId: string;
  createdAt: Date;
}

const PollVoteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    optionId: { type: String, required: true },
  },
  { timestamps: true }
);

PollVoteSchema.index({ userId: 1, postId: 1 }, { unique: true });

const PollVote = models.PollVote || model<IPollVote>("PollVote", PollVoteSchema);

export default PollVote;
