import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";
import { resend } from "@/lib/resend";
import { WelcomeEmail } from "@/emails/WelcomeEmail";
import React from "react";


export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const { firebaseId, email, name, image } = await req.json();

    if (!firebaseId || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Upsert user, returns original document if new: false
    // If null, it means a new user was created
    const user = await User.findOneAndUpdate(
      { firebaseId },
      { 
        $set: { email },
        $setOnInsert: { 
          name, 
          image: image || "",
          preferences: { dailyEmail: true, notifications: true },
          pushSubscriptions: []
        } 
      },
      { upsert: true, new: false }
    );

    // If user is null, it's a new signup
    if (!user && email) {
      try {
        await resend.emails.send({
          from: 'MindFuel <hello@mind-fuel.app>',
          to: email,
          subject: 'Welcome to MindFuel',
          react: (<WelcomeEmail name={name || 'Explorer'} />) as React.ReactElement,
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }
    }

    return NextResponse.json({ user: user || { firebaseId, email, name } }, { status: 200 });

  } catch (error: unknown) {
    console.error("Auth sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to sync auth", message: errorMessage },
      { status: 500 }
    );
  }
}
