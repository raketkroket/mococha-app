import { useState, useEffect } from "react";
import { adminApi } from "../api";
import { usePrefs } from "../../store/prefs";
import { createAdminT } from "../i18n";
import type { AdminEvent } from "../types";
import { TruckIcon } from "../../components/icons";

export default function AdminAgenda() {
  const { language } = usePrefs();
  const t = createAdminT(language);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "week" | "month">("list");

  useEffect(() => {
    adminApi.getEvents().then((data) => {
      setEvents(data);
      setLoading(false);
    });
  }, []);

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return <div className="admin-loading"><div className="admin-loading-dot" /></div>;
  }

  return (
    <div className="admin-agenda">
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t("admin.nav.agenda")}</h1>
      </div>

      <div className="admin-segmented">
        <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>Lijst</button>
        <button className={view === "week" ? "active" : ""} onClick={() => setView("week")}>Week</button>
        <button className={view === "month" ? "active" : ""} onClick={() => setView("month")}>Maand</button>
      </div>

      {events.length === 0 ? (
        <div className="admin-empty">Geen events gepland</div>
      ) : (
        <div className="admin-list">
          {events.map((event) => (
            <div key={event.id} className="admin-agenda-row">
              <div className="admin-agenda-date">
                <span className="admin-agenda-day">
                  {event.start_time ? new Date(event.start_time).getDate() : "—"}
                </span>
                <span className="admin-agenda-month">
                  {event.start_time ? new Date(event.start_time).toLocaleDateString("nl-NL", { month: "short" }) : ""}
                </span>
              </div>
              <div className="admin-agenda-info">
                <span className="admin-agenda-title">{event.title ?? event.event_type ?? "Event"}</span>
                <span className="admin-agenda-meta">
                  {event.customer_name ?? "—"} · {event.city ?? "—"} · {formatTime(event.start_time)}
                </span>
              </div>
              <div className="admin-agenda-badges">
                {event.requires_large_bus && (
                  <span className="admin-status-badge admin-status-warning">
                    <TruckIcon size={14} /> Bus
                  </span>
                )}
                <span className={`admin-status-badge admin-status-${event.status}`}>
                  {event.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
