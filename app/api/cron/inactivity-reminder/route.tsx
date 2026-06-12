import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";
import Post from "@/models/post";
import { resend } from "@/lib/resend";
import { ReminderEmail } from "@/emails/ReminderEmail";
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

    // Calculate date 3 days ago
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    // 1. Find users who haven't posted in 3+ days.
    // This uses the denormalized lastReflectionDate maintained on User instead
    // of querying Post once per user.
    const inactiveUsers = await User.find({
      "preferences.dailyEmail": { $ne: false },
      email: { $exists: true, $ne: "" },
      $or: [
        { lastReflectionDate: { $lte: threeDaysAgo } },
        { lastReflectionDate: null, createdAt: { $lte: threeDaysAgo } },
        { lastReflectionDate: { $exists: false }, createdAt: { $lte: threeDaysAgo } },
      ],
    }).select("_id name email createdAt lastReflectionDate");

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
      userEmail: string,
      userName: string,
      daysSincePost?: number,
      hasNeverPosted?: boolean
    ) => {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = (await resend.emails.send({
            from: "MindFuel <hello@mind-fuel.app>",
            to: userEmail,
            subject: hasNeverPosted
              ? "Share your first reflection"
              : "We miss your reflections",
            react: (
              <ReminderEmail
                name={userName || "Friend"}
                daysSincePost={daysSincePost}
                hasNeverPosted={hasNeverPosted}
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
        const lastReflectionDate =
          user.lastReflectionDate || lastPostByUserId.get(String(user._id));

        if (!lastReflectionDate) {
          const sent = await sendReminderEmail(
            user.email,
            user.name || "Friend",
            undefined,
            true
          );
          if (sent) {
            results.neverPostedEmails++;
          }
        } else {
          const lastPostDate = new Date(lastReflectionDate);
          const daysSincePost = Math.floor(
            (Date.now() - lastPostDate.getTime()) / (24 * 60 * 60 * 1000)
          );
          const sent = await sendReminderEmail(
            user.email,
            user.name || "Friend",
            daysSincePost,
            false
          );
          if (sent) {
            results.inactiveEmails++;
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
