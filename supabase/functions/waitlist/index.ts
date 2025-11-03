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
  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.6; color:#111">
      <h2 style="margin:0 0 12px">Thanks for signing up!</h2>
      <p>You're officially on the SolDegen waitlist. We'll keep you posted with updates and early access to Crash and Plinko.</p>
      <p>In the meantime, stay tuned—degen times ahead.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0" />
      <p style="font-size:12px;color:#666;margin:0">If you didn't request this, you can ignore this email.</p>
    </div>
  `
  const payload = {
    from: fromEmail,
    to: [toEmail],
    subject,
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
  if (!emailResult.ok) {
    return new Response(JSON.stringify({ error: emailResult.error }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})