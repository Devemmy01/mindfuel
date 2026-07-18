import { NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Tip from "@/models/tip";

export const maxDuration = 5;

const responseHeaders = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

const fallbackTip = {
  text: "Breathe deeply. You are exactly where you need to be.",
  author: "MindFuel",
  source: "Fallback",
  category: "mindfulness",
};

async function fetchUsefulAdvice() {
  try {
    const response = await fetch("https://api.adviceslip.com/advice", {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      slip?: { advice?: string };
    };
    const text = data.slip?.advice?.trim();
    if (!text || text.length > 280) return null;

    return {
      text,
      author: "Advice Slip",
      source: "AdviceSlip",
      category: "advice",
    };
  } catch (error) {
    console.error("Advice Slip API error:", error);
    return null;
  }
}

export async function GET() {
  // Keep most results rooted in MindFuel's curated collection while adding a
  // regular dose of broader, practical advice.
  const shouldUseExternalAdvice = Math.random() < 0.35;
  let externalAdvice = shouldUseExternalAdvice
    ? await fetchUsefulAdvice()
    : null;

  if (externalAdvice) {
    return NextResponse.json(externalAdvice, { headers: responseHeaders });
  }

  try {
    await connectToDB();

    // Use $sample to get one random document from the collection
    const randomTips = await Tip.aggregate([{ $sample: { size: 1 } }]);

    if (randomTips?.length) {
      return NextResponse.json(randomTips[0], { headers: responseHeaders });
    }
  } catch (error) {
    console.error("Random tip API error:", error);
  }

  // If the local collection is unavailable or empty, the external source gets
  // one chance before we fall back to a dependable built-in tip.
  if (!shouldUseExternalAdvice) {
    externalAdvice = await fetchUsefulAdvice();
  }

  return NextResponse.json(externalAdvice || fallbackTip, {
    headers: responseHeaders,
  });
}
