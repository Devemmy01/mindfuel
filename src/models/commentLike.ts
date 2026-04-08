import { Schema, model, models, Document, Types } from "mongoose";

export interface ICommentLike extends Document {
  userId: Types.ObjectId;
  commentId: Types.ObjectId;
  createdAt: Date;
}

const CommentLikeSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    commentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      required: true,
    },
  },
  { timestamps: true }
);

// Ensure a user can only like a comment once
CommentLikeSchema.index({ userId: 1, commentId: 1 }, { unique: true });

const CommentLike = models.CommentLike || model<ICommentLike>("CommentLike", CommentLikeSchema);

export default CommentLike;
