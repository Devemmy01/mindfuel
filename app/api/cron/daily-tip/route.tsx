import { NextRequest, NextResponse } from "next/server";
import { unsubscribeFor } from "@/lib/unsubscribe";
import { emailAllowed, sendCategoryPush } from "@/lib/notify";
import { isCronAuthorized } from "@/lib/api-auth";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";
import { resend } from "@/lib/resend";
import { DailyTipEmail } from "@/emails/DailyTipEmail";
import { showableTipTexts } from "@/lib/tips";
import { absoluteComposeUrl } from "@/lib/links";
import { getTodayPrompt } from "@/lib/dailyPrompts";
import { DAILY_TIPS } from "@/lib/dailyTips";
import { pickItem, poolFor, streakLine, subjectFor, themeFor, type FuelItem } from "@/lib/daily-fuel";
import Post from "@/models/post";
import { PUBLIC_POSTS } from "@/lib/post-visibility";
import React from "react";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDB();

    // Build one quality-controlled pool of actual tips (advice/affirmations),
    // not reflection questions — those belong to the in-app prompt, not this
    // email. Selection happens per user so every person gets a fresh tip
    // until they have exhausted the entire pool.
    let tipPool: string[] = [...DAILY_TIPS];
    try {
      // Only reviewed or screened tips reach inboxes.
      tipPool = [...new Set([...DAILY_TIPS, ...(await showableTipTexts())])];
    } catch (tipError) {
      console.error("Failed to fetch local tip for cron:", tipError);
    }

    if (tipPool.length === 0) tipPool = [DAILY_TIPS[0]];

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const dateKey = startOfToday.toISOString().slice(0, 10);

    // 2. Fetch users (Unlocked for all users)
    // Preferences are checked per user below (email and push separately).
    const theme = themeFor(startOfToday);
    const pool = poolFor(theme, tipPool.filter((tip) => !(DAILY_TIPS as readonly string[]).includes(tip)));
    const prompt = getTodayPrompt();
    const writeUrl = absoluteComposeUrl(prompt, "email-tip");

    // Social proof, only when it's real and not tiny.
    let communityLine: string | null = null;
    try {
      const yesterday = new Date(startOfToday.getTime() - 86_400_000);
      const authors = await Post.distinct("userId", {
        ...PUBLIC_POSTS,
        isRepost: { $ne: true },
        createdAt: { $gte: yesterday, $lt: startOfToday },
      });
      if (authors.length >= 3) communityLine = `${authors.length} people shared a reflection yesterday. Yours could be next.`;
    } catch (countError) {
      console.error("Daily Fuel community count failed:", countError);
    }

    const users = await User.find({
      email: { $exists: true, $ne: "" },
      $or: [
        { lastDailyTipEmailAt: { $lt: startOfToday } },
        { lastDailyTipEmailAt: null },
        { lastDailyTipEmailAt: { $exists: false } },
      ],
    }).select("name email preferences notificationSettings pushSubscriptions dailyTipHistory lastDailyTipEmailAt streakDays lastReflectionDate");

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

    const sendDailyTipEmail = async (
      userId: string,
      userEmail: string,
      userName: string,
      item: FuelItem,
      personalLine: string | null,
    ) => {
      const unsubscribe = unsubscribeFor(userId, "product");
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = (await resend.emails.send({
            from: "MindFuel <daily@mind-fuel.app>",
            to: userEmail,
            // A different subject every day: identical ones get threaded and read as repeats.
            subject: subjectFor(theme, item),
            headers: unsubscribe.headers,
            react: (
              <DailyTipEmail
                name={userName || "Friend"}
                themeLabel={theme.label}
                kicker={theme.kicker}
                title={item.title}
                body={item.body}
                extra={item.extra}
                wordStyle={theme.key === "word"}
                promptQuestion={prompt.question}
                ctaLabel={theme.cta}
                writeUrl={writeUrl}
                streakLine={personalLine}
                communityLine={communityLine}
                downloadUrl={theme.key === "mindset" ? `${process.env.NEXT_PUBLIC_BASE_URL || "https://mind-fuel.app"}/tip/download?text=${encodeURIComponent(item.body)}` : undefined}
                unsubscribeUrl={unsubscribe.url}
              />
            ) as React.ReactElement,
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
      // History holds item ids (older entries are plain tip texts, which map to "tip:<text>").
      const history = new Set<string>((user.dailyTipHistory || []).map((entry: unknown) => {
        const value = String(entry);
        return /^(tip:|try|word|thanks|fg|slow|reset)/.test(value) ? value : `tip:${value}`;
      }));
      const { item, exhausted } = pickItem(pool, history, `${user.email}:${dateKey}`);
      const personalLine = streakLine(user.streakDays, user.lastReflectionDate);

      // EMAIL (the "Product updates and tips" category)
      try {
        const sent = emailAllowed(user, "product")
          ? await sendDailyTipEmail(String(user._id), user.email, (user.name || "Friend").split(" ")[0], item, personalLine)
          : false;
        if (sent) {
          results.emailsSent++;
          await User.updateOne(
            { _id: user._id },
            exhausted
              ? {
                  // Restart only this theme's pool; keep what was seen in the others.
                  $set: { lastDailyTipEmailAt: new Date() },
                  $pull: { dailyTipHistory: { $in: pool.map((entry) => entry.id) } },
                }
              : {
                  $set: { lastDailyTipEmailAt: new Date() },
                  $push: { dailyTipHistory: { $each: [item.id], $slice: -1000 } },
                },
          );
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`Email error for ${user.email}: ${message}`);
      }

      await sleep(SEND_DELAY_MS);

      // WEB PUSH
      if (user.pushSubscriptions?.length > 0) {
        const delivery = await sendCategoryPush({
          userId: user._id,
          category: "product",
          payload: {
            title: theme.label,
            body: theme.key === "word" ? `${item.title}: ${item.body}` : item.title,
            tag: "daily-fuel",
            url: absoluteComposeUrl(getTodayPrompt(), "push-tip"),
          },
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
