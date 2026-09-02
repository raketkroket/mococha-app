import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createMocochaEmail, escapeHtml, getAppBaseUrl, getLanguage, getResendApiKey, isValidEmail, MOCOCHA_EMAIL, sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LARGE_BUS_SURCHARGE = 350;

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
    const appBaseUrl = getAppBaseUrl();

    const body = await req.json();
    const {
      concept_id,
      user_id,
      customer_email,
      event_details,
      selected_items,
      totals,
      language,
    } = body;

    if (!concept_id) {
      return new Response(JSON.stringify({ error: "Missing concept_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (customer_email && !isValidEmail(customer_email)) {
      return new Response(JSON.stringify({ error: "Invalid customer_email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: check if a quote request already exists for this concept
    const { data: existing } = await supabase
      .from("quote_requests")
      .select("id, emails_sent")
      .eq("concept_id", concept_id)
      .maybeSingle();

    // Save/update the quote request
    const quoteData = {
      concept_id: String(concept_id),
      user_id: user_id || null,
      customer_email: customer_email || null,
      event_details: event_details || null,
      selections: selected_items || null,
      selected_items: selected_items || null,
      totals: totals || null,
      status: "quotation_requested",
      emails_sent: existing?.emails_sent ?? false,
    };

    let quoteRecord;
    if (existing) {
      const { data: updated } = await supabase
        .from("quote_requests")
        .update({ ...quoteData, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .maybeSingle();
      quoteRecord = updated;
    } else {
      const { data: created } = await supabase
        .from("quote_requests")
        .insert(quoteData)
        .select()
        .maybeSingle();
      quoteRecord = created;
    }

    // Update concept status
    await supabase
      .from("party_builds")
      .update({ status: "quotation_requested", updated_at: new Date().toISOString() })
      .eq("id", concept_id);

    // Send emails only if not already sent (idempotency)
    let emailsSent = existing?.emails_sent ?? false;

    if (!emailsSent && resendKey) {
      const isEn = language === "en";
      const eventDate = event_details?.date || "—";
      const eventType = event_details?.type || "—";
      const eventCity = event_details?.city || "—";
      const numChildren = event_details?.num_children ?? "—";

      // Build item list
      const itemList = (selected_items || [])
        .map((it: { title: string; quantity: number; unit_price: number }) =>
          `  • ${it.title} ×${it.quantity} — €${(it.unit_price * it.quantity).toFixed(2)}`)
        .join("\n");

      const totalGross = totals?.total_gross ?? 0;
      const depositAmount = totals?.deposit_amount ?? 0;

      // Internal email to info@mococha.nl
      const internalSubject = isEn
        ? `New quote request — ${eventType}`
        : `Nieuwe offerteaanvraag — ${eventType}`;

      const internalBody = [
        isEn ? "A new quote request has been submitted on mococha.nl" : "Er is een nieuwe offerteaanvraag binnengekomen op mococha.nl",
        "",
        isEn ? `Concept ID: ${concept_id}` : `Concept ID: ${concept_id}`,
        isEn ? `Customer: ${customer_email || "guest"}` : `Klant: ${customer_email || "gast"}`,
        isEn ? `User ID: ${user_id || "—"}` : `User ID: ${user_id || "—"}`,
        "",
        isEn ? "Event details:" : "Feestdetails:",
        isEn ? `  Type: ${eventType}` : `  Type: ${eventType}`,
        isEn ? `  Date: ${eventDate}` : `  Datum: ${eventDate}`,
        isEn ? `  City: ${eventCity}` : `  Plaats: ${eventCity}`,
        isEn ? `  Children: ${numChildren}` : `  Kinderen: ${numChildren}`,
        "",
        isEn ? "Selected items:" : "Geselecteerde onderdelen:",
        itemList || "  (none)",
        "",
        isEn ? `Subtotal: €${(totals?.subtotal_gross ?? 0).toFixed(2)}` : `Subtotaal: €${(totals?.subtotal_gross ?? 0).toFixed(2)}`,
        (totals?.bus_surcharge ?? 0) > 0 ? (isEn ? `Bus hire: €${totals.bus_surcharge.toFixed(2)}` : `Bushuur: €${totals.bus_surcharge.toFixed(2)}`) : null,
        isEn ? `Total (incl. VAT): €${totalGross.toFixed(2)}` : `Totaal (incl. btw): €${totalGross.toFixed(2)}`,
        isEn ? `Deposit (30%): €${depositAmount.toFixed(2)}` : `Aanbetaling (30%): €${depositAmount.toFixed(2)}`,
      ].filter(Boolean).join("\n");

      const selectedLanguage = getLanguage(language);
      const internalContent = createMocochaEmail({
        previewText: internalSubject,
        title: internalSubject,
        contentHtml: `<div style="white-space:pre-wrap;">${escapeHtml(internalBody)}</div>`,
        contentText: internalBody,
        lang: selectedLanguage,
      });
      const internalDelivery = await sendEmail(resendKey, { to: MOCOCHA_EMAIL, subject: internalSubject, ...internalContent });
      await supabase.from("email_log").insert({
        recipient: MOCOCHA_EMAIL,
        subject: internalSubject,
        template: "quote_request_admin",
        concept_id,
        provider_message_id: internalDelivery.messageId,
        status: internalDelivery.ok ? "sent" : "failed",
        error: internalDelivery.error,
        sent_at: internalDelivery.ok ? new Date().toISOString() : null,
      });

      // Customer confirmation email — only if email is present and not info@mococha.nl
      if (customer_email && customer_email.toLowerCase() !== MOCOCHA_EMAIL) {
        const customerSubject = isEn
          ? "Your quote request has been received — MOCOCHA"
          : "Je offerteaanvraag is ontvangen — MOCOCHA";

        const customerBody = [
          isEn ? "Thank you for your quote request!" : "Bedankt voor je offerteaanvraag!",
          "",
          isEn
            ? "We have received your party concept and will contact you within 48 hours with a personalized quote."
            : "We hebben je feestconcept ontvangen en nemen binnen 48 uur contact met je op met een persoonlijke offerte.",
          "",
          isEn ? "Summary of your request:" : "Samenvatting van je aanvraag:",
          isEn ? `  Event type: ${eventType}` : `  Type feest: ${eventType}`,
          isEn ? `  Date: ${eventDate}` : `  Datum: ${eventDate}`,
          isEn ? `  City: ${eventCity}` : `  Plaats: ${eventCity}`,
          "",
          isEn ? `Estimated total: €${totalGross.toFixed(2)} (incl. VAT)` : `Geschat totaal: €${totalGross.toFixed(2)} (incl. btw)`,
          isEn ? `Deposit (30%): €${depositAmount.toFixed(2)}` : `Aanbetaling (30%): €${depositAmount.toFixed(2)}`,
          "",
          isEn ? "You can view your concept anytime at:" : "Je kunt je concept op elk moment bekijken op:",
          `${appBaseUrl}/concepten/${concept_id}`,
          "",
          isEn ? "With kind regards," : "Met vriendelijke groet,",
          "MOCOCHA",
        ].join("\n");

        const summaryRows = [[isEn ? "Event type" : "Type feest", eventType], [isEn ? "Date" : "Datum", eventDate], [isEn ? "City" : "Plaats", eventCity], [isEn ? "Estimated total" : "Geschat totaal", `EUR ${totalGross.toFixed(2)}`], [isEn ? "Deposit (30%)" : "Aanbetaling (30%)", `EUR ${depositAmount.toFixed(2)}`]]
          .map(([label, value]) => `<tr><td style="padding:8px 0;color:#8B7E6B;">${escapeHtml(label)}</td><td align="right" style="padding:8px 0;color:#4A3936;font-weight:600;">${escapeHtml(value)}</td></tr>`).join("");
        const customerContent = createMocochaEmail({
          previewText: customerSubject,
          title: isEn ? "Quote request received" : "Offerteaanvraag ontvangen",
          greeting: isEn ? "Thank you!" : "Bedankt!",
          contentHtml: `<p style="margin:0 0 20px;">${escapeHtml(isEn ? "We have received your party concept and will contact you within 48 hours with a personalized quote." : "We hebben je feestconcept ontvangen en nemen binnen 48 uur contact met je op met een persoonlijke offerte.")}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #E7E0D8;border-bottom:1px solid #E7E0D8;">${summaryRows}</table>`,
          contentText: customerBody,
          buttonText: isEn ? "View concept" : "Concept bekijken",
          buttonUrl: `${appBaseUrl}/concepten/${encodeURIComponent(concept_id)}`,
          lang: selectedLanguage,
        });
        const customerDelivery = await sendEmail(resendKey, { to: customer_email, subject: customerSubject, ...customerContent });
        await supabase.from("email_log").insert({
          recipient: customer_email,
          subject: customerSubject,
          template: "quote_request_confirmation",
          concept_id,
          provider_message_id: customerDelivery.messageId,
          status: customerDelivery.ok ? "sent" : "failed",
          error: customerDelivery.error,
          sent_at: customerDelivery.ok ? new Date().toISOString() : null,
        });
      }

      // Add in-app notification for authenticated users
      if (user_id) {
        await supabase.from("party_notifications").insert({
          user_id,
          title: isEn ? "Quote requested" : "Offerte aangevraagd",
          body: isEn
            ? "We've received your request and will contact you within 48 hours."
            : "We hebben je aanvraag ontvangen en nemen binnen 48 uur contact op.",
        });
      }

      // Mark emails as sent
      if (quoteRecord) {
        await supabase
          .from("quote_requests")
          .update({ emails_sent: true })
          .eq("id", quoteRecord.id);
      }
      emailsSent = true;
    }

    return new Response(JSON.stringify({
      success: true,
      quote_id: quoteRecord?.id ?? existing?.id,
      emails_sent: emailsSent,
      idempotent: !!existing,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
