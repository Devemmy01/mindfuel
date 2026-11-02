import { NextRequest, NextResponse } from "next/server";
import { getPromptByDate, getRandomPrompt } from "@/lib/dailyPrompts";

/**
 * Prompts for the client, so pages don't ship all 1,000 of them.
 *   GET /api/prompts?date=YYYY-MM-DD   the prompt for that UTC day (immutable)
 *   GET /api/prompts?random=1&exclude=<id>
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (params.get("random")) {
    const exclude = params.get("exclude");
    let prompt = getRandomPrompt();
    for (let tries = 0; prompt.id === exclude && tries < 3; tries += 1) prompt = getRandomPrompt();
    return NextResponse.json(prompt, { headers: { "Cache-Control": "no-store" } });
  }

  const date = params.get("date") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }
  return NextResponse.json(getPromptByDate(new Date(`${date}T12:00:00Z`)), {
    headers: { "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable" },
  });
}
