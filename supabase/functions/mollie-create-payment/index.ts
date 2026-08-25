import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LARGE_BUS_SURCHARGE = 350;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let mollieKey = Deno.env.get("MOLLIE_API_KEY");
    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://mococha.nl";

    // Fall back to server_secrets table if env var not set
    if (!mollieKey) {
      const { data: secretRow } = await supabase
        .from("server_secrets")
        .select("value")
        .eq("key", "MOLLIE_API_KEY")
        .maybeSingle();
      mollieKey = secretRow?.value || undefined;
    }

    const { party_build_id, payment_type } = await req.json();
    if (!party_build_id) return new Response(JSON.stringify({ error: "Missing party_build_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Load concept from database (never trust client totals)
    const { data: build, error: be } = await supabase
      .from("party_builds")
      .select("*")
      .eq("id", party_build_id)
      .maybeSingle();
    if (be || !build) return new Response(JSON.stringify({ error: "Concept niet gevonden" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: selections } = await supabase
      .from("party_build_selections")
      .select("*")
      .eq("build_id", party_build_id);

    if (!selections) return new Response(JSON.stringify({ error: "Geen selections gevonden" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Server-side recalculation
    const subtotal_gross = selections.reduce((sum: number, s: { unit_price_snapshot: number; quantity: number }) => sum + s.unit_price_snapshot * s.quantity, 0);
    const hasBus = selections.some((s: { requires_large_bus: boolean }) => s.requires_large_bus);
    const bus_surcharge = hasBus ? LARGE_BUS_SURCHARGE : 0;
    const total_gross = subtotal_gross + bus_surcharge;

    let amount: number;
    if (payment_type === "deposit") {
      amount = Math.round(total_gross * 0.3 * 100) / 100;
    } else if (payment_type === "full") {
      amount = total_gross;
    } else {
      return new Response(JSON.stringify({ error: "Ongeldig betaaltype" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create payment record
    const { data: payment, error: pe } = await supabase
      .from("payments")
      .insert({ party_build_id, user_id: build.user_id, payment_type, amount, currency: "EUR", status: "pending" })
      .select()
      .single();
    if (pe) throw new Error(pe.message);

    // If Mollie not configured, return error — do NOT fake success
    if (!mollieKey) {
      await supabase.from("payments").update({ status: "failed" }).eq("id", payment.id);
      return new Response(JSON.stringify({
        error: "Online betalen is nog niet geactiveerd. Vraag een offerte aan of neem contact op met MOCOCHA.",
        payment_disabled: true,
      }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create Mollie payment
    const mollieResp = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: { "Authorization": `Bearer ${mollieKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: { currency: "EUR", value: amount.toFixed(2) },
        description: `MOCOCHA ${payment_type === "deposit" ? "aanbetaling" : "betaling"} — ${build.name || party_build_id}`,
        redirectUrl: `${appBaseUrl}/bevestiging/${party_build_id}`,
        webhookUrl: `${appBaseUrl}/functions/v1/mollie-webhook`,
        metadata: { payment_id: payment.id, party_build_id },
      }),
    });

    if (!mollieResp.ok) {
      const errText = await mollieResp.text();
      await supabase.from("payments").update({ status: "failed" }).eq("id", payment.id);
      throw new Error(`Mollie error: ${errText}`);
    }

    const mollieData = await mollieResp.json();
    const checkoutUrl = mollieData._links?.checkout?.href ?? "";

    await supabase.from("payments").update({
      mollie_payment_id: mollieData.id,
      checkout_url: checkoutUrl,
    }).eq("id", payment.id);

    await supabase.from("party_builds").update({ status: "awaiting_payment" }).eq("id", party_build_id);

    return new Response(JSON.stringify({ checkout_url: checkoutUrl, payment_id: payment.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
