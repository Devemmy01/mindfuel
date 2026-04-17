import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";
import { resend } from "@/lib/resend";
import { DailyTipEmail } from "@/emails/DailyTipEmail";
import React from "react";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Simple auth check using a secret header (optional but recommended)
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDB();

    // 1. Fetch a mindful tip
    let tip = "Breathe deeply. You are exactly where you need to be.";
    try {
      const tipRes = await fetch("https://api.adviceslip.com/advice", {
        cache: "no-store",
      });
      const tipData = await tipRes.json();
      tip = tipData.slip.advice;
    } catch (tipError) {
      console.error("Failed to fetch tip for cron:", tipError);
    }

    // 2. Fetch all users who want the daily email
    const users = await User.find({
      "preferences.dailyEmail": { $ne: false },
      email: { $exists: true, $ne: "" },
    }).select("name email");

    if (users.length === 0) {
      return NextResponse.json(
        { message: "No users to notify" },
        { status: 200 },
      );
    }

    // 3. Send emails in batches of 50 (Resend recommendation)
    const batchSize = 50;
    const results = [];

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      const emailBatch = batch.map((user: { email: string; name: string }) => ({
        from: "MindFuel <noreply@mind-fuel.app>",
        to: user.email,
        subject: "Your Daily Mindful Tip",
        react: (
          <DailyTipEmail name={user.name || "Friend"} tip={tip} />
        ) as React.ReactElement,
      }));

      try {
        const { data, error } = await resend.batch.send(emailBatch);
        if (error) {
          console.error("Batch send error:", error);
          results.push({ error });
        } else {
          results.push({ count: batch.length, data });
        }
      } catch (err) {
        console.error("Batch processing failed:", err);
        results.push({ error: err });
      }
    }

    return NextResponse.json(
      {
        success: true,
        tip,
        totalUsers: users.length,
        processedBatches: results.length,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Daily tip cron error:", error);
    return NextResponse.json(
      { error: "Failed to process daily tips" },
      { status: 500 },
    );
  }
}
