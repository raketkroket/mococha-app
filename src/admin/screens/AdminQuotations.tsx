import { useState, useEffect } from "react";
import { adminApi } from "../api";
import { usePrefs } from "../../store/prefs";
import { createAdminT } from "../i18n";
import type { AdminQuotation } from "../types";

const STATUS_FILTERS = ["all", "draft", "sent", "viewed", "accepted", "expired", "withdrawn"];

export default function AdminQuotations() {
  const { language } = usePrefs();
  const t = createAdminT(language);
  const [quotations, setQuotations] = useState<AdminQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    adminApi.getQuotations(filter === "all" ? undefined : filter).then((data) => {
      setQuotations(data);
      setLoading(false);
    });
  }, [filter]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  };

  return (
    <div className="admin-quotations">
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t("admin.nav.quotations")}</h1>
      </div>

      <div className="admin-filter-bar">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            className={`admin-filter-chip ${filter === s ? "active" : ""}`}
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "Alle" : s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-list">
          {[0, 1, 2].map((i) => <div key={i} className="admin-quotation-row admin-skeleton" />)}
        </div>
      ) : quotations.length === 0 ? (
        <div className="admin-empty">Geen offertes gevonden</div>
      ) : (
        <div className="admin-list">
          {quotations.map((quot) => (
            <div key={quot.id} className="admin-quotation-row">
              <div className="admin-quotation-info">
                <span className="admin-quotation-customer">
                  {quot.customer_name ?? quot.customer_email ?? "Onbekend"}
                </span>
                <span className="admin-quotation-meta">
                  v{quot.version} · {formatDate(quot.created_at)} · verloopt {formatDate(quot.expires_at)}
                </span>
              </div>
              <div className="admin-quotation-amount">
                € {quot.total.toFixed(2)}
              </div>
              <span className={`admin-status-badge admin-status-${quot.status}`}>
                {quot.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
