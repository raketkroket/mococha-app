import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createMocochaEmail, escapeHtml, getAppBaseUrl, getLanguage, getResendApiKey, isValidEmail, MOCOCHA_EMAIL, sendEmail } from "../_shared/email.ts";

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
    const baseUrl = getAppBaseUrl();

    const body = await req.json();
    const {
      conversation_id,
      sender,
      author_id,
      body: messageBody,
      user_email: userEmailParam,
      user_name: userNameParam,
      lang,
      attachments,
    } = body;
    let user_email = userEmailParam;
    let user_name = userNameParam;

    if (!conversation_id || !sender || !messageBody) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Insert the message
    const { data: message, error: msgError } = await supabase.from("conversation_messages").insert({
      conversation_id,
      sender,
      author_id: author_id || null,
      body: messageBody,
      attachments: attachments || [],
      email_status: "pending",
    }).select().maybeSingle();

    if (msgError) {
      return new Response(JSON.stringify({ error: msgError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Update conversation
    const convUpdate: Record<string, unknown> = {
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (sender === "user") {
      convUpdate.unread_by_admin = true;
      convUpdate.status = "open";
    } else {
      convUpdate.unread_by_user = true;
    }

    await supabase.from("conversations").update(convUpdate).eq("id", conversation_id);

    // 3. Send email notification
    const isEnLang = getLanguage(lang) === "en";
    let emailStatus = "not_applicable";

    if (resendKey) {

      // Fetch user email from conversation if not provided (admin case)
      if (sender === "admin" && !user_email) {
        const { data: conv } = await supabase.from("conversations")
          .select("user_id")
          .eq("id", conversation_id)
          .maybeSingle();
        if (conv?.user_id) {
          const { data: profile } = await supabase.from("profiles")
            .select("email, full_name")
            .eq("id", conv.user_id)
            .maybeSingle();
          if (profile?.email) user_email = profile.email;
          if (profile?.full_name && !user_name) user_name = profile.full_name;
        }
      }

      if (sender === "admin" && isValidEmail(user_email)) {
        // Notify the customer
        const subject = isEnLang ? "New message from MOCOCHA" : "Nieuw bericht van MOCOCHA";
        const introduction = isEnLang ? "You have received a new message from MOCOCHA:" : "Je hebt een nieuw bericht ontvangen van MOCOCHA:";
        const content = createMocochaEmail({ previewText: subject, title: isEnLang ? "New message" : "Nieuw bericht", greeting: user_name ? (isEnLang ? `Hi ${user_name},` : `Hallo ${user_name},`) : undefined, contentHtml: `<p style="margin:0 0 16px;">${introduction}</p><div style="padding:16px;background:#F5F1EB;border-radius:8px;white-space:pre-wrap;">${escapeHtml(messageBody)}</div>`, contentText: `${introduction}\n\n${messageBody}`, buttonText: isEnLang ? "Read message" : "Bericht lezen", buttonUrl: `${baseUrl}/account/berichten`, lang: isEnLang ? "en" : "nl" });
        const delivery = await sendEmail(resendKey, { to: user_email, subject, ...content });
        emailStatus = delivery.ok ? "sent" : "failed";

        // Log customer notification email
        await supabase.from("email_log").insert({
          conversation_id,
          recipient: user_email,
          subject,
          template: "new_message",
          provider_message_id: delivery.messageId,
          status: delivery.ok ? "sent" : "failed",
          error: delivery.error,
          sent_at: delivery.ok ? new Date().toISOString() : null,
        });
      } else if (sender === "user") {
        // Notify MOCOCHA admin
        const subject = `Nieuw bericht van klant${user_name ? ` — ${user_name}` : ""}`;
        const body = [`Klant: ${user_email || "onbekend"}`, "", messageBody, "", `Bekijk en reageer op: ${baseUrl}/admin/berichten`].join("\n");
        const content = createMocochaEmail({ previewText: subject, title: subject, contentHtml: `<div style="white-space:pre-wrap;">${escapeHtml(body)}</div>`, contentText: body, lang: "nl" });
        const delivery = await sendEmail(resendKey, { to: MOCOCHA_EMAIL, replyTo: isValidEmail(user_email) ? user_email : undefined, subject, ...content });
        emailStatus = delivery.ok ? "sent" : "failed";

        // Log admin notification email
        await supabase.from("email_log").insert({
          conversation_id,
          recipient: MOCOCHA_EMAIL,
          subject,
          template: "new_message",
          provider_message_id: delivery.messageId,
          status: delivery.ok ? "sent" : "failed",
          error: delivery.error,
          sent_at: delivery.ok ? new Date().toISOString() : null,
        });
      }
    } else {
      emailStatus = "not_applicable";
    }

    // 4. Update message email status
    if (message) {
      await supabase.from("conversation_messages").update({
        email_status: emailStatus,
      }).eq("id", message.id);
    }

    // 5. Create in-app notification
    if (sender === "admin") {
      // Notify the user in-app
      const { data: conv } = await supabase.from("conversations")
        .select("user_id")
        .eq("id", conversation_id)
        .maybeSingle();

      if (conv?.user_id) {
        await supabase.from("party_notifications").insert({
          user_id: conv.user_id,
          title: isEnLang ? "New message from MOCOCHA" : "Nieuw bericht van MOCOCHA",
          body: messageBody.substring(0, 100),
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message_id: message?.id,
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


