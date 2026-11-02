import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/api-auth";
import { resend } from "@/lib/resend";
import { DailyTipEmail } from "@/emails/DailyTipEmail";
import React from "react";
import { THEMES, poolFor, subjectFor } from "@/lib/daily-fuel";
import { getTodayPrompt } from "@/lib/dailyPrompts";
import { absoluteComposeUrl } from "@/lib/links";

export async function GET(req: NextRequest) {
  // Sends a real email, so it requires the same secret as the cron routes.
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = "emmanx25@gmail.com";
  const name = "Emmanuel";
  // ?day=0..6 previews that weekday's format (0 = Sunday Reset); default today.
  const dayParam = Number(req.nextUrl.searchParams.get("day"));
  const theme = THEMES[Number.isInteger(dayParam) && dayParam >= 0 && dayParam <= 6 ? dayParam : new Date().getUTCDay()];
  const item = poolFor(theme)[0];
  const prompt = getTodayPrompt();

  try {
    const { data, error } = await resend.emails.send({
      from: "MindFuel <hello@mind-fuel.app>",
      to: email,
      subject: `[Test] ${subjectFor(theme, item)}`,
      react: (
        <DailyTipEmail
          name={name}
          themeLabel={theme.label}
          kicker={theme.kicker}
          title={item.title}
          body={item.body}
          extra={item.extra}
          wordStyle={theme.key === "word"}
          promptQuestion={prompt.question}
          ctaLabel={theme.cta}
          writeUrl={absoluteComposeUrl(prompt, "email-tip")}
          streakLine="You're on a 4-day streak. Keep the flame lit today."
          communityLine="27 people shared a reflection yesterday. Yours could be next."
        />
      ) as React.ReactElement,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ message: "Test email sent successfully", data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
