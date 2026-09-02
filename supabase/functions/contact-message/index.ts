import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createMocochaEmail, escapeHtml, getLanguage, getResendApiKey, isValidEmail, MOCOCHA_EMAIL, sendEmail } from "../_shared/email.ts";

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
    );

    const resendKey = await getResendApiKey(supabase);

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

    if (typeof subject !== "string" || !subject.trim() || subject.length > 200 || typeof message !== "string" || !message.trim() || message.length > 10000 || !isValidEmail(reply_email)) {
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
      const internalSubject = `Contact: ${subject.trim()}${conceptRef}`;
      const internalContent = createMocochaEmail({
        previewText: "Nieuw contactbericht",
        title: "Nieuw contactbericht",
        contentHtml: `<p style="margin:0 0 12px;"><strong>Van:</strong> ${escapeHtml(reply_email)}</p><p style="margin:0 0 12px;"><strong>Onderwerp:</strong> ${escapeHtml(subject.trim())}</p>${concept_name ? `<p style="margin:0 0 12px;"><strong>Concept:</strong> ${escapeHtml(concept_name)}</p>` : ""}<div style="padding:16px;background:#F5F1EB;border-radius:8px;white-space:pre-wrap;">${escapeHtml(message.trim())}</div>`,
        contentText: [`Van: ${reply_email}`, `Onderwerp: ${subject.trim()}`, concept_name ? `Concept: ${concept_name}` : null, "", message.trim()].filter(Boolean).join("\n"),
      });
      const internalDelivery = await sendEmail(resendKey, { to: MOCOCHA_EMAIL, replyTo: reply_email, subject: internalSubject, ...internalContent });
      emailStatus = internalDelivery.ok ? "sent" : "failed";

      // Log internal email
      await supabase.from("email_log").insert({
        recipient: MOCOCHA_EMAIL,
        subject: internalSubject,
        template: "contact_message",
        concept_id: concept_id || null,
        provider_message_id: internalDelivery.messageId,
        status: internalDelivery.ok ? "sent" : "failed",
        error: internalDelivery.error,
        sent_at: internalDelivery.ok ? new Date().toISOString() : null,
      });

      // 5. Send confirmation email to the customer
      if (reply_email.toLowerCase() !== MOCOCHA_EMAIL) {
        const language = getLanguage(lang);
        const isEn = language === "en";
        const confirmationSubject = isEn ? "We've received your message — MOCOCHA" : "We hebben je bericht ontvangen — MOCOCHA";
        const confirmationText = isEn ? "We've received your message and will get back to you as soon as possible." : "We hebben je bericht ontvangen en nemen zo snel mogelijk contact met je op.";
        const confirmationContent = createMocochaEmail({ previewText: confirmationText, title: isEn ? "Message received" : "Bericht ontvangen", greeting: isEn ? "Thank you!" : "Bedankt!", contentHtml: `<p style="margin:0 0 16px;">${escapeHtml(confirmationText)}</p><p style="margin:0;color:#8B7E6B;font-size:13px;">${escapeHtml(isEn ? `Subject: ${subject.trim()}` : `Onderwerp: ${subject.trim()}`)}</p>`, contentText: `${confirmationText}\n\n${isEn ? "Subject" : "Onderwerp"}: ${subject.trim()}`, lang: language });
        const confirmationDelivery = await sendEmail(resendKey, { to: reply_email, subject: confirmationSubject, ...confirmationContent });

        // Log confirmation email
        await supabase.from("email_log").insert({
          recipient: reply_email,
          subject: confirmationSubject,
          template: "contact_confirmation",
          provider_message_id: confirmationDelivery.messageId,
          status: confirmationDelivery.ok ? "sent" : "failed",
          error: confirmationDelivery.error,
          sent_at: confirmationDelivery.ok ? new Date().toISOString() : null,
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
