import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";
import { Resend } from "resend";
import UpdateEmail from "@/emails/UpdateEmail";
import React from "react";
import updates from "@/config/updates.json";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    await connectToDB();

    const body = await req.json();
    const { testEmail, adminSecret } = body;
    let { updateTitle, updateDetails } = body;

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
    }

    // 2. Determine target users
    let targetUsers = [];
    if (testEmail) {
      // Test mode: only send to the specified test email
      targetUsers = [{ name: "Test User", email: testEmail }];
    } else {
      // Production mode: fetch all users with emails and notification preferences
      targetUsers = await User.find({
        email: { $exists: true, $ne: "" },
        "preferences.notifications": { $ne: false },
      }).select("name email");
    }

    if (targetUsers.length === 0) {
      return NextResponse.json({ message: "No users to email" });
    }

    // 3. Send emails sequentially to respect rate limits and properly check errors
    const results = [];
    for (const user of targetUsers) {
      try {
        const response = await resend.emails.send({
          from: "MindFuel <updates@mind-fuel.app>",
          to: user.email,
          subject: `New on MindFuel: ${updateTitle}`,
          react: (
            <UpdateEmail
              userName={user.name}
              updateTitle={updateTitle}
              updateDetails={updateDetails}
            />
          ) as React.ReactElement,
        });
        
        if (response.error) {
          console.error(`Failed to send to ${user.email}:`, response.error);
          results.push(null);
        } else {
          results.push(response.data);
        }
      } catch (err) {
        console.error(`Exception sending to ${user.email}:`, err);
        results.push(null);
      }
      // Delay 100ms to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const successCount = results.filter((r) => r !== null).length;

    return NextResponse.json({
      message: `Successfully sent ${successCount} emails.`,
      mode: testEmail ? "test" : "production",
      updateSent: updateTitle
    });
  } catch (error: unknown) {
    console.error("Broadcast Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
