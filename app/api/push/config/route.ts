import { NextResponse } from "next/server";

export const maxDuration = 5;

export async function GET() {
  return NextResponse.json(
    {
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
