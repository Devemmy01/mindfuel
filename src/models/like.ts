import { Schema, model, models } from "mongoose";

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

const Like = models.Like || model("Like", LikeSchema);

export default Like;
