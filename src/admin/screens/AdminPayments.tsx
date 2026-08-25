import { useState, useEffect } from "react";
import { adminApi } from "../api";
import { usePrefs } from "../../store/prefs";
import { createAdminT } from "../i18n";
import { CreditCard } from "../../components/icons";

interface PaymentRow {
  id: string;
  party_build_id: string | null;
  payment_type: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  party_builds?: { reference_number: string | null; name: string | null } | null;
}

export default function AdminPayments() {
  const { language } = usePrefs();
  const t = createAdminT(language);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getPayments().then((data) => {
      setPayments((data as PaymentRow[]) || []);
      setLoading(false);
    });
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  };

  if (loading) {
    return <div className="admin-loading"><div className="admin-loading-dot" /></div>;
  }

  return (
    <div className="admin-payments">
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t("admin.nav.payments")}</h1>
      </div>

      {payments.length === 0 ? (
        <div className="admin-empty">Geen betalingen gevonden</div>
      ) : (
        <div className="admin-list">
          {payments.map((payment) => (
            <div key={payment.id} className="admin-payment-row">
              <div className="admin-payment-icon">
                <CreditCard size={20} />
              </div>
              <div className="admin-payment-info">
                <span className="admin-payment-ref">
                  {payment.party_builds?.reference_number ?? payment.party_builds?.name ?? "—"}
                </span>
                <span className="admin-payment-meta">
                  {payment.payment_type} · {formatDate(payment.created_at)}
                </span>
              </div>
              <div className="admin-payment-amount">
                € {Number(payment.amount).toFixed(2)}
              </div>
              <span className={`admin-status-badge ${payment.paid_at ? "admin-status-published" : "admin-status-draft"}`}>
                {payment.paid_at ? "Betaald" : "Open"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
