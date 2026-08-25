import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import { haptic } from "../lib/adapters/haptics";
import { getAppSettings } from "../data/settings";
import { ChevronRight } from "../components/icons";

export default function Privacy() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [settings, setSettings] = useState({ terms_url: "/info/algemene-voorwaarden", privacy_url: "/info/privacy", contact_email: "info@mococha.nl" });

  useEffect(() => { getAppSettings().then(setSettings); }, []);

  const showContact = (key: string) => {
    haptic("warning");
    alert(t(key, { email: settings.contact_email }));
  };

  return (
    <div>
      <h1 className="screen-title mb8">{t("privacy.title")}</h1>
      <p className="muted mb24" style={{ fontSize: "0.875rem", lineHeight: 1.5 }}>{t("privacy.desc")}</p>

      <div style={{ borderTop: "0.5px solid var(--hairline)" }}>
        <button className="info-row" onClick={() => navigate(settings.privacy_url)}>
          <div className="f1"><div className="info-row-text">{t("privacy.privacy_policy")}</div></div>
          <ChevronRight size={18} style={{ color: "var(--taupe-light)" }} />
        </button>
        <button className="info-row" onClick={() => navigate(settings.terms_url)}>
          <div className="f1"><div className="info-row-text">{t("privacy.terms")}</div></div>
          <ChevronRight size={18} style={{ color: "var(--taupe-light)" }} />
        </button>
      </div>

      <div className="div" />

      <div className="eyebrow mb8">{t("privacy.data_management")}</div>
      <div style={{ borderTop: "0.5px solid var(--hairline)" }}>
        <button className="info-row" onClick={() => showContact("privacy.download_msg")}>
          <div className="f1">
            <div className="info-row-text">{t("privacy.download_data")}</div>
            <div className="muted" style={{ fontSize: "0.78rem" }}>{t("privacy.download_desc")}</div>
          </div>
          <ChevronRight size={18} style={{ color: "var(--taupe-light)" }} />
        </button>
        <button className="info-row" onClick={() => showContact("privacy.delete_msg")}>
          <div className="f1">
            <div className="info-row-text" style={{ color: "var(--warning)" }}>{t("privacy.delete_account")}</div>
            <div className="muted" style={{ fontSize: "0.78rem" }}>{t("privacy.delete_desc")}</div>
          </div>
          <ChevronRight size={18} style={{ color: "var(--taupe-light)" }} />
        </button>
      </div>
    </div>
  );
}
