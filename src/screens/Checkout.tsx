import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useParty } from "../store/party";
import { useAuth } from "../store/auth";
import { calculateTotals, lineTotal, type Selection } from "../lib/pricing";
import { eur } from "../utils/format";
import { haptic } from "../lib/adapters/haptics";
import { ArrowLeft, CreditCard } from "../components/icons";
import { supabase } from "../data/api";
import { useI18n } from "../i18n";

export default function Checkout() {
  const navigate = useNavigate();
  const party = useParty();
  const user = useAuth((s) => s.user);
  const { t, lang } = useI18n();
  const [paymentKind, setPaymentKind] = useState<"deposit" | "full" | "quotation">("deposit");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const breakdown = calculateTotals(party.selections);

  if (party.selections.length === 0)
    return (
      <div className="empty">
        <div className="empty-monogram">M</div>
        <h3>{t("checkout.empty_title")}</h3>
        <p>{t("checkout.empty_body")}</p>
        <button className="btn bp blk" style={{ maxWidth: 220, margin: "0 auto", marginTop: "var(--s3)" }} onClick={() => navigate("/bouwen")}>{t("checkout.to_builder")}</button>
      </div>
    );

  const submit = async () => {
    setSubmitting(true); setError(null);
    try {
      const conceptId = party.activeConceptId ?? party.saveConcept(party.event?.type || "MOCOCHA party");

      if (paymentKind === "quotation") {
        party.updateConcept(conceptId);
        party.setConceptStatus(conceptId, "quotation_requested");
        haptic("heavy");

        // Save quote request to Supabase
        if (supabase && user) {
          const { error: dbError } = await supabase.from("party_builds").upsert({
            id: conceptId,
            user_id: user.id,
            name: party.event?.type || "MOCOCHA party",
            status: "quotation_requested",
            event_data: party.event,
            theme_data: party.theme,
            pricing_snapshot: breakdown,
            submitted_at: new Date().toISOString(),
          });

          if (!dbError) {
            // Save selections
            const selectionRows = party.selections.map((s) => ({
              build_id: conceptId,
              component_id: s.component_id,
              title_snapshot: s.title,
              unit_price_snapshot: s.unit_price,
              quantity: s.quantity,
              pricing_unit: s.pricing_unit,
              line_total: s.unit_price * s.quantity,
              requires_large_bus: s.requires_large_bus,
              price_includes_vat: s.price_includes_vat,
            }));
            await supabase.from("party_build_selections").upsert(selectionRows, { onConflict: "build_id,component_id,title_snapshot" });

            // Call the quote-request edge function
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
            try {
              const resp = await fetch(`${supabaseUrl}/functions/v1/quote-request`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}` },
                body: JSON.stringify({
                  concept_id: conceptId,
                  user_id: user.id,
                  customer_email: user.email ?? undefined,
                  event_details: party.event,
                  selected_items: party.selections.map((s) => ({
                    title: s.title,
                    quantity: s.quantity,
                    unit_price: s.unit_price,
                  })),
                  totals: breakdown,
                  language: lang,
                }),
              });
              if (!resp.ok) {
                console.warn("Quote email function returned non-OK status");
              }
            } catch (e) {
              console.warn("Quote email function failed:", e);
            }
          }
        }

        navigate(`/bevestiging/${conceptId}`);
        return;
      }

      // Payment flow
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const response = await fetch(`${supabaseUrl}/functions/v1/mollie-create-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ party_build_id: conceptId, payment_type: paymentKind }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.payment_disabled ? data.error : (data.error || t("checkout.error_payment")));
        setSubmitting(false);
        return;
      }
      if (data.checkout_url) window.location.href = data.checkout_url;
      else navigate(`/bevestiging/${conceptId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("checkout.error_generic"));
      setSubmitting(false);
    }
  };

  return (
    <div>
      <button className="bg-link" style={{ marginBottom: "var(--s5)" }} onClick={() => navigate("/bouwen")}><ArrowLeft size={16} /> {t("checkout.back")}</button>
      <h1 className="screen-title mb24">{t("checkout.title")}</h1>

      <div className="summary-section mb24">
        <h3 className="section-title mb8">{t("checkout.concept_overview")}</h3>
        {party.selections.map((s: Selection) => (
          <div key={s.id} className="summary-row">
            <span>{s.title}{s.quantity > 1 ? " ×" + s.quantity : ""}</span>
            <span className="tbrown">{eur(lineTotal(s))}</span>
          </div>
        ))}
        <hr className="div" />
        <div className="summary-row"><span className="muted">{t("detail.subtotal_vat")}</span><span>{eur(breakdown.subtotal_gross)}</span></div>
        {breakdown.bus_surcharge > 0 && <div className="summary-row"><span className="muted">{t("detail.bus_hire")}</span><span>{eur(breakdown.bus_surcharge)}</span></div>}
        <div className="summary-row"><span className="muted">{t("build.vat_21")}</span><span className="muted">{eur(breakdown.vat_portion)}</span></div>
        <div className="summary-total">
          <span className="section-title">{t("detail.total_vat")}</span>
          <span className="tbrown" style={{ fontSize: "1.125rem", fontWeight: 600 }}>{eur(breakdown.total_gross)}</span>
        </div>
      </div>

      <div className="field">
        <label>{t("checkout.payment_method")}</label>
        <div className="col g8">
          <button className={`ocard ${paymentKind === "deposit" ? "sel" : ""}`} style={{ marginBottom: 0 }} onClick={() => setPaymentKind("deposit")}>
            <div className="orad" />
            <div className="f1"><div className="otitle">{t("checkout.deposit")}</div><div className="odesc">{t("checkout.deposit_desc", { amount: eur(breakdown.deposit_amount) })}</div></div>
          </button>
          <button className={`ocard ${paymentKind === "full" ? "sel" : ""}`} style={{ marginBottom: 0 }} onClick={() => setPaymentKind("full")}>
            <div className="orad" />
            <div className="f1"><div className="otitle">{t("checkout.full")}</div><div className="odesc">{eur(breakdown.total_gross)}</div></div>
          </button>
          <button className={`ocard ${paymentKind === "quotation" ? "sel" : ""}`} style={{ marginBottom: 0 }} onClick={() => setPaymentKind("quotation")}>
            <div className="orad" />
            <div className="f1"><div className="otitle">{t("checkout.quote")}</div><div className="odesc">{t("checkout.quote_desc")}</div></div>
          </button>
        </div>
      </div>

      {paymentKind !== "quotation" && (
        <div style={{ borderTop: "0.5px solid var(--hairline)", paddingTop: "var(--s4)", marginBottom: "var(--s4)" }}>
          <div className="row g12"><CreditCard size={20} style={{ color: "var(--taupe)" }} /><div><div style={{ fontWeight: 500, fontSize: "0.875rem" }}>Mollie</div><div className="muted" style={{ fontSize: "0.78rem" }}>iDEAL, Creditcard, Apple Pay, Google Pay</div></div></div>
        </div>
      )}

      {error && <div className="busw mb16"><span>{error}</span></div>}
      <button className="btn bp blk" disabled={submitting} onClick={submit}>
        {submitting ? t("checkout.submitting") : paymentKind === "quotation" ? t("checkout.submit_quote") : paymentKind === "deposit" ? t("checkout.submit_deposit", { amount: eur(breakdown.deposit_amount) }) : t("checkout.submit_full", { amount: eur(breakdown.total_gross) })}
      </button>
    </div>
  );
}
