import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { adminApi } from "../api";
import { usePrefs } from "../../store/prefs";
import { createAdminT } from "../i18n";
import type { AdminConcept } from "../types";
import { CheckIcon, MailIcon, ConceptIcon } from "../../components/icons";

const STATUS_OPTIONS = [
  "draft", "saved", "quotation_requested", "awaiting_payment",
  "paid", "completed", "cancelled",
];

export default function AdminConceptDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { language } = usePrefs();
  const t = createAdminT(language);
  const [concept, setConcept] = useState<AdminConcept | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [statusReason, setStatusReason] = useState("");
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getConcept(id).then((data) => {
      setConcept(data);
      setLoading(false);
    });
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!concept) return;
    setPendingStatus(newStatus);
    setShowStatusMenu(false);
    const { error } = await adminApi.updateConceptStatus(concept.id, newStatus, statusReason || undefined);
    if (!error) {
      setConcept({ ...concept, status: newStatus });
      setStatusReason("");
    }
    setPendingStatus(null);
  };

  if (loading) {
    return <div className="admin-loading"><div className="admin-loading-dot" /></div>;
  }

  if (!concept) {
    return <div className="admin-empty">Concept niet gevonden</div>;
  }

  const eventData = concept.event_data as Record<string, unknown> | null;
  const themeData = concept.theme_data as Record<string, unknown> | null;

  return (
    <div className="admin-concept-detail">
      <div className="admin-detail-header">
        <button className="admin-back-btn" onClick={() => navigate("/admin/concepten")}>
          {t("admin.detail.back")}
        </button>
        <div className="admin-detail-title-row">
          <h1 className="admin-page-title">
            {concept.reference_number ?? concept.id.slice(0, 8).toUpperCase()}
          </h1>
          <span className={`admin-status-badge admin-status-${concept.status}`}>
            {concept.status}
          </span>
        </div>
        {concept.customer_email && (
          <p className="admin-page-subtitle">{concept.customer_email}</p>
        )}
      </div>

      <div className="admin-detail-actions">
        <button className="admin-btn-secondary" onClick={() => navigate(`/admin/concepten/${concept.id}/goedkeuren`)}>
          <CheckIcon size={18} />
          {t("admin.detail.approve")}
        </button>
        <button className="admin-btn-secondary" onClick={() => navigate(`/admin/offertes?concept=${concept.id}`)}>
          <ConceptIcon size={18} />
          {t("admin.detail.create_quote")}
        </button>
        <button className="admin-btn-secondary" onClick={() => navigate(`/admin/berichten?concept=${concept.id}`)}>
          <MailIcon size={18} />
          {t("admin.detail.send_message")}
        </button>
        <div className="admin-overflow-wrapper">
          <button
            className="admin-btn-overflow"
            onClick={() => setShowStatusMenu(!showStatusMenu)}
          >
            ⋮
          </button>
          {showStatusMenu && (
            <div className="admin-overflow-menu">
              <div className="admin-overflow-header">{t("admin.detail.change_status")}</div>
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  className="admin-overflow-item"
                  onClick={() => handleStatusChange(s)}
                  disabled={pendingStatus === s}
                >
                  {s} {pendingStatus === s && "..."}
                </button>
              ))}
              <div className="admin-overflow-reason">
                <input
                  className="admin-input admin-input-sm"
                  placeholder="Reden (optioneel)"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="admin-detail-sections">
        {eventData && (
          <DetailSection title={t("admin.detail.event_info")}>
            <DetailRow label={t("admin.concepts.event_date")} value={String(eventData.date ?? "—")} />
            <DetailRow label={t("admin.concepts.city")} value={String(eventData.city ?? "—")} />
            <DetailRow label="Type" value={String(eventData.type ?? "—")} />
            <DetailRow label="Kinderen" value={String(eventData.num_children ?? "—")} />
            <DetailRow label="Volwassenen" value={String(eventData.num_adults ?? "—")} />
          </DetailSection>
        )}

        {themeData && (
          <DetailSection title={t("admin.detail.theme_colors")}>
            <DetailRow label="Thema" value={String((themeData as { theme?: string }).theme ?? "—")} />
            <DetailRow label="Kleuren" value={Array.isArray((themeData as { colors?: unknown[] }).colors) ? (themeData as { colors: string[] }).colors.join(", ") : "—"} />
          </DetailSection>
        )}

        <DetailSection title={t("admin.detail.pricing")}>
          <DetailRow label="Subtotaal" value={`€ ${(concept.subtotal_gross ?? 0).toFixed(2)}`} />
          <DetailRow label="BTW" value={`€ ${(concept.vat_portion ?? 0).toFixed(2)}`} />
          <DetailRow label="Totaal" value={`€ ${(concept.total_gross ?? 0).toFixed(2)}`} bold />
          <DetailRow label="Aanbetaling" value={`€ ${(concept.deposit_amount ?? 0).toFixed(2)}`} />
          <DetailRow label="Resterend" value={`€ ${(concept.remaining_amount ?? 0).toFixed(2)}`} />
        </DetailSection>

        <DetailSection title={t("admin.detail.location")}>
          <DetailRow label="Adres" value={String((eventData as { address?: string } | null)?.address ?? "—")} />
          <DetailRow label="Postcode" value={String((eventData as { postal_code?: string } | null)?.postal_code ?? "—")} />
          <DetailRow label="Binnen/Buiten" value={String((eventData as { indoor_outdoor?: string } | null)?.indoor_outdoor ?? "—")} />
        </DetailSection>
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="admin-detail-section">
      <h3 className="admin-detail-section-title">{title}</h3>
      <div className="admin-detail-rows">{children}</div>
    </div>
  );
}

function DetailRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`admin-detail-row ${bold ? "bold" : ""}`}>
      <span className="admin-detail-label">{label}</span>
      <span className="admin-detail-value">{value}</span>
    </div>
  );
}
