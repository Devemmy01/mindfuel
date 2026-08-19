import { NextRequest, NextResponse } from "next/server";
import { resend } from "@/lib/resend";

export const dynamic = "force-dynamic";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Resend has no inbox UI of its own — inbound mail only shows up in the
// dashboard's Receiving tab. This forwards every message Resend receives at
// mind-fuel.app into a real inbox, with Reply-To set to the original sender
// so replying from that inbox reaches them directly.
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const forwardTo = process.env.SUPPORT_INBOX_EMAIL;

  if (!webhookSecret || !forwardTo) {
    console.error(
      "resend-inbound webhook is missing RESEND_WEBHOOK_SECRET or SUPPORT_INBOX_EMAIL",
    );
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const payload = await req.text();
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing signature headers" }, { status: 400 });
  }

  let event;
  try {
    event = resend.webhooks.verify({
      payload,
      headers: { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
      webhookSecret,
    });
  } catch (error) {
    console.error("Invalid Resend webhook signature:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ received: true });
  }

  try {
    const { data: email, error } = await resend.emails.receiving.get(
      event.data.email_id,
    );
    if (error || !email) {
      throw new Error(error?.message || "Failed to fetch received email");
    }

    const from = email.from;
    const to = email.to.join(", ");
    const subject = email.subject || "(no subject)";
    const attachmentNote = email.attachments.length
      ? `\n\n(${email.attachments.length} attachment${email.attachments.length > 1 ? "s" : ""} — view in the Resend dashboard under Emails > Receiving.)`
      : "";

    await resend.emails.send({
      from: "MindFuel <hello@mind-fuel.app>",
      to: forwardTo,
      replyTo: from,
      subject: `[MindFuel inbox] ${subject}`,
      text: `From: ${from}\nTo: ${to}\n\n${email.text || "(no plain-text body)"}${attachmentNote}`,
      html: `<p><b>From:</b> ${escapeHtml(from)}<br><b>To:</b> ${escapeHtml(to)}</p><hr>${
        email.html || `<pre>${escapeHtml(email.text || "(no body)")}</pre>`
      }${attachmentNote ? `<p>${escapeHtml(attachmentNote)}</p>` : ""}`,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Failed to forward inbound email:", error);
    return NextResponse.json({ error: "Failed to forward email" }, { status: 500 });
  }
}
