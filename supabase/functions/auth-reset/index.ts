import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

    let resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      const { data: secretRow } = await supabase
        .from("server_secrets")
        .select("value")
        .eq("key", "RESEND_API_KEY")
        .maybeSingle();
      resendKey = secretRow?.value || undefined;
    }

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
    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = Deno.env.get("APP_BASE_URL") || "https://mococha.nl";
    const redirectTo = redirect_to || `${baseUrl}/account/inloggen`;
    const isEn = lang === "en";

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
    const userName = linkData.user?.user_metadata?.full_name || "";
    const greeting = userName ? (isEn ? `Hi ${userName},` : `Hallo ${userName},`) : "";

    const subject = isEn ? "Reset your password — MOCOCHA" : "Wachtwoord herstellen — MOCOCHA";

    const htmlBody = `<!DOCTYPE html>
<html lang="${isEn ? "en" : "nl"}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#F5F1EB;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#F5F1EB;">${isEn ? "Set a new password" : "Stel een nieuw wachtwoord in"}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F1EB;">
    <tr><td align="center" style="padding:24px 16px 8px;">
      <img src="https://mococha.nl/mocochalogo.webp" alt="MOCOCHA" width="180" style="display:block;max-width:180px;height:auto;">
    </td></tr>
    <tr><td align="center" style="padding:8px 16px 40px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 1px 3px rgba(74,57,54,0.06);">
        <tr><td style="padding:48px;">
          <p style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#8B7E6B;margin:0 0 12px;">MOCOCHA</p>
          <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:400;color:#4A3936;margin:0 0 24px;line-height:1.25;">${isEn ? "Reset your password" : "Wachtwoord herstellen"}</h1>
          ${greeting ? `<p style="font-family:Georgia,serif;font-size:22px;color:#4A3936;margin:0 0 20px;font-weight:400;">${greeting}</p>` : ""}
          <p style="font-size:15px;line-height:1.6;color:#5C4F42;margin:0 0 16px;">
            ${isEn
              ? "We received a request to reset your password. Click the button below to choose a new one."
              : "We hebben een verzoek ontvangen om je wachtwoord te herstellen. Klik op de knop hieronder om een nieuw wachtwoord te kiezen."}
          </p>
          <p style="font-size:13px;color:#8B7E6B;margin:0 0 16px;">
            ${isEn ? "If you didn't request this, you can safely ignore this email." : "Heb je dit niet aangevraagd? Dan kun je deze e-mail veilig negeren."}
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
            <tr><td align="center" bgcolor="#4A3936" style="border-radius:12px;">
              <a href="${recoveryUrl}" style="display:inline-block;padding:16px 36px;font-size:15px;font-weight:500;color:#FAF8F5;text-decoration:none;border-radius:12px;">
                ${isEn ? "Reset password" : "Wachtwoord herstellen"}
              </a>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const textBody = isEn
      ? [
          greeting || "Hi,",
          "",
          "We received a request to reset your password. Click the link below to choose a new one:",
          recoveryUrl,
          "",
          "If you didn't request this, you can safely ignore this email.",
          "",
          "With kind regards,",
          "MOCOCHA",
        ].join("\n")
      : [
          greeting || "Hallo,",
          "",
          "We hebben een verzoek ontvangen om je wachtwoord te herstellen. Klik op de link hieronder om een nieuw wachtwoord te kiezen:",
          recoveryUrl,
          "",
          "Heb je dit niet aangevraagd? Dan kun je deze e-mail veilig negeren.",
          "",
          "Met vriendelijke groet,",
          "MOCOCHA",
        ].join("\n");

    const emailResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MOCOCHA <noreply@mococha.nl>",
        to: [email],
        subject,
        html: htmlBody,
        text: textBody,
      }),
    });

    let logStatus = "failed";
    let providerId: string | null = null;
    let errorMsg: string | null = null;

    if (emailResp.ok) {
      const result = await emailResp.json();
      logStatus = "sent";
      providerId = result.id || null;
    } else {
      errorMsg = await emailResp.text();
      console.error("Password reset email failed:", errorMsg);
    }

    // Log to email_log
    await supabase.from("email_log").insert({
      recipient: email,
      subject,
      template: "password_reset",
      provider_message_id: providerId,
      status: logStatus,
      error: errorMsg,
      sent_at: logStatus === "sent" ? new Date().toISOString() : null,
    });

    return new Response(JSON.stringify({
      success: true,
      email_status: logStatus,
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
