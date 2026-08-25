import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../api";
import { supabase } from "../../data/api";
import { usePrefs } from "../../store/prefs";
import { createAdminT } from "../i18n";
import type { AdminConversation } from "../types";

const FILTERS = ["unread", "all", "waiting_mococha", "waiting_customer", "closed"];

export default function AdminMessages() {
  const navigate = useNavigate();
  const { language } = usePrefs();
  const t = createAdminT(language);
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    adminApi.getConversations().then((data) => {
      setConversations(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const sb = supabase;
    const channel = sb
      .channel("admin-conversations-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => {
          adminApi.getConversations().then((data) => setConversations(data));
        },
      )
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, []);

  const filtered = conversations.filter((c) => {
    switch (filter) {
      case "unread": return c.unread_by_admin;
      case "waiting_mococha": return c.unread_by_admin && c.status !== "closed";
      case "waiting_customer": return !c.unread_by_admin && c.status !== "closed";
      case "closed": return c.status === "closed";
      default: return true;
    }
  });

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}u`;
    return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  };

  return (
    <div className="admin-messages">
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t("admin.messages.title")}</h1>
      </div>

      <div className="admin-filter-bar">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`admin-filter-chip ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {t(`admin.messages.filter_${f}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-list">
          {[0, 1, 2].map((i) => <div key={i} className="admin-message-row admin-skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">{t("admin.messages.empty")}</div>
      ) : (
        <div className="admin-list">
          {filtered.map((conv) => (
            <button
              key={conv.id}
              className={`admin-message-row ${conv.unread_by_admin ? "unread" : ""}`}
              onClick={() => navigate(`/admin/berichten/${conv.id}`)}
            >
              <div className="admin-message-avatar">
                {(conv.customer_name ?? conv.customer_email ?? "M").charAt(0).toUpperCase()}
              </div>
              <div className="admin-message-content">
                <div className="admin-message-top">
                  <span className="admin-message-name">
                    {conv.customer_name ?? conv.customer_email ?? "Onbekend"}
                  </span>
                  <span className="admin-message-time">{formatTime(conv.last_message_at)}</span>
                </div>
                <div className="admin-message-subject">{conv.subject}</div>
                <div className="admin-message-meta">
                  {conv.unread_by_admin && <span className="admin-unread-dot" />}
                  <span className="admin-message-priority">{conv.priority}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
