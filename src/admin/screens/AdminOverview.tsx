import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../api";
import { supabase } from "../../data/api";
import { usePrefs } from "../../store/prefs";
import { createAdminT } from "../i18n";
import { useAdminAuth } from "../auth";
import {
  MailIcon,
  ConceptIcon,
  CreditCard,
  ClockIcon,
  SparklesIcon,
  LayersIcon,
  SearchIcon,
  ImageIcon,
  TrendingIcon,
} from "../../components/icons";

interface Stats {
  newMessages: number;
  pendingConcepts: number;
  openPayments: number;
  upcomingEvents: number;
}

interface TrendData {
  date: string;
  concepts: number;
  messages: number;
  payments: number;
}

export default function AdminOverview() {
  const navigate = useNavigate();
  const { language } = usePrefs();
  const t = createAdminT(language);
  const { user } = useAdminAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getOverviewStats().then((s) => {
      setStats(s);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceStr = since.toISOString().slice(0, 10);

    Promise.all([
      supabase.from("party_builds").select("created_at").gte("created_at", sinceStr),
      supabase.from("conversations").select("created_at").gte("created_at", sinceStr),
      supabase.from("payments").select("created_at").gte("created_at", sinceStr),
    ]).then(([conceptsRes, msgsRes, paysRes]) => {
      const days: Record<string, TrendData> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        days[key] = { date: key, concepts: 0, messages: 0, payments: 0 };
      }
      for (const row of (conceptsRes.data ?? []) as { created_at: string }[]) {
        const key = row.created_at.slice(0, 10);
        if (days[key]) days[key].concepts++;
      }
      for (const row of (msgsRes.data ?? []) as { created_at: string }[]) {
        const key = row.created_at.slice(0, 10);
        if (days[key]) days[key].messages++;
      }
      for (const row of (paysRes.data ?? []) as { created_at: string }[]) {
        const key = row.created_at.slice(0, 10);
        if (days[key]) days[key].payments++;
      }
      setTrends(Object.values(days));
    });
  }, []);

  const statCards = [
    { icon: MailIcon, count: stats?.newMessages ?? 0, label: t("admin.overview.new_messages"), path: "/admin/berichten", color: "#d4889a", bg: "#f8e1e7" },
    { icon: ConceptIcon, count: stats?.pendingConcepts ?? 0, label: t("admin.overview.pending_concepts"), path: "/admin/concepten", color: "#5b4034", bg: "#e8d5c4" },
    { icon: CreditCard, count: stats?.openPayments ?? 0, label: t("admin.overview.open_payments"), path: "/admin/betalingen", color: "#6b5d54", bg: "#e0d6ce" },
    { icon: ClockIcon, count: stats?.upcomingEvents ?? 0, label: t("admin.overview.upcoming_events"), path: "/admin/agenda", color: "#5a8a6a", bg: "#d4e8da" },
  ];

  const quickActions = [
    { icon: ImageIcon, label: t("admin.overview.upload_photo"), path: "/admin/content" },
    { icon: SparklesIcon, label: t("admin.overview.add_inspiration"), path: "/admin/content" },
    { icon: LayersIcon, label: t("admin.overview.new_theme"), path: "/admin/content" },
    { icon: MailIcon, label: t("admin.overview.reply_message"), path: "/admin/berichten" },
    { icon: ConceptIcon, label: t("admin.overview.create_quote"), path: "/admin/offertes" },
    { icon: SearchIcon, label: t("admin.overview.find_concept"), path: "/admin/concepten" },
  ];

  const maxTrend = Math.max(1, ...trends.map((d) => Math.max(d.concepts, d.messages, d.payments)));

  return (
    <div className="admin-overview">
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t("admin.overview.title")}</h1>
        {user && <p className="admin-page-subtitle">{t("admin.overview.welcome")}, {user.email}</p>}
      </div>

      <div className="admin-stat-grid">
        {loading
          ? [0, 1, 2, 3].map((i) => <div key={i} className="admin-stat-card admin-skeleton" />)
          : statCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <button key={i} className="admin-stat-card" onClick={() => navigate(card.path)}>
                  <div className="admin-stat-icon" style={{ background: card.bg, color: card.color }}>
                    <Icon size={22} />
                  </div>
                  <div className="admin-stat-content">
                    <span className="admin-stat-count">{card.count}</span>
                    <span className="admin-stat-label">{card.label}</span>
                  </div>
                </button>
              );
            })}
      </div>

      {trends.length > 0 && (
        <div className="admin-section">
          <h2 className="admin-section-title">
            <TrendingIcon size={18} />
            {language === "nl" ? "30-daagse trends" : "30-day trends"}
          </h2>
          <div className="admin-trends-chart">
            {trends.map((d) => (
              <div key={d.date} className="admin-trend-bar-group" title={`${d.date}: ${d.concepts} concepts, ${d.messages} messages, ${d.payments} payments`}>
                <div className="admin-trend-bar-stack">
                  <div className="admin-trend-bar admin-trend-concepts" style={{ height: `${(d.concepts / maxTrend) * 100}%` }} />
                  <div className="admin-trend-bar admin-trend-messages" style={{ height: `${(d.messages / maxTrend) * 100}%` }} />
                  <div className="admin-trend-bar admin-trend-payments" style={{ height: `${(d.payments / maxTrend) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="admin-trends-legend">
            <span className="admin-trend-legend-item"><span className="admin-trend-dot admin-trend-concepts" /> {language === "nl" ? "Concepten" : "Concepts"}</span>
            <span className="admin-trend-legend-item"><span className="admin-trend-dot admin-trend-messages" /> {language === "nl" ? "Berichten" : "Messages"}</span>
            <span className="admin-trend-legend-item"><span className="admin-trend-dot admin-trend-payments" /> {language === "nl" ? "Betalingen" : "Payments"}</span>
          </div>
        </div>
      )}

      <div className="admin-section">
        <h2 className="admin-section-title">{t("admin.overview.quick_actions")}</h2>
        <div className="admin-quick-actions">
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <button key={i} className="admin-quick-action" onClick={() => navigate(action.path)}>
                <Icon size={20} />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
