import { useNavigate, useLocation } from "react-router-dom";
import { HomeIcon, BuildIcon, ConceptIcon, InspireIcon, UserIcon } from "./icons";
import { haptic } from "../lib/adapters/haptics";
import { useI18n } from "../i18n";

const TABS = [
  { to: "/", labelKey: "tab.home", Icon: HomeIcon },
  { to: "/bouwen", labelKey: "tab.build", Icon: BuildIcon },
  { to: "/concepten", labelKey: "tab.concepts", Icon: ConceptIcon },
  { to: "/inspiratie", labelKey: "tab.inspiration", Icon: InspireIcon },
  { to: "/account", labelKey: "tab.account", Icon: UserIcon },
];

export function Header({ title, showBack }: { title?: string; showBack?: boolean }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const loc = useLocation();

  if (showBack || (title && !loc.pathname.startsWith("/concepten") && loc.pathname !== "/" && !TABS.some(tab => tab.to === loc.pathname))) {
    return (
      <header className="hdr">
        <div className="hdr-inner hdr-inner-deep">
          <button className="hdr-back-btn" onClick={() => navigate(-1)} aria-label={t("nav.back")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button className="hdr-logo-btn hdr-logo-centered" onClick={() => navigate("/")} aria-label="MOCOCHA home">
            <img className="hdr-logo-img" src="/mocochalogo.webp" alt="MOCOCHA" />
          </button>
          <div className="hdr-actions hdr-actions-spacer" />
        </div>
      </header>
    );
  }

  return (
    <header className="hdr">
      <div className="hdr-inner">
        <button className="hdr-logo-btn" onClick={() => navigate("/")} aria-label="MOCOCHA home">
          <img className="hdr-logo-img" src="/mocochalogo.webp" alt="MOCOCHA" />
        </button>
        <div className="hdr-actions">
          <button className="hbtn" onClick={() => navigate("/account")} aria-label={t("tab.account")}>
            <UserIcon size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}

export function TabBar() {
  const navigate = useNavigate();
  const loc = useLocation();
  const { t } = useI18n();
  return (
    <nav className="tabs" aria-label={t("tab.account")}>
      {TABS.map(({ to, labelKey, Icon }) => {
        const active = to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(to);
        return (
          <button key={to} className={`tab ${active ? "active" : ""}`} onClick={() => { haptic("light"); navigate(to); }} aria-label={t(labelKey)} aria-current={active ? "page" : undefined}>
            <Icon size={22} fill={active} />
            <span>{t(labelKey)}</span>
            <span className="tab-dot" />
          </button>
        );
      })}
    </nav>
  );
}
