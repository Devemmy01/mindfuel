import { NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import { randomShowableTip } from "@/lib/tips";

export const maxDuration = 5;

const responseHeaders = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

/**
 * One screened tip. The live Advice Slip call is gone: it served unreviewed
 * joke advice to every visitor, including off-tone lines about not being alive.
 */
export async function GET() {
  try {
    await connectToDB();
  } catch (error) {
    console.error("Random tip DB unavailable", error);
  }
  return NextResponse.json(await randomShowableTip(), { headers: responseHeaders });
}
