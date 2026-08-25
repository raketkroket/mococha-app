import { useState, useEffect } from "react";
import { supabase } from "../../data/api";
import { usePrefs } from "../../store/prefs";
import { createAdminT } from "../i18n";

interface CustomerRow {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  is_admin: boolean;
}

export default function AdminCustomers() {
  const { language } = usePrefs();
  const t = createAdminT(language);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("profiles")
      .select("id, email, full_name, phone, created_at, is_admin")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setCustomers((data as CustomerRow[]) || []);
        setLoading(false);
      });
  }, []);

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.email?.toLowerCase().includes(q) ||
      c.full_name?.toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
  };

  if (loading) {
    return <div className="admin-loading"><div className="admin-loading-dot" /></div>;
  }

  return (
    <div className="admin-customers">
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t("admin.nav.customers")}</h1>
      </div>

      <div className="admin-search-bar">
        <input
          className="admin-input"
          placeholder={t("admin.common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty">Geen klanten gevonden</div>
      ) : (
        <div className="admin-list">
          {filtered.map((customer) => (
            <div key={customer.id} className="admin-customer-row">
              <div className="admin-customer-avatar">
                {(customer.full_name ?? customer.email ?? "M").charAt(0).toUpperCase()}
              </div>
              <div className="admin-customer-info">
                <span className="admin-customer-name">
                  {customer.full_name ?? customer.email}
                </span>
                <span className="admin-customer-meta">
                  {customer.email} · {formatDate(customer.created_at)}
                </span>
              </div>
              {customer.is_admin && (
                <span className="admin-status-badge admin-status-published">Admin</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
