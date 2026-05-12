import { Schema, model, models, Document, Types } from "mongoose";

export interface IComment extends Document {
  userId: Types.ObjectId;
  postId: Types.ObjectId;
  parentId?: Types.ObjectId;
  content: string;
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema(
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
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    content: {
      type: String,
      required: [true, "Comment content is required"],
      maxlength: [500, "Comments cannot exceed 500 characters"],
    },
    likesCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Comment = models.Comment || model<IComment>("Comment", CommentSchema);

export default Comment;
