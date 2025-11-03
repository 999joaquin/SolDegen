import { NextResponse } from "next/server";
import { Resend } from "resend";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
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

    const subject = "You're on the SolDegen waitlist 🎉";
    const resend = new Resend(apiKey);

    // Simple HTML body (no React rendering involved)
    const html = `
      <div style="background:#0b1020;padding:24px 0;width:100%;font-family:Arial,sans-serif">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0 auto">
                <tr>
                  <td style="background:#7c3aed;padding:24px 32px;color:#fff;font-size:22px;font-weight:700;text-align:center;border-top-left-radius:12px;border-top-right-radius:12px">
                    SolDegen
                  </td>
                </tr>
                <tr>
                  <td style="background:#fff;padding:32px;border-bottom-left-radius:12px;border-bottom-right-radius:12px;color:#0f172a">
                    <h2 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#0f172a">You're on the waitlist 🎉</h2>
                    <p style="margin:0 0 12px;font-size:16px;color:#334155">Thanks for signing up! You're officially on the SolDegen waitlist. We'll keep you posted with updates and early access to Crash and Plinko.</p>
                    <p style="margin:0 0 12px;font-size:16px;color:#334155">In the meantime, stay tuned—degen times ahead.</p>
                    <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0"/>
                    <p style="margin:0;font-size:12px;color:#64748b">If you didn't request this, you can ignore this email.</p>
                  </td>
                </tr>
                <tr><td style="height:32px"></td></tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;

    const { error } = await resend.emails.send({
      from: `SolDegen <${fromEmail}>`,
      to: email.trim(),
      subject,
      html,
    });

    if (error) {
      console.error("Resend email error:", error);
      return NextResponse.json({ error: error.message || "Failed to send email" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Email route unexpected error:", err);
    return NextResponse.json(
      { 
        error: err?.message ? String(err.message) : "Unexpected error in email route",
        details: typeof err?.message === "string" ? err.message : String(err)
      }, 
      { status: 500 }
    );
  }
}