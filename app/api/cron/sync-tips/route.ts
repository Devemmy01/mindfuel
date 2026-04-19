import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Tip from "@/models/tip";

async function fetchZenQuotes() {
  try {
    const res = await fetch("https://zenquotes.io/api/quotes", { cache: "no-store" });
    const data = await res.json();
    return data.map((q: { q: string; a: string }) => ({
      text: q.q,
      author: q.a,
      source: "ZenQuotes",
      category: "wisdom",
    }));
  } catch (err) {
    console.error("ZenQuotes fetch failed:", err);
    return [];
  }
}

async function fetchQuotable() {
  try {
    const res = await fetch("https://api.quotable.io/quotes/random?limit=25&tags=wisdom|mindfulness", { cache: "no-store" });
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((q: { content: string; author: string; tags: string[] }) => ({
      text: q.content,
      author: q.author,
      source: "Quotable",
      category: q.tags.includes("mindfulness") ? "mindfulness" : "wisdom",
    }));
  } catch (err) {
    console.error("Quotable fetch failed:", err);
    return [];
  }
}

async function fetchAdviceSlip() {
  try {
    const tips = [];
    for (let i = 0; i < 10; i++) {
      const res = await fetch("https://api.adviceslip.com/advice", { cache: "no-store" });
      const data = await res.json();
      if (data?.slip?.advice) {
        tips.push({
          text: data.slip.advice,
          author: "Advice Slip",
          source: "AdviceSlip",
          category: "advice",
        });
      }
    }
    return tips;
  } catch (err) {
    console.error("AdviceSlip fetch failed:", err);
    return [];
  }
}

async function fetchAffirmations() {
  try {
    const tips = [];
    for (let i = 0; i < 15; i++) {
      const res = await fetch("https://www.affirmations.dev/", { cache: "no-store" });
      const data = await res.json();
      if (data?.affirmation) {
        tips.push({
          text: data.affirmation,
          author: "Affirmations.dev",
          source: "Affirmations",
          category: "affirmation",
        });
      }
    }
    return tips;
  } catch (err) {
    console.error("Affirmations fetch failed:", err);
    return [];
  }
}

export async function GET(req: NextRequest) {
  // Simple auth check
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDB();
    
    
    const sources = [
      { name: "ZenQuotes", fetch: fetchZenQuotes },
      { name: "Quotable", fetch: fetchQuotable },
      { name: "AdviceSlip", fetch: fetchAdviceSlip },
      { name: "Affirmations", fetch: fetchAffirmations },
    ];

    let totalFlattened = 0;
    let newCount = 0;

    for (const source of sources) {
      try {
        const tips = await source.fetch();
        totalFlattened += tips.length;

        for (const tipData of tips) {
          try {
            const result = await Tip.findOneAndUpdate(
              { text: tipData.text },
              { $setOnInsert: tipData },
              { upsert: true, new: true, rawResult: true }
            );
            if (!result.lastErrorObject.updatedExisting) {
              newCount++;
            }
          } catch {
            // Unique constraint skip
          }
        }
      } catch (err) {
        console.error(`Source ${source.name} failed entirely:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      newTipsAdded: newCount,
      totalProcessed: totalFlattened,
    });
  } catch (error) {
    console.error("Sync API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
