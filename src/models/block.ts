import { Schema, model, models, Document, Types } from "mongoose";

/** `blocker` doesn't want contact with `blocked`. Enforced in both directions. */
export interface IBlock extends Document {
  blocker: Types.ObjectId;
  blocked: Types.ObjectId;
  createdAt: Date;
}

const BlockSchema = new Schema(
  {
    blocker: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    blocked: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

BlockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

export default models.Block || model<IBlock>("Block", BlockSchema);
