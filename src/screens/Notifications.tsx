import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../data/api";
import { useAuth } from "../store/auth";
import { useI18n } from "../i18n";
import { BellIcon, CheckIcon } from "../components/icons";

interface Notification {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export default function Notifications() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const { t } = useI18n();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !user) { setLoading(false); return; }
    supabase
      .from("party_notifications")
      .select("id, title, body, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setNotifs((data as Notification[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  const markRead = async (id: string) => {
    if (!supabase) return;
    await supabase.from("party_notifications").update({ is_read: true }).eq("id", id);
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  return (
    <div>
      <button className="bg-link" style={{ marginBottom: "var(--s5)" }} onClick={() => navigate("/account")}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>{t("notifications.back")}</span>
      </button>
      <h1 className="screen-title mb8">{t("notifications.title")}</h1>
      <p className="muted mb24" style={{ fontSize: "0.875rem" }}>{t("notifications.desc")}</p>

      {loading && <div className="muted">Loading...</div>}

      {!loading && notifs.length === 0 && (
        <div className="empty">
          <div className="empty-monogram">M</div>
          <h3>{t("notifications.noMessages")}</h3>
          <p>{t("notifications.noMessagesDesc")}</p>
        </div>
      )}

      <div className="col g8">
        {notifs.map((n) => (
          <div key={n.id} className="concept-card" style={{ padding: "var(--s4)", opacity: n.is_read ? 0.6 : 1 }}>
            <div className="rb">
              <div style={{ display: "flex", alignItems: "center", gap: "var(--s2)" }}>
                <BellIcon size={16} style={{ color: "var(--taupe)" }} />
                <span style={{ fontWeight: 500, fontSize: "0.875rem", color: "var(--near-black)" }}>{n.title}</span>
              </div>
              {!n.is_read && <button className="bg-link" style={{ fontSize: "0.78rem" }} onClick={() => markRead(n.id)}>{t("notifications.markRead")}</button>}
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--taupe)", marginTop: "var(--s2)" }}>{n.body}</p>
            {n.is_read && <div style={{ marginTop: "var(--s1)", display: "flex", alignItems: "center", gap: 4, color: "var(--taupe-light)", fontSize: "0.72rem" }}><CheckIcon size={12} /> {t("notifications.read")}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
