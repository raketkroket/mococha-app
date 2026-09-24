import { useState, useEffect } from "react";
import { adminApi } from "../api";
import { usePrefs } from "../../store/prefs";
import { createAdminT } from "../i18n";
import type { AdminQuotation } from "../types";
import { AdminFilterBar } from "../components/AdminFilterBar";

const STATUS_FILTERS = ["all", "draft", "sent", "viewed", "accepted", "expired", "withdrawn"];
const STATUS_LABELS: Record<string, string> = {
  all: "Alles",
  draft: "Concept",
  sent: "Verstuurd",
  viewed: "Bekeken",
  accepted: "Geaccepteerd",
  expired: "Verlopen",
  withdrawn: "Ingetrokken",
};

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

  const formatCurrency = (amount: number) => new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);

  return (
    <div className="admin-quotations">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t("admin.nav.quotations")}</h1>
          <p className="admin-page-subtitle">Bekijk en volg offertes voor klanten.</p>
        </div>
      </div>

      <AdminFilterBar
        ariaLabel="Filter offertes"
        options={STATUS_FILTERS.map((status) => ({ value: status, label: STATUS_LABELS[status] }))}
        value={filter}
        onChange={setFilter}
        primaryCount={2}
      />

      {loading ? (
        <div className="admin-list">
          {[0, 1, 2].map((i) => <div key={i} className="admin-quotation-row admin-skeleton" />)}
        </div>
      ) : quotations.length === 0 ? (
        <div className="admin-empty admin-empty-card">
          <strong>Geen offertes gevonden</strong>
          <p>{filter === "all" ? "Nieuwe offertes verschijnen hier." : "Er zijn geen offertes met deze status."}</p>
          {filter !== "all" && <button className="admin-btn-secondary" onClick={() => setFilter("all")}>Alle offertes tonen</button>}
        </div>
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
                {formatCurrency(quot.total)}
              </div>
              <span className={`admin-status-badge admin-status-${quot.status}`}>
                {STATUS_LABELS[quot.status] ?? quot.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
