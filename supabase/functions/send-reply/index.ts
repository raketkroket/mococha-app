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
    const isEnLang = lang === "en";
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

      if (sender === "admin" && user_email) {
        // Notify the customer
        const emailResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "MOCOCHA <noreply@mococha.nl>",
            to: [user_email],
            subject: isEnLang ? "New message from MOCOCHA" : "Nieuw bericht van MOCOCHA",
            text: isEnLang
              ? [
                  `Hi ${user_name || ""},`,
                  "",
                  "You have received a new message from MOCOCHA:",
                  "",
                  messageBody,
                  "",
                  "Read and reply at:",
                  `${baseUrl}/account/berichten`,
                  "",
                  "With kind regards,",
                  "MOCOCHA",
                ].join("\n")
              : [
                  `Hallo ${user_name || ""},`,
                  "",
                  "Je hebt een nieuw bericht ontvangen van MOCOCHA:",
                  "",
                  messageBody,
                  "",
                  "Lees en reageer op:",
                  `${baseUrl}/account/berichten`,
                  "",
                  "Met vriendelijke groet,",
                  "MOCOCHA",
                ].join("\n"),
          }),
        });

        emailStatus = emailResp.ok ? "sent" : "failed";
        if (!emailResp.ok) {
          const errText = await emailResp.text();
          console.error("Customer notification email failed:", errText);
        }
      } else if (sender === "user") {
        // Notify MOCOCHA admin
        const emailResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "MOCOCHA <noreply@mococha.nl>",
            to: [MOCOCHA_EMAIL],
            reply_to: user_email || undefined,
            subject: `Nieuw bericht van klant${user_name ? ` — ${user_name}` : ""}`,
            text: [
              `Klant: ${user_email || "onbekend"}`,
              "",
              messageBody,
              "",
              `Bekijk en reageer op: ${baseUrl}/admin/berichten`,
            ].join("\n"),
          }),
        });

        emailStatus = emailResp.ok ? "sent" : "failed";
        if (!emailResp.ok) {
          const errText = await emailResp.text();
          console.error("Admin notification email failed:", errText);
        }
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


