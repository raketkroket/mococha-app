import { useNavigate } from "react-router-dom";
import { usePrefs } from "../../store/prefs";
import { useAdminAuth } from "../auth";
import { createAdminT } from "../i18n";
import { ROLE_LABELS } from "../types";
import {
  SettingsIcon,
  UserIcon,
  ShieldIcon,
  ChevronRight,
} from "../../components/icons";

export default function AdminMore() {
  const navigate = useNavigate();
  const { language, setLanguage } = usePrefs();
  const t = createAdminT(language);
  const { signOut, role, user } = useAdminAuth();

  const sections = [
    { icon: UserIcon, label: t("admin.nav.staff"), path: "/admin/medewerkers", perm: true },
    { icon: ShieldIcon, label: t("admin.nav.audit"), path: "/admin/audit", perm: true },
    { icon: SettingsIcon, label: t("admin.nav.settings"), path: "/admin/instellingen", perm: true },
  ];

  return (
    <div className="admin-more">
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t("admin.more.title")}</h1>
      </div>

      <div className="admin-more-profile">
        <div className="admin-more-avatar">
          {user?.email?.charAt(0).toUpperCase() ?? "M"}
        </div>
        <div className="admin-more-profile-info">
          <span className="admin-more-email">{user?.email}</span>
          <span className="admin-more-role">
            {role ? ROLE_LABELS[role]?.[language] ?? role : "—"}
          </span>
        </div>
      </div>

      <div className="admin-more-sections">
        {sections.filter((s) => s.perm).map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.path}
              className="admin-more-row"
              onClick={() => navigate(section.path)}
            >
              <div className="admin-more-row-icon"><Icon size={20} /></div>
              <span className="admin-more-row-label">{section.label}</span>
              <ChevronRight size={18} style={{ color: "var(--taupe-light)" }} />
            </button>
          );
        })}
      </div>

      <div className="admin-more-section">
        <div className="admin-more-section-title">{t("admin.more.app")}</div>
        <div className="admin-more-row">
          <div className="admin-more-row-icon"><SettingsIcon size={20} /></div>
          <span className="admin-more-row-label">{t("admin.more.language")}</span>
          <div className="admin-segmented">
            <button
              className={language === "nl" ? "active" : ""}
              onClick={() => setLanguage("nl")}
            >NL</button>
            <button
              className={language === "en" ? "active" : ""}
              onClick={() => setLanguage("en")}
            >EN</button>
          </div>
        </div>
      </div>

      <div className="admin-more-section">
        <button
          className="admin-more-row admin-logout-row"
          onClick={() => {
            signOut();
            navigate("/admin");
          }}
        >
          <div className="admin-more-row-icon"><ShieldIcon size={20} /></div>
          <span className="admin-more-row-label">{t("admin.nav.logout")}</span>
        </button>
      </div>

      <div className="admin-more-version">
        MOCOCHA Beheer v1.0.0
      </div>
    </div>
  );
}
