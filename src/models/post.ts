import { Schema, model, models } from "mongoose";

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
    backgroundStyle: {
      type: {
        type: String,
        enum: ["color", "gradient"],
        default: "color",
      },
      value: {
        type: String,
        default: "#ffffff",
      },
    },
    fontFamily: {
      type: String,
      default: "inter",
    },
  },
  { timestamps: true }
);

const Post = models.Post || model("Post", PostSchema);

export default Post;
