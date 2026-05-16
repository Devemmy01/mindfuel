import { Schema, model, models, Document } from "mongoose";

export interface IHashtag extends Document {
  tag: string;
  displayTag: string;
  postCount: number;
  usageCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const HashtagSchema = new Schema(
  {
    tag: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    displayTag: {
      type: String,
      required: true,
      trim: true,
    },
    postCount: {
      type: Number,
      default: 0,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

HashtagSchema.index({ postCount: -1, lastUsedAt: -1 });

const Hashtag = models.Hashtag || model<IHashtag>("Hashtag", HashtagSchema);

export default Hashtag;