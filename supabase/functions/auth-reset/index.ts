import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createMocochaEmail, escapeHtml, getLanguage, getResendApiKey, getSafeRedirectUrl, isValidEmail, sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const resendKey = await getResendApiKey(supabase);

    if (!resendKey) {
      return new Response(JSON.stringify({
        error: "Email service not configured.",
        email_status: "failed",
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, lang, redirect_to } = await req.json();
    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const language = getLanguage(lang);
    const isEn = language === "en";
    const redirectTo = getSafeRedirectUrl(redirect_to, "/account/inloggen");

    // Generate a recovery link WITHOUT sending Supabase's built-in email
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      email,
      type: "recovery",
      options: { redirectTo },
    });

    // Always return success-like response to avoid leaking which emails exist
    if (linkError || !linkData) {
      console.error("generateLink failed:", linkError?.message);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recoveryUrl = linkData.properties?.action_link || redirectTo;
    const userName = typeof linkData.user?.user_metadata?.full_name === "string" ? linkData.user.user_metadata.full_name : "";
    const greeting = userName ? (isEn ? `Hi ${userName},` : `Hallo ${userName},`) : undefined;

    const subject = isEn ? "Reset your password — MOCOCHA" : "Wachtwoord herstellen — MOCOCHA";
    const message = isEn
      ? "We received a request to reset your password. Click the button below to choose a new one."
      : "We hebben een verzoek ontvangen om je wachtwoord te herstellen. Klik op de knop hieronder om een nieuw wachtwoord te kiezen.";
    const notice = isEn ? "If you didn't request this, you can safely ignore this email." : "Heb je dit niet aangevraagd? Dan kun je deze e-mail veilig negeren.";
    const content = createMocochaEmail({
      previewText: isEn ? "Set a new password" : "Stel een nieuw wachtwoord in",
      title: isEn ? "Reset your password" : "Wachtwoord herstellen",
      greeting,
      contentHtml: `<p style="margin:0 0 16px;">${escapeHtml(message)}</p><p style="margin:0;color:#8B7E6B;font-size:13px;">${escapeHtml(notice)}</p>`,
      contentText: `${message}\n\n${notice}`,
      buttonText: isEn ? "Reset password" : "Wachtwoord herstellen",
      buttonUrl: recoveryUrl,
      lang: language,
    });
    const delivery = await sendEmail(resendKey, { to: email, subject, ...content });

    // Log to email_log
    await supabase.from("email_log").insert({
      recipient: email,
      subject,
      template: "password_reset",
      provider_message_id: delivery.messageId,
      status: delivery.ok ? "sent" : "failed",
      error: delivery.error,
      sent_at: delivery.ok ? new Date().toISOString() : null,
    });

    return new Response(JSON.stringify({
      success: true,
      email_status: delivery.ok ? "sent" : "failed",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("auth-reset error:", err.message);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
