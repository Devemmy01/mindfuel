import { Schema, model, models, Document } from "mongoose";

export interface IPostHashtag extends Document {
  postId: Schema.Types.ObjectId;
  hashtagId: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PostHashtagSchema = new Schema(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    hashtagId: {
      type: Schema.Types.ObjectId,
      ref: "Hashtag",
      required: true,
    },
  },
  { timestamps: true }
);

PostHashtagSchema.index({ postId: 1, hashtagId: 1 }, { unique: true });
PostHashtagSchema.index({ hashtagId: 1, createdAt: -1 });
PostHashtagSchema.index({ postId: 1 });

const PostHashtag = models.PostHashtag || model<IPostHashtag>("PostHashtag", PostHashtagSchema);

export default PostHashtag;