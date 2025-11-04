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

    // Build an absolute logo URL if possible (requires NEXT_PUBLIC_APP_URL)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const logoUrl = appUrl ? `${appUrl.replace(/\/$/, "")}/logo.png` : null;
    const logoImg = logoUrl
      ? `<img src="${logoUrl}" alt="SolDegen" width="120" height="120" style="display:block;border:0;outline:none;text-decoration:none;margin:0 auto 12px;border-radius:16px" />`
      : "";

    // Branded HTML with grid background
    const html = `
      <div style="
        background:#0b1020;
        padding:40px 0;
        width:100%;
        font-family:Arial, sans-serif;
        -webkit-font-smoothing:antialiased;
        -moz-osx-font-smoothing:grayscale;
        background-image:
          linear-gradient(to right, rgba(124,58,237,0.12) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(124,58,237,0.12) 1px, transparent 1px);
        background-size:24px 24px;
        background-position:center center;
      ">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0 auto">
                <tr>
                  <td style="
                    background: #7c3aed;
                    padding: 20px 24px;
                    color: #ffffff;
                    font-size: 22px;
                    font-weight: 700;
                    text-align: center;
                    border-top-left-radius: 16px;
                    border-top-right-radius: 16px;
                  ">
                    ${logoImg}
                    SolDegen
                  </td>
                </tr>
                <tr>
                  <td style="
                    background:#0b1020;
                    height: 16px;
                  "></td>
                </tr>
                <tr>
                  <td style="
                    background:#ffffff;
                    padding:32px;
                    border-bottom-left-radius:16px;
                    border-bottom-right-radius:16px;
                    color:#0f172a;
                    box-shadow:0 10px 20px rgba(12, 16, 32, 0.35);
                  ">
                    <h2 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#0f172a">You're on the waitlist 🎉</h2>
                    <p style="margin:0 0 12px;font-size:16px;color:#334155">
                      Thanks for signing up! You're officially on the SolDegen waitlist. We'll keep you posted with updates and early access to Crash and Plinko.
                    </p>
                    <p style="margin:0 0 12px;font-size:16px;color:#334155">
                      In the meantime, stay tuned—degen times ahead.
                    </p>
                    <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0"/>
                    <p style="margin:0;font-size:12px;color:#64748b">
                      If you didn't request this, you can ignore this email.
                    </p>
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