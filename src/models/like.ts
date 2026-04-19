import { Schema, model, models, Document } from "mongoose";

export interface ILike extends Document {
  userId: Schema.Types.ObjectId;
  postId: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}


const LikeSchema = new Schema(
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

LikeSchema.index({ userId: 1, postId: 1 }, { unique: true });

const Like = models.Like || model<ILike>("Like", LikeSchema);

export default Like;
