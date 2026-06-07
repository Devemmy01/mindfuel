import { Schema, model, models, Document } from "mongoose";

export interface IRepost extends Document {
  userId: Schema.Types.ObjectId;
  postId: Schema.Types.ObjectId;
  createdAt: Date;
}

const RepostSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    postId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
  },
  { timestamps: true }
);

RepostSchema.index({ userId: 1, postId: 1 }, { unique: true });
RepostSchema.index({ userId: 1, createdAt: -1 });
RepostSchema.index({ postId: 1 });

const Repost = models.Repost || model<IRepost>("Repost", RepostSchema);

export default Repost;
