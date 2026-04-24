import { Schema, model, models, Document } from "mongoose";

export interface IPost extends Document {
  text: string;
  userId: Schema.Types.ObjectId;
  isSponsored?: boolean;
  views?: number;
  likesCount?: number;
  commentsCount?: number;
  backgroundStyle: {
    id?: string;
    type: "color" | "gradient";
    value: string;
    text?: string;
  };
  fontFamily: string;
  promptId?: string;
  viewedBy?: string[];
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
    backgroundStyle: {
      id: {
        type: String,
      },
      type: {
        type: String,
        enum: ["color", "gradient"],
        default: "color",
      },
      value: {
        type: String,
        default: "#ffffff",
      },
      text: {
        type: String,
        default: "#ffffff",
      },
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
  },
  { timestamps: true }
);

// Performance indexes for feed queries
PostSchema.index({ createdAt: -1 });
PostSchema.index({ userId: 1, createdAt: -1 });
PostSchema.index({ likesCount: -1, views: -1, createdAt: -1 });

const Post = models.Post || model<IPost>("Post", PostSchema);

export default Post;

