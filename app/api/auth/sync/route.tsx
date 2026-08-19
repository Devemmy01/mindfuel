import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User, { IUser } from "@/models/user";
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
        { status: 400 },
      );
    }

    // Upsert user, returning the newly created or updated document
    const user = await User.findOneAndUpdate(
      { firebaseId },
      {
        $set: { email },
        $setOnInsert: {
          name,
          image: image || "",
          preferences: { dailyEmail: true, notifications: true },
          pushSubscriptions: [],
        },
      },
      { upsert: true, new: true, runValidators: true }
    ).lean() as IUser | null;

    // Determine if this is a new signup by comparing createdAt and updatedAt.
    // If they are identical (or very close), the doc was just created.
    const isNewSignup = 
      user && 
      user.createdAt && 
      user.updatedAt && 
      new Date(user.updatedAt).getTime() - new Date(user.createdAt).getTime() < 2000;

    if (isNewSignup && email) {
      try {
        const { error } = await resend.emails.send({
          from: "MindFuel <hello@mind-fuel.app>",
          to: email,
          subject: "Welcome to MindFuel",
          react: (
            <WelcomeEmail name={name || "Explorer"} />
          ) as React.ReactElement,
        });

        if (error) {
          console.error("Resend welcome email error:", error);
        }
      } catch (emailError) {
        console.error("Failed to send welcome email (exception):", emailError);
      }
    }

    return NextResponse.json(
      { user },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Auth sync error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to sync auth", message: errorMessage },
      { status: 500 },
    );
  }
}
