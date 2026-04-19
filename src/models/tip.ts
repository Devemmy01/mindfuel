import { Schema, model, models, Document } from "mongoose";

export interface ITip extends Document {
  text: string;
  author?: string;
  source: string;
  category: "mindfulness" | "wisdom" | "advice" | "affirmation";
  createdAt: Date;
  updatedAt: Date;
}

const TipSchema = new Schema(
  {
    text: {
      type: String,
      required: [true, "Tip text is required"],
      unique: true, // Prevent duplicates
      trim: true,
    },
    author: {
      type: String,
      default: "Unknown",
    },
    source: {
      type: String,
      required: true,
      enum: ["ZenQuotes", "Quotable", "AdviceSlip", "Affirmations", "Manual"],
    },
    category: {
      type: String,
      required: true,
      enum: ["mindfulness", "wisdom", "advice", "affirmation"],
    },
  },
  { timestamps: true }
);

// Index for random sampling
TipSchema.index({ category: 1 });

const Tip = models.Tip || model<ITip>("Tip", TipSchema);

export default Tip;
