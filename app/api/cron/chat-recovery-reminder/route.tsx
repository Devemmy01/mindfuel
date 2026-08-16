import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";
import Conversation from "@/models/conversation";
import { resend } from "@/lib/resend";
import { ChatRecoveryReminderEmail } from "@/emails/ChatRecoveryReminderEmail";
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

    // Anyone who's ever participated in an encrypted conversation. Cheaper
    // than checking Conversation.exists() once per candidate user.
    const encryptedParticipantIds = await Conversation.distinct("participants", {
      encryptionVersion: 1,
    });

    if (encryptedParticipantIds.length === 0) {
      return NextResponse.json({ success: true, results: { emailsSent: 0, errors: [] } });
    }

    // Users with an encrypted conversation, a registered chat key, no
    // recovery backup on file yet, and who haven't already been sent this
    // one-time reminder.
    const candidates = await User.find({
      _id: { $in: encryptedParticipantIds },
      "preferences.dailyEmail": { $ne: false },
      email: { $exists: true, $ne: "" },
      chatKeyRecovery: { $exists: false },
      chatRecoveryReminderSentAt: { $exists: false },
    })
      .select("_id name email +chatPublicKey");

    const usersToRemind = candidates.filter((user) => Boolean(user.chatPublicKey));

    const results = { emailsSent: 0, errors: [] as string[] };
    const MAX_RETRIES = 3;
    const SEND_DELAY_MS = 500;
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (const user of usersToRemind) {
      let sent = false;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = (await resend.emails.send({
            from: "MindFuel <hello@mind-fuel.app>",
            to: user.email,
            subject: "Set a recovery PIN for your encrypted chats",
            react: (
              <ChatRecoveryReminderEmail name={user.name || "Friend"} />
            ) as React.ReactElement,
          })) as unknown;

          const respObj = response && typeof response === "object" ? (response as Record<string, unknown>) : {};
          const maybeError = Object.prototype.hasOwnProperty.call(respObj, "error") ? respObj.error : undefined;
          if (maybeError) throw new Error(typeof maybeError === "string" ? maybeError : JSON.stringify(maybeError));

          sent = true;
          break;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Unknown error";
          if (attempt < MAX_RETRIES) {
            await sleep(SEND_DELAY_MS * attempt);
            continue;
          }
          results.errors.push(`Email error for ${user.email}: ${message}`);
        }
      }

      if (sent) {
        results.emailsSent++;
        await User.updateOne({ _id: user._id }, { $set: { chatRecoveryReminderSentAt: new Date() } });
      }

      await sleep(SEND_DELAY_MS);
    }

    return NextResponse.json({ success: true, results }, { status: 200 });
  } catch (error: unknown) {
    console.error("Chat recovery reminder cron error:", error);
    return NextResponse.json({ error: "Failed to process chat recovery reminders" }, { status: 500 });
  }
}
