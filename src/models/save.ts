import { Schema, model, models } from "mongoose";

const SaveSchema = new Schema(
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
    collectionId: {
      type: Schema.Types.ObjectId,
      ref: "Collection",
      default: null,
    },
    note: {
      type: String,
      maxlength: 300,
      default: "",
    },
  },
  { timestamps: true }
);

SaveSchema.index({ userId: 1, postId: 1 }, { unique: true });

const Save = models.Save || model("Save", SaveSchema);

export default Save;
