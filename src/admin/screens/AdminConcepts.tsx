import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../api";
import { usePrefs } from "../../store/prefs";
import { createAdminT } from "../i18n";
import type { AdminConcept } from "../types";


const STATUS_FILTERS = [
  "all", "draft", "saved", "quotation_requested", "awaiting_payment",
  "paid", "completed", "cancelled",
];

export default function AdminConcepts() {
  const navigate = useNavigate();
  const { language } = usePrefs();
  const t = createAdminT(language);
  const [concepts, setConcepts] = useState<AdminConcept[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    adminApi.getConcepts(filter === "all" ? undefined : filter).then((data) => {
      setConcepts(data);
      setLoading(false);
    });
  }, [filter]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount == null) return "—";
    return `€ ${amount.toFixed(2)}`;
  };

  const getEventDate = (concept: AdminConcept): string | null => {
    const eventData = concept.event_data as { date?: string } | null;
    return eventData?.date ?? null;
  };

  const getCity = (concept: AdminConcept): string => {
    const eventData = concept.event_data as { city?: string } | null;
    return eventData?.city ?? "—";
  };

  return (
    <div className="admin-concepts">
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t("admin.concepts.title")}</h1>
      </div>

      <div className="admin-filter-bar">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            className={`admin-filter-chip ${filter === s ? "active" : ""}`}
            onClick={() => setFilter(s)}
          >
            {t(`admin.concepts.filter_${s === "all" ? "all" : s === "quotation_requested" ? "quote" : s === "awaiting_payment" ? "payment" : s}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-list">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="admin-concept-card admin-skeleton" />
          ))}
        </div>
      ) : concepts.length === 0 ? (
        <div className="admin-empty">{t("admin.concepts.empty")}</div>
      ) : (
        <div className="admin-list">
          {concepts.map((concept) => (
            <button
              key={concept.id}
              className="admin-concept-card"
              onClick={() => navigate(`/admin/concepten/${concept.id}`)}
            >
              <div className="admin-concept-card-header">
                <span className="admin-concept-ref">
                  {concept.reference_number ?? concept.id.slice(0, 8).toUpperCase()}
                </span>
                <span className={`admin-status-badge admin-status-${concept.status}`}>
                  {t(`admin.concepts.filter_${concept.status === "quotation_requested" ? "quote" : concept.status === "awaiting_payment" ? "payment" : concept.status}`)}
                </span>
              </div>
              <div className="admin-concept-card-body">
                <div className="admin-concept-info">
                  <span className="admin-concept-customer">
                    {concept.customer_email ?? t("admin.concepts.customer")}
                  </span>
                  <span className="admin-concept-meta">
                    {formatDate(getEventDate(concept))} · {getCity(concept)}
                  </span>
                </div>
                <div className="admin-concept-pricing">
                  <span className="admin-concept-total">
                    {formatCurrency(concept.total_gross)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
