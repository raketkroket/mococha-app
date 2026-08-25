import { useState, useEffect } from "react";
import { adminApi } from "../api";
import { usePrefs } from "../../store/prefs";
import { createAdminT } from "../i18n";
import type { AuditLog } from "../types";

export default function AdminAuditLog() {
  const { language } = usePrefs();
  const t = createAdminT(language);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getAuditLogs(100).then((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return <div className="admin-loading"><div className="admin-loading-dot" /></div>;
  }

  return (
    <div className="admin-audit">
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t("admin.nav.audit")}</h1>
      </div>

      {logs.length === 0 ? (
        <div className="admin-empty">Geen audit logs gevonden</div>
      ) : (
        <div className="admin-audit-list">
          {logs.map((log) => (
            <div key={log.id} className="admin-audit-row">
              <div className="admin-audit-action">
                <span className="admin-audit-action-label">{log.action}</span>
                <span className="admin-audit-entity">{log.entity_type}</span>
              </div>
              {log.reason && <div className="admin-audit-reason">{log.reason}</div>}
              <div className="admin-audit-time">{formatDate(log.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
