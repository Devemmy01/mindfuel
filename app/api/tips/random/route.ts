import { NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Tip from "@/models/tip";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDB();

    // Use $sample to get one random document from the collection
    const randomTips = await Tip.aggregate([{ $sample: { size: 1 } }]);

    if (!randomTips || randomTips.length === 0) {
      // Fallback if DB is somehow empty
      return NextResponse.json({
        text: "Breathe deeply. You are exactly where you need to be.",
        author: "MindFuel",
        source: "Fallback",
        category: "mindfulness"
      });
    }

    return NextResponse.json(randomTips[0]);
  } catch (error) {
    console.error("Random tip API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch random tip" },
      { status: 500 }
    );
  }
}
