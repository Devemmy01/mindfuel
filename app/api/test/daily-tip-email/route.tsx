import { NextResponse } from "next/server";
import { resend } from "@/lib/resend";
import { DailyTipEmail } from "@/emails/DailyTipEmail";
import React from "react";

export async function GET() {
  const email = "emmanx25@gmail.com";
  const name = "Emmanuel";
  const tip = "Nature does not hurry, yet everything is accomplished.";

  try {
    const { data, error } = await resend.emails.send({
      from: "MindFuel <noreply@mind-fuel.app>",
      to: email,
      subject: "Final Test: Your Mindful Tip",
      react: (
        <DailyTipEmail name={name} tip={tip} />
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
