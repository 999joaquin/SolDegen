import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

async function sendThanksEmail(toEmail: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY")
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL")

  if (!resendApiKey || !fromEmail) {
    return { ok: false, error: "Email service not configured (missing RESEND_API_KEY or RESEND_FROM_EMAIL)" }
  }

  const subject = "You're on the SolDegen waitlist 🎉"
  const text = `Thanks for signing up!

You're officially on the SolDegen waitlist. We'll keep you posted with updates and early access to Crash and Plinko.

If you didn't request this, you can ignore this email.`

  // Branded HTML email (inline styles for compatibility)
  const html = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#0b1020; padding: 24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
            <tr>
              <td style="background:#7c3aed; padding:24px 32px; color:#ffffff; font-family: Arial, sans-serif; font-size:22px; font-weight:700; text-align:center; border-top-left-radius:12px; border-top-right-radius:12px;">
                SolDegen
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff; padding:32px; border-bottom-left-radius:12px; border-bottom-right-radius:12px; font-family: Arial, sans-serif; color:#0f172a;">
                <h2 style="margin:0 0 12px; font-size:20px; line-height:1.3; color:#0f172a;">You're on the waitlist 🎉</h2>
                <p style="margin:0 0 12px; font-size:16px; color:#334155;">
                  Thanks for signing up! You're officially on the SolDegen waitlist. We'll keep you posted with updates and early access to Crash and Plinko.
                </p>
                <p style="margin:0 0 12px; font-size:16px; color:#334155;">
                  In the meantime, stay tuned—degen times ahead.
                </p>
                <hr style="border:none; border-top:1px solid #e2e8f0; margin:16px 0" />
                <p style="margin:0; font-size:12px; color:#64748b;">
                  If you didn't request this, you can ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="height:32px"></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `

  const payload = {
    from: `SolDegen <${fromEmail}>`,
    to: [toEmail],
    subject,
    text,
    html,
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const details = await res.text()
    return { ok: false, error: `Failed to send email: ${details}` }
  }

  return { ok: true }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase env" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const body = await req.json().catch(() => null)
  const rawEmail = typeof body?.email === "string" ? body.email.trim() : ""

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)
  if (!isValidEmail) {
    return new Response(JSON.stringify({ error: "Invalid email" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const client = createClient(supabaseUrl, supabaseServiceKey)
  const { error } = await client
    .from("waitlist")
    .upsert({ email: rawEmail }, { onConflict: "email", ignoreDuplicates: true })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const emailResult = await sendThanksEmail(rawEmail)
  const responseBody = emailResult.ok
    ? { ok: true }
    : { ok: true, emailWarning: emailResult.error }

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})