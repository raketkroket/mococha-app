import { useNavigate } from "react-router-dom";
import { useParty, type SavedConcept, type ConceptStatus } from "../store/party";
import { eur } from "../utils/format";
import { BuildIcon } from "../components/icons";
import { useState } from "react";
import { useI18n } from "../i18n";

const sl: Record<ConceptStatus, string> = {
  draft: "status.draft", saved: "status.saved", quotation_requested: "status.quotation_requested",
  awaiting_payment: "status.awaiting_payment", paid: "status.paid",
  completed: "status.completed", archived: "status.archived",
};
const sb: Record<ConceptStatus, string> = {
  draft: "badge badge-draft", saved: "badge badge-draft", quotation_requested: "badge badge-pending",
  awaiting_payment: "badge badge-pending", paid: "badge badge-paid",
  completed: "badge badge-approved", archived: "badge badge-draft",
};

export default function Concepts() {
  const navigate = useNavigate();
  const party = useParty();
  const { t } = useI18n();
  const allConcepts = party.concepts.filter((c) => c.status !== "archived");
  const hasDraft = (party.selections.length > 0 || party.event.type) && !party.activeConceptId;

  const inProgress = allConcepts.filter((c) => c.status === "draft" || c.status === "saved" || c.status === "quotation_requested" || c.status === "awaiting_payment");
  const saved = allConcepts.filter((c) => c.status === "paid");
  const completed = allConcepts.filter((c) => c.status === "completed");

  const renderSection = (label: string, items: SavedConcept[]) => {
    if (items.length === 0) return null;
    return (
      <div key={label} style={{ marginTop: "var(--s6)" }}>
        <div className="section-label">{label} · {items.length}</div>
        <div className="col g12">
          {items.map((c) => (
            <ConceptCard key={c.id} concept={c}
              onOpen={() => navigate(`/concepten/${c.id}`)}
              onEdit={() => { party.loadConcept(c.id); navigate("/bouwen"); }}
              onDuplicate={() => { party.duplicateConcept(c.id); }}
              onDelete={() => { party.archiveConcept(c.id); }}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: "var(--s5)" }}>
        <h1 className="screen-title">{t("concepts.title")}</h1>
        <p className="muted" style={{ marginTop: "var(--s1)", fontSize: "0.875rem" }}>{t("concepts.subtitle")}</p>
      </div>

      {hasDraft && (
        <div>
          <div className="section-label">{t("concepts.current_draft")}</div>
          <button className="start-card mb16" onClick={() => navigate("/bouwen")}>
            <div className="start-card-icon"><BuildIcon size={22} /></div>
            <div className="f1">
              <div className="start-card-title">{party.event?.type || t("home.draft_no_type")}</div>
              <div className="start-card-desc">{party.selections.length} {t("home.draft_parts")}</div>
            </div>
            <span className="badge badge-draft">{t("status.draft")}</span>
          </button>
        </div>
      )}

      {allConcepts.length === 0 && !hasDraft && (
        <div className="empty">
          <div className="empty-monogram">M</div>
          <h3>{t("concepts.empty_title")}</h3>
          <p>{t("concepts.empty_body")}</p>
          <button className="btn bp blk" style={{ maxWidth: 220, margin: "0 auto", marginTop: "var(--s3)" }} onClick={() => navigate("/bouwen")}>{t("concepts.start_build")}</button>
        </div>
      )}

      {renderSection(t("concepts.in_progress"), inProgress)}
      {renderSection(t("concepts.saved"), saved)}
      {renderSection(t("concepts.completed"), completed)}
    </div>
  );
}

function ConceptCard({ concept: c, onOpen, onEdit, onDuplicate, onDelete }: { concept: SavedConcept; onOpen: () => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const { t } = useI18n();
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div className="concept-card">
      <div className="concept-card-top" onClick={onOpen}>
        <div className="concept-thumb"><BuildIcon size={22} /></div>
        <div className="f1">
          <div style={{ fontWeight: 500, fontSize: "0.9375rem", color: "var(--near-black)" }}>{c.name || c.event?.type || t("detail.untitled")}</div>
          <div className="muted" style={{ fontSize: "0.78rem", marginTop: 1 }}>{c.event?.date || t("detail.no_date")}</div>
          <div className="row g4 mt8" style={{ justifyContent: "space-between" }}>
            <span className="tbrown" style={{ fontSize: "0.875rem", fontWeight: 500 }}>{eur(c.breakdown.total_gross)}</span>
            <span className={sb[c.status]}>{t(sl[c.status])}</span>
          </div>
        </div>
      </div>
      <div className="concept-actions">
        <button onClick={onOpen}>{t("concepts.detail")}</button>
        <button onClick={onEdit}>{t("concepts.edit")}</button>
        <button onClick={onDuplicate}>{t("concepts.duplicate")}</button>
        {confirmDelete ? (
          <button className="danger" onClick={onDelete}>{t("concepts.confirm")}</button>
        ) : (
          <button className="danger" onClick={() => setConfirmDelete(true)}>{t("concepts.delete")}</button>
        )}
      </div>
    </div>
  );
}
