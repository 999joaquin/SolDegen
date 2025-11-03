import { NextResponse } from "next/server";
import { Resend } from "resend";
import WaitlistThanks from "../../../../emails/WaitlistThanks";
import React from "react";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({} as { email?: string }));

  if (typeof email !== "string" || !emailRegex.test(email.trim())) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    return NextResponse.json(
      { 
        error: "Email service not configured",
        details: {
          RESEND_API_KEY_present: Boolean(apiKey),
          RESEND_FROM_EMAIL_present: Boolean(fromEmail),
        }
      },
      { status: 500 }
    );
  }

  const resend = new Resend(apiKey);
  const subject = "You're on the SolDegen waitlist 🎉";

  const emailElement = React.createElement(WaitlistThanks, {});
  const { error } = await resend.emails.send({
    from: `SolDegen <${fromEmail}>`,
    to: email.trim(),
    subject,
    react: emailElement,
  });

  if (error) {
    console.error("Resend email error:", error);
    return NextResponse.json({ error: error.message || "Failed to send email" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}