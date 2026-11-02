import { Schema, model, models } from "mongoose";

/**
 * Privacy-light delivery counts: one document per UTC day, category and
 * channel. No user ids or content, only totals for delivery and open rates.
 */
const NotificationStatSchema = new Schema(
  {
    day: { type: String, required: true },
    category: { type: String, required: true },
    channel: { type: String, enum: ["push", "email"], required: true },
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
  },
  { timestamps: true },
);

NotificationStatSchema.index({ day: 1, category: 1, channel: 1 }, { unique: true });

const NotificationStat = models.NotificationStat || model("NotificationStat", NotificationStatSchema);
export default NotificationStat;
