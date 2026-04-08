import { Schema, model, models } from "mongoose";

const CollectionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Collection name is required"],
      trim: true,
    },
  },
  { timestamps: true }
);

const Collection = models.Collection || model("Collection", CollectionSchema);

export default Collection;
