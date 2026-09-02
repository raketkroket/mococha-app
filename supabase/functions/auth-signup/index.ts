import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createMocochaEmail, escapeHtml, getLanguage, getResendApiKey, getSafeRedirectUrl, isValidEmail, sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const { email, password, lang, redirect_to } = await req.json();
    if (!isValidEmail(email) || typeof password !== "string" || password.length < 6 || password.length > 72) {
      return new Response(JSON.stringify({ error: "Gebruik een geldig e-mailadres en een wachtwoord van minimaal 6 tekens." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const resendKey = await getResendApiKey(supabase);
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "E-mailservice is niet geconfigureerd." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const language = getLanguage(lang);
    const isEn = language === "en";
    const redirectTo = getSafeRedirectUrl(redirect_to, "/account");
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: { redirectTo },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("signup link generation failed:", linkError?.message);
      return new Response(JSON.stringify({ error: linkError?.message || "Account aanmaken is mislukt." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = isEn ? "Confirm your email address - MOCOCHA" : "Bevestig je e-mailadres - MOCOCHA";
    const message = isEn
      ? "Welcome to MOCOCHA. Confirm your email address to activate your account."
      : "Welkom bij MOCOCHA. Bevestig je e-mailadres om je account te activeren.";
    const content = createMocochaEmail({
      previewText: isEn ? "Activate your MOCOCHA account" : "Activeer je MOCOCHA-account",
      title: isEn ? "Confirm your email" : "Bevestig je e-mailadres",
      greeting: isEn ? "Almost there," : "Bijna klaar,",
      contentHtml: `<p style="margin:0;">${escapeHtml(message)}</p>`,
      contentText: message,
      buttonText: isEn ? "Confirm email" : "E-mail bevestigen",
      buttonUrl: linkData.properties.action_link,
      lang: language,
    });
    const delivery = await sendEmail(resendKey, { to: email, subject, ...content });

    await supabase.from("email_log").insert({
      recipient: email,
      subject,
      template: "email_verification",
      provider_message_id: delivery.messageId,
      status: delivery.ok ? "sent" : "failed",
      error: delivery.error,
      sent_at: delivery.ok ? new Date().toISOString() : null,
    });

    if (!delivery.ok) {
      return new Response(JSON.stringify({ error: "Bevestigingsmail kon niet worden verstuurd. Probeer het opnieuw." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("auth-signup error:", error instanceof Error ? error.message : error);
    return new Response(JSON.stringify({ error: "Account aanmaken is mislukt." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});