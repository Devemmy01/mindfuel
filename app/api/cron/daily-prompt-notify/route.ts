import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/api-auth";
import { absoluteComposeUrl } from "@/lib/links";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";
import { getPromptByDate } from "@/lib/dailyPrompts";
import { localParts, reminderDue, resolveSettings } from "@/lib/notification-policy";
import { sendCategoryPush } from "@/lib/notify";

export const maxDuration = 30;

/**
 * Hourly: sends the daily reflection reminder to people whose chosen local
 * hour is now, who have not reflected today, at most once per local day.
 * Triggered by .github/workflows/hourly-reminders.yml (works on any Vercel plan).
 */
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDB();
    const now = new Date();

    // Everyone with a device; the policy decides who is due this hour.
    const users = await User.find({ pushSubscriptions: { $exists: true, $ne: [] } })
      .select("preferences notificationSettings lastReflectionDate lastReminderSentOn")
      .lean();

    const results = { due: 0, sent: 0, skipped: 0 };

    for (const user of users) {
      if (!reminderDue(user as Parameters<typeof reminderDue>[0], now)) continue;
      results.due += 1;

      const settings = resolveSettings(user as Parameters<typeof resolveSettings>[0]);
      const local = localParts(now, settings.timezone);
      // The prompt for the person's own calendar day.
      const prompt = getPromptByDate(new Date(`${local.date}T12:00:00Z`));

      const delivery = await sendCategoryPush({
        userId: String(user._id),
        category: "daily",
        now,
        payload: {
          title: "Today's reflection",
          body: prompt.question,
          url: absoluteComposeUrl(prompt, "push-reminder"),
          tag: "daily-prompt",
          actions: [{ action: "open", title: "Write" }],
        },
      });

      if (delivery.sent > 0) {
        results.sent += 1;
        await User.updateOne({ _id: user._id }, { $set: { lastReminderSentOn: local.date } });
      } else {
        results.skipped += 1;
      }
    }

    return NextResponse.json({ success: true, checked: users.length, ...results });
  } catch (error: unknown) {
    console.error("Daily prompt notification error:", error);
    return NextResponse.json({ success: false, error: "Failed to send reminders" }, { status: 500 });
  }
}
