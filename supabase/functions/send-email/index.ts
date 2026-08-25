import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MOCOCHA_EMAIL = "info@mococha.nl";
const INSTAGRAM_URL = "https://www.instagram.com/mococha_events/";

function emailTemplate(opts: {
  preheader: string;
  title: string;
  greeting?: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  secondaryLinkLabel?: string;
  secondaryLinkUrl?: string;
}): string {
  const { preheader, title, greeting, bodyHtml, ctaLabel, ctaUrl, secondaryLinkLabel, secondaryLinkUrl } = opts;

  const ctaHtml = ctaLabel && ctaUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 8px;">
        <tr>
          <td align="center" bgcolor="#4A3936" style="border-radius:12px;">
            <a href="${ctaUrl}" style="display:inline-block;padding:16px 36px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:500;color:#FAF8F5;text-decoration:none;border-radius:12px;">${ctaLabel}</a>
          </td>
        </tr>
      </table>`
    : "";

  const secondaryHtml = secondaryLinkLabel && secondaryLinkUrl
    ? `<div style="text-align:center;margin-top:16px;">
        <a href="${secondaryLinkUrl}" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#8B7E6B;text-decoration:none;">${secondaryLinkLabel}</a>
       </div>`
    : "";

  const greetingHtml = greeting
    ? `<p style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#4A3936;margin:0 0 20px;font-weight:400;line-height:1.3;">${greeting}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light only">
  <title>${title}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#F5F1EB;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F5F1EB;opacity:0;">
    ${preheader}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F1EB;">
    <tr>
      <td align="center" style="padding:24px 16px 8px;">
        <img src="https://mococha.nl/mocochalogo.webp" alt="MOCOCHA" width="180" style="display:block;border:0;outline:none;text-decoration:none;max-width:180px;height:auto;">
      </td>
    </tr>
  </table>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F1EB;">
    <tr>
      <td align="center" style="padding:8px 16px 40px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 1px 3px rgba(74,57,54,0.06);">
          <tr>
            <td style="padding:48px 48px 40px;">
              <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#8B7E6B;margin:0 0 12px;">MOCOCHA</p>
              <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;color:#4A3936;margin:0 0 24px;line-height:1.25;">${title}</h1>
              ${greetingHtml}
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#5C4F42;">
                ${bodyHtml}
              </div>
              ${ctaHtml}
              ${secondaryHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F1EB;">
    <tr>
      <td align="center" style="padding:0 16px 48px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
          <tr>
            <td align="center" style="padding:0 24px;">
              <p style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#4A3936;margin:0 0 12px;letter-spacing:0.08em;">MOCOCHA</p>
              <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#8B7E6B;margin:0 0 16px;line-height:1.5;">
                Jouw feest, in één plek.<br>
                <a href="${INSTAGRAM_URL}" style="color:#8B7E6B;text-decoration:none;">@mococha_events</a> · <a href="mailto:${MOCOCHA_EMAIL}" style="color:#8B7E6B;text-decoration:none;">${MOCOCHA_EMAIL}</a>
              </p>
              <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#B5A99A;margin:0;line-height:1.5;">
                © ${new Date().getFullYear()} MOCOCHA — Alle rechten voorbehouden.<br>
                Je ontvangt deze e-mail omdat je een account hebt aangemaakt op mococha.nl.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

type EmailType =
  | "welcome"
  | "email_verification"
  | "password_reset"
  | "concept_saved"
  | "quotation_received"
  | "quotation_ready"
  | "payment_request"
  | "payment_received"
  | "new_message"
  | "event_reminder"
  | "delivery_info"
  | "contact_message";

function buildEmail(type: EmailType, lang: string, data: Record<string, string>): { subject: string; html: string } {
  const isEn = lang === "en";
  const baseUrl = Deno.env.get("APP_BASE_URL") || "https://mococha.nl";

  switch (type) {
    case "welcome":
      return {
        subject: isEn ? "Welcome to MOCOCHA" : "Welkom bij MOCOCHA",
        html: emailTemplate({
          preheader: isEn ? "Your party journey starts here" : "Jouw feestreis begint hier",
          title: isEn ? "Welcome to MOCOCHA" : "Welkom bij MOCOCHA",
          greeting: isEn ? `Hi ${data.name || "there"},` : `Hallo ${data.name || ""},`,
          bodyHtml: isEn
            ? `<p style="margin:0 0 16px;">We're delighted to have you. MOCOCHA helps you design your complete party — from concept to celebration.</p>
               <p style="margin:0 0 16px;">Start building your first concept, explore inspiration, or let us design something unique for you.</p>`
            : `<p style="margin:0 0 16px;">We zijn blij dat je er bent. MOCOCHA helpt je om jouw complete feest te ontwerpen — van concept tot viering.</p>
               <p style="margin:0 0 16px;">Begin met het bouwen van je eerste concept, bekijk inspiratie, of laat ons iets unieks voor je ontwerpen.</p>`,
          ctaLabel: isEn ? "Start building" : "Start met bouwen",
          ctaUrl: `${baseUrl}/bouwen`,
          secondaryLinkLabel: isEn ? "View inspiration" : "Bekijk inspiratie",
          secondaryLinkUrl: `${baseUrl}/inspiratie`,
        }),
      };

    case "email_verification":
      return {
        subject: isEn ? "Verify your email — MOCOCHA" : "Bevestig je e-mailadres — MOCOCHA",
        html: emailTemplate({
          preheader: isEn ? "Confirm your email address" : "Bevestig je e-mailadres",
          title: isEn ? "Verify your email" : "Bevestig je e-mailadres",
          greeting: isEn ? "Almost there," : "Bijna klaar,",
          bodyHtml: isEn
            ? `<p style="margin:0 0 16px;">Click the button below to confirm your email address and activate your MOCOCHA account.</p>`
            : `<p style="margin:0 0 16px;">Klik op de knop hieronder om je e-mailadres te bevestigen en je MOCOCHA-account te activeren.</p>`,
          ctaLabel: isEn ? "Verify email" : "E-mail bevestigen",
          ctaUrl: data.verify_url || `${baseUrl}/account/inloggen`,
        }),
      };

    case "password_reset":
      return {
        subject: isEn ? "Reset your password — MOCOCHA" : "Wachtwoord herstellen — MOCOCHA",
        html: emailTemplate({
          preheader: isEn ? "Set a new password" : "Stel een nieuw wachtwoord in",
          title: isEn ? "Reset your password" : "Wachtwoord herstellen",
          bodyHtml: isEn
            ? `<p style="margin:0 0 16px;">We received a request to reset your password. Click the button below to choose a new one.</p>
               <p style="margin:0 0 16px;font-size:13px;color:#8B7E6B;">If you didn't request this, you can safely ignore this email.</p>`
            : `<p style="margin:0 0 16px;">We hebben een verzoek ontvangen om je wachtwoord te herstellen. Klik op de knop hieronder om een nieuw wachtwoord te kiezen.</p>
               <p style="margin:0 0 16px;font-size:13px;color:#8B7E6B;">Heb je dit niet aangevraagd? Dan kun je deze e-mail veilig negeren.</p>`,
          ctaLabel: isEn ? "Reset password" : "Wachtwoord herstellen",
          ctaUrl: data.reset_url || `${baseUrl}/account/inloggen`,
        }),
      };

    case "concept_saved":
      return {
        subject: isEn ? "Your concept has been saved — MOCOCHA" : "Je concept is opgeslagen — MOCOCHA",
        html: emailTemplate({
          preheader: isEn ? "Your party concept is ready" : "Je feestconcept is klaar",
          title: isEn ? "Concept saved" : "Concept opgeslagen",
          greeting: isEn ? "Great progress!" : "Goed bezig!",
          bodyHtml: isEn
            ? `<p style="margin:0 0 16px;">Your concept <strong>${data.concept_name || ""}</strong> has been saved successfully.</p>
               <p style="margin:0 0 16px;">You can continue building anytime, request a quote, or share it with others.</p>`
            : `<p style="margin:0 0 16px;">Je concept <strong>${data.concept_name || ""}</strong> is succesvol opgeslagen.</p>
               <p style="margin:0 0 16px;">Je kunt op elk moment verder bouwen, een offerte aanvragen, of het delen met anderen.</p>`,
          ctaLabel: isEn ? "View concept" : "Concept bekijken",
          ctaUrl: `${baseUrl}/concepten/${data.concept_id || ""}`,
        }),
      };

    case "quotation_received":
      return {
        subject: isEn ? "Quote request received — MOCOCHA" : "Offerteaanvraag ontvangen — MOCOCHA",
        html: emailTemplate({
          preheader: isEn ? "We'll get back to you within 48 hours" : "We nemen binnen 48 uur contact op",
          title: isEn ? "Quote request received" : "Offerteaanvraag ontvangen",
          greeting: isEn ? "Thank you!" : "Bedankt!",
          bodyHtml: isEn
            ? `<p style="margin:0 0 16px;">We've received your quote request for <strong>${data.concept_name || "your concept"}</strong>.</p>
               <p style="margin:0 0 16px;">Our team will review it and contact you within 48 hours with a personalized quote.</p>
               <p style="margin:0 0 16px;font-size:13px;color:#8B7E6B;">Estimated total: €${data.total || "—"}</p>`
            : `<p style="margin:0 0 16px;">We hebben je offerteaanvraag ontvangen voor <strong>${data.concept_name || "je concept"}</strong>.</p>
               <p style="margin:0 0 16px;">Ons team bekijkt je aanvraag en neemt binnen 48 uur contact met je op met een persoonlijke offerte.</p>
               <p style="margin:0 0 16px;font-size:13px;color:#8B7E6B;">Geschat totaal: €${data.total || "—"}</p>`,
          ctaLabel: isEn ? "View concept" : "Concept bekijken",
          ctaUrl: `${baseUrl}/concepten/${data.concept_id || ""}`,
        }),
      };

    case "quotation_ready":
      return {
        subject: isEn ? "Your quote is ready — MOCOCHA" : "Je offerte is klaar — MOCOCHA",
        html: emailTemplate({
          preheader: isEn ? "Review your personalized quote" : "Bekijk je persoonlijke offerte",
          title: isEn ? "Your quote is ready" : "Je offerte is klaar",
          greeting: isEn ? "Great news!" : "Goed nieuws!",
          bodyHtml: isEn
            ? `<p style="margin:0 0 16px;">We've prepared a personalized quote for your party concept <strong>${data.concept_name || ""}</strong>.</p>
               <p style="margin:0 0 16px;">Review the details and confirm your booking by paying the deposit.</p>
               <p style="margin:0 0 16px;font-size:13px;color:#8B7E6B;">Total: €${data.total || "—"} · Deposit (30%): €${data.deposit || "—"}</p>`
            : `<p style="margin:0 0 16px;">We hebben een persoonlijke offerte voor je feestconcept <strong>${data.concept_name || ""}</strong> voorbereid.</p>
               <p style="margin:0 0 16px;">Bekijk de details en bevestig je boeking door de aanbetaling te betalen.</p>
               <p style="margin:0 0 16px;font-size:13px;color:#8B7E6B;">Totaal: €${data.total || "—"} · Aanbetaling (30%): €${data.deposit || "—"}</p>`,
          ctaLabel: isEn ? "View quote" : "Offerte bekijken",
          ctaUrl: `${baseUrl}/concepten/${data.concept_id || ""}`,
        }),
      };

    case "payment_request":
      return {
        subject: isEn ? "Payment request — MOCOCHA" : "Betaalverzoek — MOCOCHA",
        html: emailTemplate({
          preheader: isEn ? "Complete your booking" : "Voltooi je boeking",
          title: isEn ? "Payment request" : "Betaalverzoek",
          bodyHtml: isEn
            ? `<p style="margin:0 0 16px;">A payment of <strong>€${data.amount || "—"}</strong> is requested for your party concept <strong>${data.concept_name || ""}</strong>.</p>
               <p style="margin:0 0 16px;">Click below to complete your payment securely via Mollie.</p>`
            : `<p style="margin:0 0 16px;">Er staat een betaling van <strong>€${data.amount || "—"}</strong> open voor je feestconcept <strong>${data.concept_name || ""}</strong>.</p>
               <p style="margin:0 0 16px;">Klik hieronder om veilig te betalen via Mollie.</p>`,
          ctaLabel: isEn ? "Pay now" : "Nu betalen",
          ctaUrl: data.payment_url || `${baseUrl}/concepten/${data.concept_id || ""}`,
        }),
      };

    case "payment_received":
      return {
        subject: isEn ? "Payment received — MOCOCHA" : "Betaling ontvangen — MOCOCHA",
        html: emailTemplate({
          preheader: isEn ? "Your deposit has been confirmed" : "Je aanbetaling is bevestigd",
          title: isEn ? "Payment received" : "Betaling ontvangen",
          greeting: isEn ? "Wonderful!" : "Geweldig!",
          bodyHtml: isEn
            ? `<p style="margin:0 0 16px;">We've received your payment of <strong>€${data.amount || "—"}</strong> for <strong>${data.concept_name || "your concept"}</strong>.</p>
               <p style="margin:0 0 16px;">Your booking is now confirmed. We'll be in touch with further details about your party.</p>`
            : `<p style="margin:0 0 16px;">We hebben je betaling van <strong>€${data.amount || "—"}</strong> ontvangen voor <strong>${data.concept_name || "je concept"}</strong>.</p>
               <p style="margin:0 0 16px;">Je boeking is nu bevestigd. We nemen contact met je op over de verdere details van je feest.</p>`,
          ctaLabel: isEn ? "View concept" : "Concept bekijken",
          ctaUrl: `${baseUrl}/concepten/${data.concept_id || ""}`,
        }),
      };

    case "new_message":
      return {
        subject: isEn ? "New message from MOCOCHA" : "Nieuw bericht van MOCOCHA",
        html: emailTemplate({
          preheader: isEn ? "You have a new message" : "Je hebt een nieuw bericht",
          title: isEn ? "New message" : "Nieuw bericht",
          greeting: isEn ? `Hi ${data.name || ""},` : `Hallo ${data.name || ""},`,
          bodyHtml: isEn
            ? `<p style="margin:0 0 16px;">You have received a new message from MOCOCHA:</p>
               <div style="background-color:#F5F1EB;border-radius:12px;padding:20px;margin:16px 0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;line-height:1.6;color:#5C4F42;">${data.message_preview || ""}</div>`
            : `<p style="margin:0 0 16px;">Je hebt een nieuw bericht ontvangen van MOCOCHA:</p>
               <div style="background-color:#F5F1EB;border-radius:12px;padding:20px;margin:16px 0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;line-height:1.6;color:#5C4F42;">${data.message_preview || ""}</div>`,
          ctaLabel: isEn ? "Read message" : "Bericht lezen",
          ctaUrl: `${baseUrl}/account/berichten`,
        }),
      };

    case "event_reminder":
      return {
        subject: isEn ? "Your party is coming up — MOCOCHA" : "Je feest komt eraan — MOCOCHA",
        html: emailTemplate({
          preheader: isEn ? "See you soon!" : "Tot snel!",
          title: isEn ? "Your party is coming up" : "Je feest komt eraan",
          greeting: isEn ? "Almost time!" : "Bijna zover!",
          bodyHtml: isEn
            ? `<p style="margin:0 0 16px;">This is a friendly reminder that your MOCOCHA party is scheduled for <strong>${data.event_date || "soon"}</strong>.</p>
               <p style="margin:0 0 16px;">We're looking forward to making it unforgettable. If you have any last-minute questions, don't hesitate to reach out.</p>`
            : `<p style="margin:0 0 16px;">Dit is een vriendelijke herinnering dat je MOCOCHA-feest gepland staat voor <strong>${data.event_date || "binnenkort"}</strong>.</p>
               <p style="margin:0 0 16px;">We kijken ernaar uit om het onvergetelijk te maken. Heb je nog last-minute vragen? Aarzel niet om contact op te nemen.</p>`,
          ctaLabel: isEn ? "View concept" : "Concept bekijken",
          ctaUrl: `${baseUrl}/concepten/${data.concept_id || ""}`,
        }),
      };

    case "delivery_info":
      return {
        subject: isEn ? "Delivery & setup information — MOCOCHA" : "Levering en opbouw informatie — MOCOCHA",
        html: emailTemplate({
          preheader: isEn ? "Everything you need to know" : "Alles wat je moet weten",
          title: isEn ? "Delivery & setup" : "Levering en opbouw",
          greeting: isEn ? "Here's the plan," : "Hier is het plan,",
          bodyHtml: isEn
            ? `<p style="margin:0 0 16px;">For your party on <strong>${data.event_date || ""}</strong>, here are the delivery and setup details:</p>
               <p style="margin:0 0 8px;"><strong>Address:</strong> ${data.address || "—"}</p>
               <p style="margin:0 0 8px;"><strong>Setup time:</strong> ${data.setup_time || "—"}</p>
               <p style="margin:0 0 16px;"><strong>Contact:</strong> ${data.contact_phone || MOCOCHA_EMAIL}</p>
               <p style="margin:0 0 16px;font-size:13px;color:#8B7E6B;">Please ensure someone is available at the address during setup. If anything changes, let us know as soon as possible.</p>`
            : `<p style="margin:0 0 16px;">Voor je feest op <strong>${data.event_date || ""}</strong> zijn hier de details voor levering en opbouw:</p>
               <p style="margin:0 0 8px;"><strong>Adres:</strong> ${data.address || "—"}</p>
               <p style="margin:0 0 8px;"><strong>Opbouwtijd:</strong> ${data.setup_time || "—"}</p>
               <p style="margin:0 0 16px;"><strong>Contact:</strong> ${data.contact_phone || MOCOCHA_EMAIL}</p>
               <p style="margin:0 0 16px;font-size:13px;color:#8B7E6B;">Zorg ervoor dat er iemand aanwezig is op het adres tijdens de opbouw. Als er iets verandert, laat het ons zo snel mogelijk weten.</p>`,
          ctaLabel: isEn ? "View concept" : "Concept bekijken",
          ctaUrl: `${baseUrl}/concepten/${data.concept_id || ""}`,
        }),
      };

    case "contact_message":
      return {
        subject: isEn ? `New contact message: ${data.subject || ""}` : `Nieuw contactbericht: ${data.subject || ""}`,
        html: emailTemplate({
          preheader: isEn ? "A customer sent a message" : "Een klant heeft een bericht gestuurd",
          title: isEn ? "New contact message" : "Nieuw contactbericht",
          bodyHtml: isEn
            ? `<p style="margin:0 0 12px;"><strong>From:</strong> ${data.reply_email || "—"}</p>
               <p style="margin:0 0 12px;"><strong>Subject:</strong> ${data.subject || "—"}</p>
               ${data.concept_ref ? `<p style="margin:0 0 12px;"><strong>Concept:</strong> ${data.concept_ref}</p>` : ""}
               <div style="background-color:#F5F1EB;border-radius:12px;padding:20px;margin:16px 0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;line-height:1.6;color:#5C4F42;">${data.message || ""}</div>`
            : `<p style="margin:0 0 12px;"><strong>Van:</strong> ${data.reply_email || "—"}</p>
               <p style="margin:0 0 12px;"><strong>Onderwerp:</strong> ${data.subject || "—"}</p>
               ${data.concept_ref ? `<p style="margin:0 0 12px;"><strong>Concept:</strong> ${data.concept_ref}</p>` : ""}
               <div style="background-color:#F5F1EB;border-radius:12px;padding:20px;margin:16px 0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;line-height:1.6;color:#5C4F42;">${data.message || ""}</div>`,
        }),
      };

    default:
      return {
        subject: "MOCOCHA",
        html: emailTemplate({ preheader: "", title: "MOCOCHA", bodyHtml: "" }),
      };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type, to, lang, data, bcc_mococha } = body;

    if (!type || !to) {
      return new Response(JSON.stringify({ error: "Missing required fields: type, to" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let resendKey = Deno.env.get("RESEND_API_KEY");

    if (!resendKey) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: secretRow } = await supabase
        .from("server_secrets")
        .select("value")
        .eq("key", "RESEND_API_KEY")
        .maybeSingle();
      resendKey = secretRow?.value || undefined;
    }

    if (!resendKey) {
      return new Response(JSON.stringify({
        error: "RESEND_API_KEY is not configured.",
        email_status: "failed",
        missing_config: ["RESEND_API_KEY"],
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, html } = buildEmail(type as EmailType, lang || "nl", data || {});

    const emailPayload: Record<string, unknown> = {
      from: "MOCOCHA <noreply@mococha.nl>",
      to: [to],
      subject,
      html,
    };

    if (bcc_mococha) {
      emailPayload.bcc = [MOCOCHA_EMAIL];
    }

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Email send failed:", resp.status, errText);
      return new Response(JSON.stringify({
        error: `Email sending failed (${resp.status})`,
        email_status: "failed",
        detail: errText,
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await resp.json();

    return new Response(JSON.stringify({
      success: true,
      email_status: "sent",
      message_id: result.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message,
      email_status: "failed",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
