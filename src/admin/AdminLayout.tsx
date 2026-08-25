import { useState, useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "./auth";
import { usePrefs } from "../store/prefs";
import { createAdminT } from "./i18n";
import MfaChallenge from "../screens/MfaChallenge";
import {
  HomeIcon,
  ConceptIcon,
  MailIcon,
  InspireIcon,
  SettingsIcon,
  ChevronRight,
  ShieldIcon,
  BellIcon,
  CreditCard,
  PackageIcon,
  LayersIcon,
  SparklesIcon,
  UserIcon,
  ClockIcon,
} from "../components/icons";

export function AdminLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { isAdmin, loading, needsMfaChallenge, verifyMfaChallenge } = useAdminAuth();
  const { language } = usePrefs();
  const t = createAdminT(language);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const check = () => setIsTablet(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-dot" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-unauthorized">
        <div className="admin-unauthorized-icon">
          <ShieldIcon size={40} />
        </div>
        <h1 className="admin-unauthorized-title">{t("admin.unauthorized.title")}</h1>
        <p className="admin-unauthorized-body">{t("admin.unauthorized.body")}</p>
        <button className="admin-btn-secondary" onClick={() => navigate("/")}>
          {t("admin.unauthorized.back")}
        </button>
      </div>
    );
  }

  if (needsMfaChallenge) {
    const handleMfaSuccess = async () => {
      await verifyMfaChallenge();
    };
    return (
      <div className="admin-main" style={{ display: "flex", justifyContent: "center", paddingTop: "var(--s8)" }}>
        <MfaChallenge onSuccess={handleMfaSuccess} />
      </div>
    );
  }

  if (isTablet) {
    return <AdminSidebarLayout>{children}</AdminSidebarLayout>;
  }

  return <AdminPhoneLayout>{children}</AdminPhoneLayout>;
}

function AdminPhoneLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { language } = usePrefs();
  const t = createAdminT(language);

  const tabs = [
    { path: "/admin", icon: HomeIcon, label: t("admin.tab.overview"), exact: true },
    { path: "/admin/concepten", icon: ConceptIcon, label: t("admin.tab.concepts") },
    { path: "/admin/berichten", icon: MailIcon, label: t("admin.tab.messages") },
    { path: "/admin/content", icon: InspireIcon, label: t("admin.tab.content") },
    { path: "/admin/meer", icon: SettingsIcon, label: t("admin.tab.more") },
  ];

  const isActive = (path: string, exact?: boolean) =>
    exact ? pathname === path : pathname.startsWith(path);

  return (
    <div className="admin-phone-layout">
      <header className="admin-header">
        <div className="admin-header-brand">
          <span className="admin-header-logo">M</span>
          <span className="admin-header-name">MOCOCHA</span>
          <span className="admin-header-badge">Beheer</span>
        </div>
      </header>
      <main className="admin-main">{children}</main>
      <nav className="admin-tabbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path, tab.exact);
          return (
            <button
              key={tab.path}
              className={`admin-tab ${active ? "active" : ""}`}
              onClick={() => navigate(tab.path)}
            >
              <Icon size={22} />
              <span className="admin-tab-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function AdminSidebarLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { language } = usePrefs();
  const t = createAdminT(language);
  const { signOut } = useAdminAuth();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { path: "/admin", icon: HomeIcon, label: t("admin.tab.overview"), exact: true },
    { path: "/admin/concepten", icon: ConceptIcon, label: t("admin.tab.concepts") },
    { path: "/admin/agenda", icon: ClockIcon, label: t("admin.nav.agenda") },
    { path: "/admin/klanten", icon: UserIcon, label: t("admin.nav.customers") },
    { path: "/admin/berichten", icon: MailIcon, label: t("admin.nav.messages") },
    { path: "/admin/offertes", icon: LayersIcon, label: t("admin.nav.quotations") },
    { path: "/admin/betalingen", icon: CreditCard, label: t("admin.nav.payments") },
    { path: "/admin/inspiratie", icon: SparklesIcon, label: t("admin.nav.inspiration") },
    { path: "/admin/themas", icon: InspireIcon, label: t("admin.nav.themes") },
    { path: "/admin/onderdelen", icon: PackageIcon, label: t("admin.nav.components") },
    { path: "/admin/media", icon: SparklesIcon, label: t("admin.nav.media") },
    { path: "/admin/notificaties", icon: BellIcon, label: t("admin.nav.notifications") },
    { path: "/admin/medewerkers", icon: UserIcon, label: t("admin.nav.staff") },
    { path: "/admin/instellingen", icon: SettingsIcon, label: t("admin.nav.settings") },
  ];

  const isActive = (path: string, exact?: boolean) =>
    exact ? pathname === path : pathname.startsWith(path);

  return (
    <div className={`admin-sidebar-layout ${collapsed ? "collapsed" : ""}`}>
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-brand">
            <span className="admin-sidebar-logo">M</span>
            {!collapsed && (
              <div className="admin-sidebar-brand-text">
                <span className="admin-sidebar-name">MOCOCHA</span>
                <span className="admin-sidebar-badge">Beheer</span>
              </div>
            )}
          </div>
          <button
            className="admin-sidebar-collapse"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronRight
              size={18}
              style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
            />
          </button>
        </div>
        <nav className="admin-sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            return (
              <button
                key={item.path}
                className={`admin-sidebar-item ${active ? "active" : ""}`}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={20} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
        <div className="admin-sidebar-footer">
          <button
            className="admin-sidebar-item"
            onClick={() => {
              signOut();
              navigate("/admin");
            }}
            title={collapsed ? t("admin.nav.logout") : undefined}
          >
            <ShieldIcon size={20} />
            {!collapsed && <span>{t("admin.nav.logout")}</span>}
          </button>
        </div>
      </aside>
      <main className="admin-sidebar-main">{children}</main>
    </div>
  );
}
