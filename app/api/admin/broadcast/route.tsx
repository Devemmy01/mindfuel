import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";
import { Resend } from "resend";
import UpdateEmail from "@/emails/UpdateEmail";
import React from "react";
import updates from "@/config/updates.json";

const resend = new Resend(process.env.RESEND_API_KEY);
const BATCH_SIZE = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 750;

type BroadcastRecipient = {
  name?: string;
  email: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function chunkRecipients(recipients: BroadcastRecipient[]) {
  const chunks: BroadcastRecipient[][] = [];

  for (let index = 0; index < recipients.length; index += BATCH_SIZE) {
    chunks.push(recipients.slice(index, index + BATCH_SIZE));
  }

  return chunks;
}

function safeIdempotencyPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    await connectToDB();

    const body = await req.json();
    const { testEmail, adminSecret } = body;
    let { updateTitle, updateDetails, updateVersion } = body;

    // 1. Security check
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Automatic Mode: Pull from updates.json if empty
    if (!updateTitle || !updateDetails) {
      const latestUpdate = updates[0];
      if (!latestUpdate) {
        return NextResponse.json({ error: "No updates found in changelog" }, { status: 400 });
      }
      updateTitle = latestUpdate.title;
      updateDetails = latestUpdate.details;
      updateVersion = latestUpdate.version;
    }

    // 3. Determine target users
    let targetUsers: BroadcastRecipient[] = [];
    if (testEmail) {
      // Test mode: only send to the specified test email
      targetUsers = [{ name: "Test User", email: testEmail }];
    } else {
      // Production mode: fetch all users with emails and notification preferences
      targetUsers = await User.find({
        email: { $exists: true, $ne: "" },
        "preferences.notifications": { $ne: false },
      })
        .select("name email -_id")
        .sort({ email: 1 })
        .lean<BroadcastRecipient[]>();
    }

    targetUsers = targetUsers.filter((user) => Boolean(user.email));

    if (targetUsers.length === 0) {
      return NextResponse.json({ message: "No users to email" });
    }

    // 4. Send up to 100 personalized emails per Resend request. The previous
    // one-request-per-user loop could never finish inside Vercel's 5s limit.
    const recipientChunks = chunkRecipients(targetUsers);
    const broadcastId = safeIdempotencyPart(String(updateVersion || updateTitle));
    let successCount = 0;
    let failCount = 0;

    for (const [batchIndex, recipientBatch] of recipientChunks.entries()) {
      let batchCompleted = false;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = await resend.batch.send(
            recipientBatch.map((user) => ({
              from: "MindFuel <updates@mind-fuel.app>",
              to: user.email,
              subject: `New on MindFuel: ${updateTitle}`,
              react: (
                <UpdateEmail
                  userName={user.name || "there"}
                  updateTitle={updateTitle}
                  updateDetails={updateDetails}
                />
              ) as React.ReactElement,
            })),
            {
              batchValidation: "permissive",
              // Production retries and workflow re-runs return the original
              // result instead of sending the same release twice.
              idempotencyKey: testEmail
                ? undefined
                : `mindfuel-update-${broadcastId}-batch-${batchIndex + 1}`,
            }
          );

          if (response.error) {
            console.error(
              `Attempt ${attempt} failed for batch ${batchIndex + 1}:`,
              response.error
            );
          } else {
            const sentCount = response.data.data.length;
            const validationErrors = response.data.errors || [];

            successCount += sentCount;
            failCount += validationErrors.length;
            validationErrors.forEach((error) => {
              console.error(
                `Skipped ${recipientBatch[error.index]?.email || `recipient ${error.index}`}: ${error.message}`
              );
            });
            batchCompleted = true;
            break;
          }
        } catch (err) {
          console.error(
            `Exception on attempt ${attempt} for batch ${batchIndex + 1}:`,
            err
          );
        }

        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * attempt);
        }
      }

      if (!batchCompleted) {
        console.error(`All ${MAX_RETRIES} attempts failed for batch ${batchIndex + 1}`);
        failCount += recipientBatch.length;
      }

      // Resend permits two requests per second. This only matters when the
      // audience spans multiple 100-recipient batches.
      if (batchIndex < recipientChunks.length - 1) {
        await sleep(RETRY_DELAY_MS);
      }
    }

    return NextResponse.json({
      message: `Successfully sent ${successCount}/${targetUsers.length} emails.${failCount > 0 ? ` ${failCount} failed after retries.` : ""}`,
      mode: testEmail ? "test" : "production",
      successCount,
      failCount,
      updateSent: updateTitle,
    });
  } catch (error: unknown) {
    console.error("Broadcast Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
