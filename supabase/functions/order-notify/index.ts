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
    const { order_id, order_number, payment_kind } = await req.json();

    if (!order_id || !order_number) {
      return new Response(JSON.stringify({ error: "Missing order_id or order_number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch order details
    const { data: order, error: oe } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .maybeSingle();

    if (oe || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch order items
    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order_id)
      .order("sort_order");

    const itemList = (items ?? [])
      .map((it: { title: string; quantity: number; unit_price: number }) =>
        `  • ${it.title} ×${it.quantity} — €${(it.unit_price * it.quantity).toFixed(2)}`)
      .join("\n");

    const isQuotation = payment_kind === "quotation";
    const subject = isQuotation
      ? `Nieuwe offerteaanvraag ${order_number}`
      : `Nieuwe bestelling ${order_number}`;

    const body = [
      `Er is een ${isQuotation ? "offerteaanvraag" : "bestelling"} binnengekomen op mococha.nl`,
      ``,
      `Ordernummer: ${order_number}`,
      `Status: ${order.status}`,
      `Betaalwijze: ${payment_kind === "deposit" ? "Aanbetaling (30%)" : payment_kind === "full" ? "Volledig" : "Offerte"}`,
      `Feestdatum: ${order.event_date ?? "—"}`,
      `Bezorging: ${order.fulfillment === "pickup" ? "Zelf afhalen" : "Bezorgen"}`,
      ``,
      `Producten:`,
      itemList || "  (geen items)",
      ``,
      `Subtotaal: €${(order.subtotal ?? 0).toFixed(2)}`,
      order.bus_surcharge > 0 ? `Bushuur: €${(order.bus_surcharge ?? 0).toFixed(2)}` : null,
      `BTW: €${(order.vat ?? 0).toFixed(2)}`,
      `Totaal: €${(order.total ?? 0).toFixed(2)}`,
      `Aanbetaling: €${(order.deposit ?? 0).toFixed(2)}`,
      ``,
      `Klant: ${order.user_id ?? "gast"}`,
    ].filter(Boolean).join("\n");

    // Send email via Supabase's built-in email (or store for admin pickup)
    // Using Resend if available, otherwise log for admin dashboard
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (resendKey) {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "MOCOCHA <noreply@mococha.nl>",
          to: [MOCOCHA_EMAIL],
          subject,
          text: body,
        }),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        return new Response(JSON.stringify({ error: "Email send failed", detail: errText }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Also store notification in database for admin dashboard
    await supabase.from("order_notifications").upsert({
      order_id,
      order_number,
      type: isQuotation ? "quotation" : "order",
      email_subject: subject,
      email_body: body,
      sent: Boolean(resendKey),
    }, { onConflict: "order_id" });

    return new Response(JSON.stringify({ success: true, emailed: Boolean(resendKey) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
