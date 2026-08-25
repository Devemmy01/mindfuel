import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";
import Tip from "@/models/tip";
import { resend } from "@/lib/resend";
import { DailyTipEmail } from "@/emails/DailyTipEmail";
import { DAILY_TIPS, stableTipIndex } from "@/lib/dailyTips";
import { sendPushNotifications, StoredPushSubscription } from "@/lib/sendPushNotifications";
import React from "react";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const userAgent = req.headers.get("user-agent");
  const isAuthorized =
    userAgent === "vercel-cron/1.0" ||
    (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDB();

    // Build one quality-controlled pool of actual tips (advice/affirmations),
    // not reflection questions — those belong to the in-app prompt, not this
    // email. Selection happens per user so every person gets a fresh tip
    // until they have exhausted the entire pool.
    let tipPool = [...DAILY_TIPS];
    try {
      const storedTips = await Tip.find({}).select("text -_id").limit(1000).lean();
      tipPool = [...new Set([...DAILY_TIPS, ...storedTips.map((tip) => tip.text).filter(Boolean)])];
    } catch (tipError) {
      console.error("Failed to fetch local tip for cron:", tipError);
    }

    if (tipPool.length === 0) tipPool = [DAILY_TIPS[0]];

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const dateKey = startOfToday.toISOString().slice(0, 10);

    // 2. Fetch users (Unlocked for all users)
    const users = await User.find({
      "preferences.dailyEmail": { $ne: false },
      email: { $exists: true, $ne: "" },
      $or: [
        { lastDailyTipEmailAt: { $lt: startOfToday } },
        { lastDailyTipEmailAt: null },
        { lastDailyTipEmailAt: { $exists: false } },
      ],
    }).select("name email preferences pushSubscriptions dailyTipHistory lastDailyTipEmailAt");

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

    const MAX_RETRIES = 3;
    const SEND_DELAY_MS = 500;

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const sendDailyTipEmail = async (userEmail: string, userName: string, tip: string) => {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = (await resend.emails.send({
            from: "MindFuel <daily@mind-fuel.app>",
            to: userEmail,
            subject: "Your Daily Fuel is here",
            react: <DailyTipEmail name={userName || "Friend"} tip={tip} /> as React.ReactElement,
          })) as unknown;

          // Resend's response typing can be ambiguous; guard access safely.
          const respObj = response && typeof response === "object" ? (response as Record<string, unknown>) : {};
          const maybeError = respObj && Object.prototype.hasOwnProperty.call(respObj, "error") ? respObj.error : undefined;

          if (maybeError) {
            throw new Error(
              typeof maybeError === "string" ? maybeError : JSON.stringify(maybeError),
            );
          }

          return true;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Unknown error";

          if (attempt < MAX_RETRIES) {
            await sleep(SEND_DELAY_MS * attempt);
            continue;
          }

          results.errors.push(`Email error for ${userEmail}: ${message}`);
          return false;
        }
      }

      return false;
    };

    // 3. Process Notifications
    for (const user of users) {
      const history = new Set((user.dailyTipHistory || []).map(String));
      let availableTips = tipPool.filter((tip) => !history.has(tip));
      const exhaustedPool = availableTips.length === 0;
      if (exhaustedPool) availableTips = tipPool;
      const tip = availableTips[stableTipIndex(`${user.email}:${dateKey}`, availableTips.length)];

      // EMAIL
      try {
        const sent = await sendDailyTipEmail(user.email, user.name || "Friend", tip);
        if (sent) {
          results.emailsSent++;
          await User.updateOne(
            { _id: user._id },
            exhaustedPool
              ? { $set: { dailyTipHistory: [tip], lastDailyTipEmailAt: new Date() } }
              : {
                  $set: { lastDailyTipEmailAt: new Date() },
                  $push: { dailyTipHistory: { $each: [tip], $slice: -1000 } },
                },
          );
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`Email error for ${user.email}: ${message}`);
      }

      await sleep(SEND_DELAY_MS);

      // WEB PUSH
      if (user.preferences?.notifications && user.pushSubscriptions?.length > 0) {
        const payload = JSON.stringify({
          title: "Daily Fuel",
          body: tip,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: "daily-fuel",
          data: { url: "https://mind-fuel.app" }
        });

        const delivery = await sendPushNotifications({
          recipientId: user._id,
          subscriptions: user.pushSubscriptions as unknown as StoredPushSubscription[],
          payload,
        });
        results.pushSent += delivery.sent;
      }
    }

    return NextResponse.json(
      {
        success: true,
        tipPoolSize: tipPool.length,
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
