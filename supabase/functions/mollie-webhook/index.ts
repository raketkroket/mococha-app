import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createMocochaEmail, getResendApiKey, sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let mollieKey = Deno.env.get("MOLLIE_API_KEY");

    // Fall back to server_secrets table if env var not set
    if (!mollieKey) {
      const { data: secretRow } = await supabase
        .from("server_secrets")
        .select("value")
        .eq("key", "MOLLIE_API_KEY")
        .maybeSingle();
      mollieKey = secretRow?.value || undefined;
    }

    if (!mollieKey) {
      return new Response(JSON.stringify({ status: "test_mode" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mollie sends form-encoded data for webhooks
    const formData = await req.formData();
    const mollieId = formData.get("id") as string;

    if (!mollieId) {
      return new Response(JSON.stringify({ error: "Missing payment id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify payment status with Mollie — never trust client
    const mollieResp = await fetch(`https://api.mollie.com/v2/payments/${mollieId}`, {
      headers: { "Authorization": `Bearer ${mollieKey}` },
    });

    if (!mollieResp.ok) {
      throw new Error("Mollie verification failed");
    }

    const mollieData = await mollieResp.json();
    const status = mollieData.status; // open, pending, authorized, paid, failed, canceled, expired, refunded, partially_refunded

    // Update payment record
    const { data: payment } = await supabase
      .from("payments")
      .select("*, party_builds!inner(id, user_id)")
      .eq("mollie_payment_id", mollieId)
      .maybeSingle();

    if (payment) {
      const updateData: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === "paid" && payment.status !== "paid") {
        updateData.paid_at = new Date().toISOString();
        updateData.webhook_verified_at = new Date().toISOString();
      }

      await supabase.from("payments").update(updateData).eq("id", payment.id);

      if (status === "paid") {
        await supabase.from("party_builds").update({ status: "paid", submitted_at: new Date().toISOString() }).eq("id", payment.party_build_id);

        if (payment.party_builds?.user_id) {
          const isDeposit = payment.payment_type === "deposit";
          await supabase.from("party_notifications").insert({
            user_id: payment.party_builds.user_id,
            title: "Betaling ontvangen",
            body: `Je ${isDeposit ? "aanbetaling" : "betaling"} van €${(payment.amount ?? 0).toFixed(2)} is ontvangen.`,
          });

          // Send payment confirmation email via Resend
          const resendKey = await getResendApiKey(supabase);
          if (resendKey) {
            // Fetch user email from profiles
            const { data: profile } = await supabase
              .from("profiles")
              .select("email")
              .eq("id", payment.party_builds.user_id)
              .maybeSingle();

            const customerEmail = profile?.email;
            if (customerEmail && customerEmail.toLowerCase() !== "info@mococha.nl") {
              const subject = isDeposit ? "Aanbetaling ontvangen — MOCOCHA" : "Betaling ontvangen — MOCOCHA";
              const emailBody = [
                `Je ${isDeposit ? "aanbetaling" : "betaling"} van €${(payment.amount ?? 0).toFixed(2)} is ontvangen.`,
                "",
                "We beginnen met de voorbereiding van je feest.",
                "",
                "Met vriendelijke groet,",
                "MOCOCHA",
              ].join("\n");

              const content = createMocochaEmail({
                previewText: subject,
                title: isDeposit ? "Aanbetaling ontvangen" : "Betaling ontvangen",
                greeting: "Bedankt!",
                contentHtml: `<p style="margin:0 0 16px;">Je ${isDeposit ? "aanbetaling" : "betaling"} van <strong>€${Number(payment.amount ?? 0).toFixed(2)}</strong> is ontvangen.</p><p style="margin:0;">We beginnen met de voorbereiding van je feest.</p>`,
                contentText: emailBody,
                lang: "nl",
              });
              const delivery = await sendEmail(resendKey, { to: customerEmail, subject, ...content });
              await supabase.from("email_log").insert({
                recipient: customerEmail,
                subject,
                template: "payment_received",
                provider_message_id: delivery.messageId,
                status: delivery.ok ? "sent" : "failed",
                error: delivery.error,
                sent_at: delivery.ok ? new Date().toISOString() : null,
              });
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
