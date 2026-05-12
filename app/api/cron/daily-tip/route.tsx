import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";
import Tip from "@/models/tip";
import { resend } from "@/lib/resend";
import { DailyTipEmail } from "@/emails/DailyTipEmail";
import { getPromptForToday } from "@/lib/prompts";
import webpush from "web-push";
import React from "react";

export const dynamic = "force-dynamic";

// Configure Web Push if keys are available
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:dominicgeorge974@gmail.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function GET(req: NextRequest) {
  // Simple auth check using a secret header
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    // return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDB();

    // 1. Fetch a mindful tip (try DB first, fallback to prompt library)
    let tip = getPromptForToday();
    try {
      const randomTips = await Tip.aggregate([{ $sample: { size: 1 } }]);
      if (randomTips && randomTips.length > 0) {
        tip = randomTips[0].text;
      }
    } catch (tipError) {
      console.error("Failed to fetch local tip for cron:", tipError);
    }

    // 2. Fetch users (Unlocked for all users)
    const users = await User.find({
      "preferences.dailyEmail": { $ne: false },
      email: { $exists: true, $ne: "" },
    }).select("name email preferences pushSubscriptions");

    if (users.length === 0) {
      return NextResponse.json(
        { message: "No users to notify (Testing lock active)" },
        { status: 200 },
      );
    }

    const results = {
      emailsSent: 0,
      pushSent: 0,
      errors: [] as string[],
    };

    // 3. Process Notifications
    for (const user of users) {
      // EMAIL
      try {
        await resend.emails.send({
          from: "MindFuel <daily@mind-fuel.app>",
          to: user.email,
          subject: "Your Daily Fuel is here",
          react: <DailyTipEmail name={user.name || "Friend"} tip={tip} /> as React.ReactElement,
        });
        results.emailsSent++;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`Email error for ${user.email}: ${message}`);
      }

      // WEB PUSH
      if (user.preferences?.notifications && user.pushSubscriptions?.length > 0) {
        const payload = JSON.stringify({
          title: "Daily Fuel",
          body: tip,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          data: { url: "https://mind-fuel.app" }
        });

        for (const sub of user.pushSubscriptions) {
          try {
            await webpush.sendNotification(sub, payload);
            results.pushSent++;
          } catch (error: unknown) {
            if (error && typeof error === 'object' && 'statusCode' in error) {
              const err = error as { statusCode: number };
              if (err.statusCode === 410 || err.statusCode === 404) {
                await User.updateOne(
                  { _id: user._id },
                  { $pull: { pushSubscriptions: { endpoint: sub.endpoint } } }
                );
              }
            }
          }
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        tip,
        results
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
