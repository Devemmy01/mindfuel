import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";
import { getTodayPrompt } from "@/lib/dailyPrompts";
import webpush from "web-push";

export const dynamic = "force-dynamic";

// Configure web-push with VAPID keys
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || "https://mind-fuel.app",
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDB();

    // Get today's prompt
    const todayPrompt = getTodayPrompt();

    // Get all users with push notifications enabled
    const users = await User.find({
      "preferences.notifications": { $ne: false },
      pushSubscriptions: { $exists: true, $ne: [] },
    })
      .select("name pushSubscriptions")
      .lean();

    if (users.length === 0) {
      return NextResponse.json(
        { message: "No users with push subscriptions" },
        { status: 200 }
      );
    }

    // Send push notifications
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const user of users) {
      // Each user may have multiple push subscriptions (multiple devices)
      if (user.pushSubscriptions && Array.isArray(user.pushSubscriptions)) {
        for (const subscription of user.pushSubscriptions) {
          try {
            const payload = JSON.stringify({
              title: "✨ Daily Reflection",
              body: todayPrompt.question,
              icon: "/splash-logo.png",
              badge: "/splash-logo.png",
              tag: "daily-prompt",
              requireInteraction: false,
              actions: [
                {
                  action: "open",
                  title: "Share your reflection",
                },
              ],
              data: {
                url: `/create?prompt=${encodeURIComponent(todayPrompt.question)}&promptId=${todayPrompt.id}`,
                promptId: todayPrompt.id,
              },
            });

            await webpush.sendNotification(subscription, payload);
            results.sent++;
          } catch (error) {
            results.failed++;
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            results.errors.push(errorMsg);

            // If subscription is invalid, optionally remove it
            if (error instanceof Error && error.message.includes("410")) {
              // 410 Gone means subscription is invalid
              try {
                await User.findByIdAndUpdate(
                  { pushSubscriptions: { $elemMatch: { endpoint: subscription.endpoint } } },
                  { $pull: { pushSubscriptions: { endpoint: subscription.endpoint } } }
                );
              } catch (removeError) {
                console.error("Failed to remove invalid subscription:", removeError);
              }
            }
          }
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        prompt: todayPrompt,
        sent: results.sent,
        failed: results.failed,
        message: `Sent ${results.sent} notifications, ${results.failed} failed`,
        errors: results.errors.length > 0 ? results.errors : undefined,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Daily prompt notification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send notifications",
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
