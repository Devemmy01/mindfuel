import { Schema, model, models, Document } from "mongoose";

export interface IPost extends Document {
  text: string;
  hashtags: string[];
  userId: Schema.Types.ObjectId;
  isSponsored?: boolean;
  views?: number;
  likesCount?: number;
  commentsCount?: number;
  repostCount?: number;
  imageUrl?: string;
  backgroundStyle: {
    id?: string;
    type: "color" | "gradient";
    value: string;
    text?: string;
  };
  fontFamily: string;
  promptId?: string;
  viewedBy?: string[];
  poll?: {
    options: { id: string; text: string; votes: number }[];
    endsAt: Date;
    totalVotes: number;
  };
  quotedPostId?: Schema.Types.ObjectId;
  isRepost?: boolean;
  repostedBy?: Schema.Types.ObjectId;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema(
  {
    text: {
      type: String,
      required: [true, "Text is required"],
      maxlength: [500, "Post text cannot exceed 500 characters"],
    },
    hashtags: {
      type: [String],
      default: [],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isSponsored: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    repostCount: {
      type: Number,
      default: 0,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    backgroundStyle: {
      id: { type: String },
      type: {
        type: String,
        enum: ["color", "gradient"],
        default: "color",
      },
      value: { type: String, default: "#0a0a0a" },
      text: { type: String, default: "#ffffff" },
    },
    fontFamily: {
      type: String,
      default: "inter",
    },
    promptId: {
      type: String,
      default: null,
    },
    viewedBy: {
      type: [String],
      default: [],
      select: false,
    },
    poll: {
      options: [
        {
          id: { type: String },
          text: { type: String },
          votes: { type: Number, default: 0 },
        },
      ],
      endsAt: { type: Date },
      totalVotes: { type: Number, default: 0 },
    },
    quotedPostId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },
    isRepost: {
      type: Boolean,
      default: false,
    },
    repostedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Performance indexes
PostSchema.index({ createdAt: -1 });
PostSchema.index({ userId: 1, createdAt: -1 });
PostSchema.index({ likesCount: -1, views: -1, createdAt: -1 });
PostSchema.index({ hashtags: 1, createdAt: -1 });

const Post = models.Post || model<IPost>("Post", PostSchema);

export default Post;
