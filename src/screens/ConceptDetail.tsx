import { useParams, useNavigate } from "react-router-dom";
import { useParty, type ConceptStatus } from "../store/party";
import { calculateTotals, lineTotal, type Selection } from "../lib/pricing";
import { eur, formatDate } from "../utils/format";
import { ShareIcon, MailIcon, BuildIcon, SparklesIcon } from "../components/icons";
import { haptic } from "../lib/adapters/haptics";
import { shareContent } from "../lib/adapters/share";
import { useState } from "react";
import { useI18n } from "../i18n";

const STATUS_FLOW: { status: ConceptStatus; labelKey: string }[] = [
  { status: "draft", labelKey: "detail.status_saved" },
  { status: "saved", labelKey: "detail.status_saved" },
  { status: "quotation_requested", labelKey: "detail.status_quote" },
  { status: "awaiting_payment", labelKey: "detail.status_awaiting" },
  { status: "paid", labelKey: "detail.status_deposit" },
  { status: "completed", labelKey: "detail.status_done" },
];

function statusIndex(status: ConceptStatus): number {
  const idx = STATUS_FLOW.findIndex((s) => s.status === status);
  return idx === -1 ? 0 : idx;
}

export default function ConceptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const party = useParty();
  const { t, lang } = useI18n();
  const concept = party.concepts.find((c) => c.id === id);
  const [showShare, setShowShare] = useState(false);

  if (!concept) {
    return (
      <div className="empty">
        <div className="empty-monogram">M</div>
        <h3>{t("detail.not_found")}</h3>
        <p>{t("detail.not_found_body")}</p>
        <button className="btn bp blk" style={{ maxWidth: 220, margin: "0 auto", marginTop: "var(--s3)" }} onClick={() => navigate("/concepten")}>{t("detail.to_concepts")}</button>
      </div>
    );
  }

  const breakdown = calculateTotals(concept.selections);
  const currentIdx = statusIndex(concept.status);
  const reference = concept.id.slice(0, 8).toUpperCase();

  const handleShare = async () => {
    setShowShare(true);
    await shareContent(`MOCOCHA party — ${concept.name}`, window.location.href);
    setTimeout(() => setShowShare(false), 1500);
  };

  return (
    <div>
      <button className="bg-link" style={{ marginBottom: "var(--s5)" }} onClick={() => navigate("/concepten")}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>← {t("concepts.title")}</span>
      </button>

      <div style={{
        aspectRatio: "16/9", borderRadius: "var(--r-md)", background: "var(--soft-surface)",
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "var(--s5)",
        overflow: "hidden",
      }}>
        <div style={{ textAlign: "center" }}>
          <div className="img-placeholder-mark" style={{ fontSize: "0.7rem", marginBottom: 4 }}>MOCOCHA</div>
          <div style={{ color: "var(--taupe)", fontSize: "0.82rem" }}>{t("insp.image_pending")}</div>
        </div>
      </div>

      <div className="eyebrow mb8">{t("detail.reference", { ref: reference })}</div>
      <h1 className="editorial-title" style={{ fontSize: "1.5rem", marginBottom: "var(--s1)" }}>
        {concept.name || concept.event?.type || t("detail.untitled")}
      </h1>
      {concept.event?.date && <p className="muted" style={{ fontSize: "0.875rem", marginBottom: "var(--s1)" }}>{formatDate(concept.event.date, lang)}</p>}
      {concept.event?.type && <p className="muted" style={{ fontSize: "0.8125rem" }}>{concept.event.type}</p>}

      <div className="sec">
        <h2 className="section-title mb16">{t("detail.status")}</h2>
        <div className="tl">
          {STATUS_FLOW.map((s, i) => {
            const done = i < currentIdx;
            const current = i === currentIdx;
            if (i > 0 && s.status === "saved" && STATUS_FLOW[i - 1].status === "draft") return null;
            return (
              <div key={s.status} className={`tli ${done ? "done" : ""} ${current ? "cur" : ""}`}>
                <div className="tldot" />
                <div style={{ fontSize: "0.875rem", fontWeight: current ? 500 : 400, color: current ? "var(--near-black)" : done ? "var(--chocolate)" : "var(--taupe)" }}>
                  {t(s.labelKey)}
                </div>
                {current && concept.updated_at && (
                  <div className="muted" style={{ fontSize: "0.75rem", marginTop: 1 }}>{formatDate(concept.updated_at, lang)}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="sec">
        <h2 className="section-title mb16">{t("detail.financials")}</h2>
        <div className="summary-section">
          <div className="summary-row"><span className="muted">{t("detail.subtotal_vat")}</span><span>{eur(breakdown.subtotal_gross)}</span></div>
          {breakdown.bus_surcharge > 0 && <div className="summary-row"><span className="muted">{t("detail.bus_hire")}</span><span>{eur(breakdown.bus_surcharge)}</span></div>}
          <div className="summary-total">
            <span className="section-title">{t("detail.total_vat")}</span>
            <span className="tbrown" style={{ fontSize: "1.125rem", fontWeight: 600 }}>{eur(breakdown.total_gross)}</span>
          </div>
          <div className="summary-row" style={{ marginTop: "var(--s1)" }}><span className="muted">{t("detail.deposit")}</span><span>{eur(breakdown.deposit_amount)}</span></div>
          <div className="summary-row"><span className="muted">{t("detail.remaining")}</span><span>{eur(breakdown.remaining_amount)}</span></div>
          {concept.status === "paid" && <div className="summary-row" style={{ marginTop: "var(--s1)" }}><span style={{ color: "var(--success)", fontSize: "0.8125rem", fontWeight: 500 }}>{t("detail.deposit_received")}</span></div>}
        </div>
      </div>

      <div className="sec">
        <h2 className="section-title mb16">{t("detail.selected_items")}</h2>
        <div className="summary-section">
          {concept.selections.length === 0 && <div className="muted" style={{ fontSize: "0.875rem" }}>{t("detail.no_items")}</div>}
          {concept.selections.map((sel: Selection) => (
            <div key={sel.id} className="summary-row">
              <span>{sel.title}{sel.quantity > 1 ? ` × ${sel.quantity}` : ""}</span>
              <span className="tbrown">{sel.unit_price === 0 ? t("detail.incl") : eur(lineTotal(sel))}</span>
            </div>
          ))}
        </div>
      </div>

      {concept.theme && (concept.theme.theme || concept.theme.custom_theme || concept.theme.design_by_mococha) && (
        <div className="sec">
          <h2 className="section-title mb16">{t("detail.theme")}</h2>
          <div className="summary-section">
            <div className="info-row-text">
              {concept.theme.theme || concept.theme.custom_theme || t("detail.mococha_designs")}
            </div>
            {concept.theme.design_by_mococha && (
              <div className="muted" style={{ fontSize: "0.8125rem", marginTop: "var(--s1)", display: "flex", alignItems: "center", gap: "var(--s1)" }}>
                <SparklesIcon size={14} /> {t("detail.mococha_designs")}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="sec">
        <div className="col g8">
          {(concept.status === "draft" || concept.status === "saved") && (
            <button className="btn bp blk" onClick={() => { party.loadConcept(concept.id); haptic("medium"); navigate("/bouwen"); }}>
              <BuildIcon size={16} /> {t("detail.edit_concept")}
            </button>
          )}
          {concept.status === "awaiting_payment" && (
            <button className="btn bp blk" onClick={() => { party.loadConcept(concept.id); navigate("/afrekenen"); }}>
              {t("detail.pay")}
            </button>
          )}
          <button className="btn bs blk" onClick={handleShare}>
            <ShareIcon size={16} /> {showShare ? t("detail.shared") : t("detail.share")}
          </button>
          <button className="btn bo blk" onClick={() => navigate(`/contact?concept=${concept.id}`)}>
            <MailIcon size={16} /> {t("detail.contact_concept")}
          </button>
        </div>
      </div>
    </div>
  );
}
