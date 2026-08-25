import { useParams, useNavigate } from "react-router-dom";
import { useParty } from "../store/party";
import { eur } from "../utils/format";
import { CheckIcon } from "../components/icons";
import { useEffect, useState } from "react";
import { supabase } from "../data/api";
import { useI18n } from "../i18n";

export default function OrderConfirmation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const party = useParty();
  const { t } = useI18n();
  const concept = party.concepts.find((c) => c.id === id);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  useEffect(() => {
    if (supabase && id) {
      supabase.from("payments").select("status, payment_type, amount").eq("party_build_id", id).maybeSingle()
        .then(({ data }) => { if (data) setPaymentStatus((data as { status: string }).status); });
    }
  }, [id]);

  if (!concept) return (
    <div className="empty">
      <div className="empty-monogram">M</div>
      <h3>{t("confirm.concept_not_found")}</h3>
      <button className="btn bp blk" style={{ maxWidth: 220, margin: "0 auto", marginTop: "var(--s3)" }} onClick={() => navigate("/")}>{t("confirm.to_home")}</button>
    </div>
  );

  const isQuotation = concept.status === "quotation_requested";
  const isPaid = concept.status === "paid" || paymentStatus === "paid";

  const titleKey = isQuotation ? "confirm.quote_title" : isPaid ? "confirm.paid_title" : "confirm.confirmed_title";
  const bodyKey = isQuotation ? "confirm.quote_body" : isPaid ? "confirm.paid_body" : "confirm.confirmed_body";

  return (
    <div style={{ textAlign: "center", paddingTop: "var(--s8)" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(90,110,84,0.10)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--s4)" }}>
        <CheckIcon size={26} style={{ color: "var(--success)" }} />
      </div>
      <h1 className="editorial-title" style={{ fontSize: "1.5rem", marginBottom: "var(--s2)" }}>
        {t(titleKey)}
      </h1>
      <p className="muted" style={{ fontSize: "0.875rem", maxWidth: 300, margin: "0 auto var(--s6)", lineHeight: 1.5 }}>
        {t(bodyKey)}
      </p>

      <div className="summary-section mb24" style={{ textAlign: "left" }}>
        <div className="summary-row"><span className="muted">{t("confirm.concept")}</span><span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{concept.name}</span></div>
        <div className="summary-row"><span className="muted">{t("confirm.status")}</span><span style={{ fontSize: "0.875rem" }}>{concept.status}</span></div>
        <div className="summary-row"><span className="muted">{t("confirm.estimated_total")}</span><span className="tbrown" style={{ fontSize: "0.875rem", fontWeight: 500 }}>{eur(concept.breakdown.total_gross)}</span></div>
      </div>

      <div className="col g8">
        <button className="btn bp blk" onClick={() => navigate("/concepten")}>{t("confirm.to_concepts")}</button>
        <button className="btn bs blk" onClick={() => navigate("/")}>{t("confirm.to_home")}</button>
      </div>
    </div>
  );
}
