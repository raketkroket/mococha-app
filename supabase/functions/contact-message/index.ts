import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MOCOCHA_EMAIL = "info@mococha.nl";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const baseUrl = Deno.env.get("APP_BASE_URL") || "https://mococha.nl";

    const body = await req.json();
    const {
      user_id,
      reply_email,
      subject,
      message,
      concept_id,
      concept_name,
      category,
      lang,
    } = body;

    if (!subject || !message || !reply_email) {
      return new Response(JSON.stringify({ error: "Missing required fields: subject, message, reply_email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Save to contact_messages table
    const { error: contactError } = await supabase.from("contact_messages").insert({
      user_id: user_id || null,
      subject: subject.trim(),
      message: message.trim(),
      reply_email: reply_email.trim(),
      concept_id: concept_id || null,
      consent: true,
      status: "new",
    });

    if (contactError) {
      console.error("Failed to save contact message:", contactError);
    }

    // 2. Create or update conversation
    let conversationId: string | null = null;

    if (user_id) {
      // Check if there's an existing open conversation for this user+concept
      const convQuery = supabase
        .from("conversations")
        .select("id, status")
        .eq("user_id", user_id)
        .eq("status", "open")
        .order("last_message_at", { ascending: false })
        .limit(1);

      const { data: existingConv } = concept_id
        ? await convQuery.eq("concept_id", concept_id).maybeSingle()
        : await convQuery.is("concept_id", null).maybeSingle();

      if (existingConv) {
        conversationId = existingConv.id;
        await supabase.from("conversations").update({
          last_message_at: new Date().toISOString(),
          unread_by_admin: true,
          subject: subject.trim(),
        }).eq("id", conversationId);
      } else {
        const { data: newConv, error: convError } = await supabase.from("conversations").insert({
          user_id,
          subject: subject.trim(),
          category: category || (concept_id ? "concept_question" : "general"),
          concept_id: concept_id || null,
          status: "open",
          unread_by_admin: true,
          last_message_at: new Date().toISOString(),
        }).select().maybeSingle();

        if (convError) {
          console.error("Failed to create conversation:", convError);
        } else {
          conversationId = newConv?.id ?? null;
        }
      }

      // 3. Insert the message into conversation_messages
      if (conversationId) {
        const { error: msgError } = await supabase.from("conversation_messages").insert({
          conversation_id: conversationId,
          sender: "user",
          author_id: user_id,
          body: message.trim(),
          email_status: resendKey ? "pending" : "not_applicable",
        });

        if (msgError) {
          console.error("Failed to insert conversation message:", msgError);
        }
      }
    }

    // 4. Send email to MOCOCHA
    let emailStatus = "not_applicable";

    if (resendKey) {
      const conceptRef = concept_name ? ` "${concept_name}"` : "";

      const emailResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "MOCOCHA <noreply@mococha.nl>",
          to: [MOCOCHA_EMAIL],
          reply_to: reply_email,
          subject: `Contact: ${subject.trim()}${conceptRef}`,
          text: [
            `Van: ${reply_email}`,
            `Onderwerp: ${subject.trim()}`,
            concept_name ? `Concept: ${concept_name}` : null,
            "",
            message.trim(),
          ].filter(Boolean).join("\n"),
        }),
      });

      const internalResult = emailResp.ok ? await emailResp.json() : null;
      const internalError = emailResp.ok ? null : await emailResp.text();
      if (internalError) console.error("Contact email failed:", internalError);
      emailStatus = emailResp.ok ? "sent" : "failed";

      // Log internal email
      await supabase.from("email_log").insert({
        recipient: MOCOCHA_EMAIL,
        subject: `Contact: ${subject.trim()}${conceptRef}`,
        template: "contact_message",
        concept_id: concept_id || null,
        provider_message_id: internalResult?.id || null,
        status: emailResp.ok ? "sent" : "failed",
        error: internalError,
        sent_at: emailResp.ok ? new Date().toISOString() : null,
      });

      // 5. Send confirmation email to the customer
      if (reply_email.toLowerCase() !== MOCOCHA_EMAIL) {
        const isEn = lang === "en";
        const confirmResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "MOCOCHA <noreply@mococha.nl>",
            to: [reply_email],
            subject: isEn ? "We've received your message — MOCOCHA" : "We hebben je bericht ontvangen — MOCOCHA",
            text: isEn
              ? [
                  "Thank you for your message!",
                  "",
                  "We've received your message and will get back to you as soon as possible.",
                  "",
                  `Subject: ${subject.trim()}`,
                  "",
                  "With kind regards,",
                  "MOCOCHA",
                ].join("\n")
              : [
                  "Bedankt voor je bericht!",
                  "",
                  "We hebben je bericht ontvangen en nemen zo snel mogelijk contact met je op.",
                  "",
                  `Onderwerp: ${subject.trim()}`,
                  "",
                  "Met vriendelijke groet,",
                  "MOCOCHA",
                ].join("\n"),
          }),
        });

        const confirmResult = confirmResp.ok ? await confirmResp.json() : null;
        const confirmError = confirmResp.ok ? null : await confirmResp.text();
        if (confirmError) console.error("Confirmation email failed:", confirmError);

        // Log confirmation email
        await supabase.from("email_log").insert({
          recipient: reply_email,
          subject: isEn ? "We've received your message — MOCOCHA" : "We hebben je bericht ontvangen — MOCOCHA",
          template: "contact_confirmation",
          provider_message_id: confirmResult?.id || null,
          status: confirmResp.ok ? "sent" : "failed",
          error: confirmError,
          sent_at: confirmResp.ok ? new Date().toISOString() : null,
        });
      }
    }

    // 6. Create in-app notification for admin
    if (user_id && conversationId) {
      await supabase.from("party_notifications").insert({
        user_id,
        title: lang === "en" ? "Your message has been sent" : "Je bericht is verzonden",
        body: lang === "en"
          ? "MOCOCHA will respond to your message as soon as possible."
          : "MOCOCHA reageert zo snel mogelijk op je bericht.",
      }).then(() => {});
    }

    return new Response(JSON.stringify({
      success: true,
      conversation_id: conversationId,
      email_status: emailStatus,
      email_configured: !!resendKey,
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
