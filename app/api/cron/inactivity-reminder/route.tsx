import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";
import Post from "@/models/post";
import { resend } from "@/lib/resend";
import { ReminderEmail } from "@/emails/ReminderEmail";
import React from "react";

export const dynamic = "force-dynamic";

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

    // Calculate date 3 days ago
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    // 1. Find users who haven't posted in 3+ days
    const inactiveUsers = await User.find({
      "preferences.dailyEmail": { $ne: false },
      email: { $exists: true, $ne: "" },
    }).select("_id name email createdAt");

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
        // Get the user's most recent post
        const lastPost = await Post.findOne({ userId: user._id })
          .sort({ createdAt: -1 })
          .select("createdAt");

        if (!lastPost) {
          // User has never posted
          // Only send reminder if they signed up more than 3 days ago
          const userCreatedAt = new Date(user.createdAt);
          if (userCreatedAt <= threeDaysAgo) {
            const sent = await sendReminderEmail(
              user.email,
              user.name || "Friend",
              undefined,
              true
            );
            if (sent) {
              results.neverPostedEmails++;
            }
          }
        } else {
          // User has posted before
          // Check if their last post was more than 3 days ago
          const lastPostDate = new Date(lastPost.createdAt);
          if (lastPostDate <= threeDaysAgo) {
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
