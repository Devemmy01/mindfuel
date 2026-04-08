import { Schema, model, models, Document, Types } from "mongoose";

export interface IReport extends Document {
  postId: Types.ObjectId;
  reporterId: Types.ObjectId;
  reason?: string;
  status: "pending" | "reviewed" | "dismissed";
  createdAt: Date;
}

const ReportSchema = new Schema(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      default: "Inappropriate content",
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const Report = models.Report || model<IReport>("Report", ReportSchema);

export default Report;
