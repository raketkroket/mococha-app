import { useNavigate } from "react-router-dom";
import { useParty, type SavedConcept, type ConceptStatus } from "../store/party";
import { eur } from "../utils/format";
import { BuildIcon } from "../components/icons";
import { useI18n } from "../i18n";

const QUOTE_STATUSES: ConceptStatus[] = ["quotation_requested", "awaiting_payment", "paid", "completed"];

export default function Quotes() {
  const navigate = useNavigate();
  const party = useParty();
  const { t } = useI18n();
  const concepts = party.concepts.filter((c) => QUOTE_STATUSES.includes(c.status));

  const statusLabel = (s: ConceptStatus): string => {
    const map: Record<ConceptStatus, string> = {
      draft: t("status.draft"),
      saved: t("status.saved"),
      quotation_requested: t("quotes.statusQuotationRequested"),
      awaiting_payment: t("quotes.statusAwaitingPayment"),
      paid: t("quotes.statusPaid"),
      completed: t("quotes.statusCompleted"),
      archived: t("status.archived"),
    };
    return map[s] ?? s;
  };

  const statusBadge = (s: ConceptStatus): string => {
    const map: Record<ConceptStatus, string> = {
      draft: "badge badge-draft",
      saved: "badge badge-draft",
      quotation_requested: "badge badge-pending",
      awaiting_payment: "badge badge-pending",
      paid: "badge badge-paid",
      completed: "badge badge-approved",
      archived: "badge badge-draft",
    };
    return map[s] ?? "badge badge-draft";
  };

  return (
    <div>
      <div style={{ marginBottom: "var(--s5)" }}>
        <h1 className="screen-title">{t("quotes.title")}</h1>
        <p className="muted" style={{ marginTop: "var(--s1)", fontSize: "0.875rem" }}>{t("quotes.desc")}</p>
      </div>

      {concepts.length === 0 && (
        <div className="empty">
          <div className="empty-monogram">M</div>
          <h3>{t("quotes.noQuotes")}</h3>
          <p>{t("quotes.noQuotesDesc")}</p>
          <button className="btn bp blk" style={{ maxWidth: 220, margin: "0 auto", marginTop: "var(--s3)" }} onClick={() => navigate("/bouwen")}>
            {t("quotes.startBuilding")}
          </button>
        </div>
      )}

      <div className="col g12">
        {concepts.map((c) => (
          <QuoteCard key={c.id} concept={c} onOpen={() => navigate(`/concepten/${c.id}`)} statusLabel={statusLabel(c.status)} statusBadge={statusBadge(c.status)} />
        ))}
      </div>
    </div>
  );
}

function QuoteCard({ concept: c, onOpen, statusLabel, statusBadge }: { concept: SavedConcept; onOpen: () => void; statusLabel: string; statusBadge: string }) {
  return (
    <div className="concept-card">
      <div className="concept-card-top" onClick={onOpen}>
        <div className="concept-thumb"><BuildIcon size={22} /></div>
        <div className="f1">
          <div style={{ fontWeight: 500, fontSize: "0.875rem", color: "var(--near-black)" }}>{c.name || c.event?.type || "Naamloos"}</div>
          <div className="muted" style={{ fontSize: "0.75rem", marginTop: 1 }}>{c.event?.date || "—"}</div>
          <div className="row g4 mt8" style={{ justifyContent: "space-between" }}>
            <span className="tbrown" style={{ fontSize: "0.875rem", fontWeight: 500 }}>{eur(c.breakdown.total_gross)}</span>
            <span className={statusBadge}>{statusLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
