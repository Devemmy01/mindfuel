import { NextRequest, NextResponse } from "next/server";
import { MAX_WINBACKS } from "@/lib/notification-policy";
import { unsubscribeFor } from "@/lib/unsubscribe";
import { emailAllowed } from "@/lib/notify";
import { isCronAuthorized } from "@/lib/api-auth";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";
import Post from "@/models/post";
import { resend } from "@/lib/resend";
import { ReminderEmail } from "@/emails/ReminderEmail";
import { absoluteComposeUrl, absoluteUrl } from "@/lib/links";
import { getTodayPrompt } from "@/lib/dailyPrompts";
import React from "react";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDB();

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Find users who have not posted in 7+ days and have not already received
    // an inactivity reminder during the last week.
    // This uses the denormalized lastReflectionDate maintained on User instead
    // of querying Post once per user.
    // A gentle, capped win-back: weekly at most, and never more than
    // MAX_WINBACKS times until the person reflects again.
    const inactiveUsers = await User.find({
      email: { $exists: true, $ne: "" },
      $and: [
        { $or: [{ winbackCount: { $lt: MAX_WINBACKS } }, { winbackCount: { $exists: false } }] },
        {
          $or: [
            { lastReflectionDate: { $lte: sevenDaysAgo } },
            { lastReflectionDate: null, createdAt: { $lte: sevenDaysAgo } },
            { lastReflectionDate: { $exists: false }, createdAt: { $lte: sevenDaysAgo } },
          ],
        },
        {
          $or: [
            { lastInactivityReminderAt: { $lte: sevenDaysAgo } },
            { lastInactivityReminderAt: null },
            { lastInactivityReminderAt: { $exists: false } },
          ],
        },
      ],
    }).select("_id name email createdAt lastReflectionDate lastInactivityReminderAt preferences notificationSettings winbackCount");

    const usersMissingReflectionDate = inactiveUsers.filter((user) => !user.lastReflectionDate);
    const lastPostByUserId = new Map<string, Date>();

    if (usersMissingReflectionDate.length > 0) {
      const lastPosts = await Post.aggregate<{ _id: unknown; lastPostDate: Date }>([
        {
          $match: {
            userId: { $in: usersMissingReflectionDate.map((user) => user._id) },
          },
        },
        {
          $group: {
            _id: "$userId",
            lastPostDate: { $max: "$createdAt" },
          },
        },
      ]);

      for (const post of lastPosts) {
        lastPostByUserId.set(String(post._id), post.lastPostDate);
      }
    }

    const results = {
      inactiveEmails: 0,
      neverPostedEmails: 0,
      errors: [] as string[],
    };

    const MAX_RETRIES = 3;
    const SEND_DELAY_MS = 500;

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const sendReminderEmail = async (
      userId: string,
      userEmail: string,
      userName: string,
      daysSincePost?: number,
      hasNeverPosted?: boolean
    ) => {
      const unsubscribe = unsubscribeFor(userId, "daily");
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = (await resend.emails.send({
            from: "MindFuel <hello@mind-fuel.app>",
            to: userEmail,
            headers: unsubscribe.headers,
            subject: hasNeverPosted
              ? "Share your first reflection"
              : "We miss your reflections",
            react: (
              <ReminderEmail
                name={userName || "Friend"}
                daysSincePost={daysSincePost}
                hasNeverPosted={hasNeverPosted}
                writeUrl={absoluteComposeUrl(getTodayPrompt(), "email-reminder")}
                feedUrl={absoluteUrl("/feed?source=email-reminder")}
                unsubscribeUrl={unsubscribe.url}
              />
            ) as React.ReactElement,
          })) as unknown;

          const respObj =
            response && typeof response === "object"
              ? (response as Record<string, unknown>)
              : {};
          const maybeError =
            respObj && Object.prototype.hasOwnProperty.call(respObj, "error")
              ? respObj.error
              : undefined;

          if (maybeError) {
            throw new Error(
              typeof maybeError === "string"
                ? maybeError
                : JSON.stringify(maybeError)
            );
          }

          return true;
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : "Unknown error";

          if (attempt < MAX_RETRIES) {
            await sleep(SEND_DELAY_MS * attempt);
            continue;
          }

          results.errors.push(
            `Email error for ${userEmail}: ${message}`
          );
          return false;
        }
      }

      return false;
    };

    // 2. Process each user
    for (const user of inactiveUsers) {
      try {
        if (!emailAllowed(user, "daily")) continue;
        const lastReflectionDate =
          user.lastReflectionDate || lastPostByUserId.get(String(user._id));

        if (!lastReflectionDate) {
          const sent = await sendReminderEmail(
            String(user._id),
            user.email,
            user.name || "Friend",
            undefined,
            true
          );
          if (sent) {
            results.neverPostedEmails++;
            await User.updateOne({ _id: user._id }, { $set: { lastInactivityReminderAt: new Date() }, $inc: { winbackCount: 1 } });
          }
        } else {
          const lastPostDate = new Date(lastReflectionDate);
          const daysSincePost = Math.floor(
            (Date.now() - lastPostDate.getTime()) / (24 * 60 * 60 * 1000)
          );
          const sent = await sendReminderEmail(
            String(user._id),
            user.email,
            user.name || "Friend",
            daysSincePost,
            false
          );
          if (sent) {
            results.inactiveEmails++;
            await User.updateOne({ _id: user._id }, { $set: { lastInactivityReminderAt: new Date() }, $inc: { winbackCount: 1 } });
          }
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`Processing error for user ${user._id}: ${message}`);
      }

      await sleep(SEND_DELAY_MS);
    }

    return NextResponse.json(
      {
        success: true,
        results,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Inactivity reminder cron error:", error);
    return NextResponse.json(
      { error: "Failed to process inactivity reminders" },
      { status: 500 }
    );
  }
}
