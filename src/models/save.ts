import { Schema, model, models, Document } from "mongoose";

export interface ISave extends Document {
  userId: Schema.Types.ObjectId;
  postId: Schema.Types.ObjectId;
  collectionId?: Schema.Types.ObjectId;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}


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

const Save = models.Save || model<ISave>("Save", SaveSchema);

export default Save;
