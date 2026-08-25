import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePrefs, type TextSize } from "../store/prefs";
import { useTheme, type ThemeMode } from "../store/theme";
import { useI18n } from "../i18n";
import type { Lang } from "../i18n/translations";
import { haptic } from "../lib/adapters/haptics";
import { getAppSettings } from "../data/settings";
import { ChevronRight } from "../components/icons";
import type { AppSettings } from "../data/settings";

export default function Settings() {
  const navigate = useNavigate();
  const prefs = usePrefs();
  const { mode, setMode } = useTheme();
  const { t, lang, setLang } = useI18n();
  const [settings, setSettings] = useState<AppSettings>({ instagram_url: "", contact_email: "info@mococha.nl", terms_url: "/info/algemene-voorwaarden", privacy_url: "/info/privacy", app_version: "1.0.0", company_city: "" });

  useEffect(() => { getAppSettings().then(setSettings); }, []);

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: "system", label: t("settings.theme_system") },
    { value: "light", label: t("settings.theme_light") },
    { value: "dark", label: t("settings.theme_dark") },
  ];

  const textOptions: { value: TextSize; label: string }[] = [
    { value: "default", label: t("settings.text_default") },
    { value: "larger", label: t("settings.text_larger") },
  ];

  const langOptions: { value: Lang; label: string }[] = [
    { value: "nl", label: t("settings.dutch") },
    { value: "en", label: t("settings.english") },
  ];

  return (
    <div>
      <h1 className="screen-title mb24">{t("settings.title")}</h1>

      <div className="eyebrow mb8">{t("settings.display")}</div>
      <div className="field">
        <div className="seg">
          {themeOptions.map((o) => (
            <button key={o.value} className={`seg-btn ${mode === o.value ? "active" : ""}`} onClick={() => { setMode(o.value); haptic("selection"); }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="div" />

      <div className="eyebrow mb8">{t("settings.app_experience")}</div>
      <div style={{ borderTop: "0.5px solid var(--hairline)" }}>
        <ToggleRow label={t("settings.haptics")} desc={t("settings.haptics_desc")} value={prefs.hapticsEnabled} onChange={(v) => { prefs.setHaptics(v); if (v) haptic("medium"); }} />
        <ToggleRow label={t("settings.reduced_motion")} desc={t("settings.reduced_motion_desc")} value={prefs.reducedMotion} onChange={(v) => { prefs.setReducedMotion(v); haptic("light"); }} />
      </div>
      <div className="field mt16">
        <label>{t("settings.text_size")}</label>
        <div className="seg">
          {textOptions.map((o) => (
            <button key={o.value} className={`seg-btn ${prefs.textSize === o.value ? "active" : ""}`} onClick={() => { prefs.setTextSize(o.value); haptic("selection"); }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="div" />

      <div className="eyebrow mb8">{t("settings.language")}</div>
      <div className="field">
        <div className="seg">
          {langOptions.map((o) => (
            <button key={o.value} className={`seg-btn ${lang === o.value ? "active" : ""}`} onClick={() => { setLang(o.value); haptic("selection"); }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="div" />

      <div className="eyebrow mb8">{t("settings.data")}</div>
      <div style={{ borderTop: "0.5px solid var(--hairline)" }}>
        <ToggleRow label={t("settings.data_saver")} desc={t("settings.data_saver_desc")} value={prefs.dataSaver} onChange={(v) => { prefs.setDataSaver(v); haptic("light"); }} />
        <button className="info-row" onClick={() => haptic("light")}>
          <div className="f1">
            <div className="info-row-text">{t("settings.local_data")}</div>
          </div>
          <ChevronRight size={18} style={{ color: "var(--taupe-light)" }} />
        </button>
      </div>

      <div className="div" />

      <div className="eyebrow mb8">{t("settings.about")}</div>
      <div style={{ borderTop: "0.5px solid var(--hairline)" }}>
        <div className="info-row">
          <div className="f1"><div className="info-row-text">{t("settings.app_version", { version: settings.app_version })}</div></div>
        </div>
        <button className="info-row" onClick={() => navigate(settings.terms_url)}>
          <div className="f1"><div className="info-row-text">{t("settings.terms")}</div></div>
          <ChevronRight size={18} style={{ color: "var(--taupe-light)" }} />
        </button>
        <button className="info-row" onClick={() => navigate(settings.privacy_url)}>
          <div className="f1"><div className="info-row-text">{t("settings.privacy")}</div></div>
          <ChevronRight size={18} style={{ color: "var(--taupe-light)" }} />
        </button>
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="info-row" style={{ cursor: "pointer" }} onClick={() => onChange(!value)}>
      <div className="f1">
        <div className="info-row-text">{label}</div>
        <div className="muted" style={{ fontSize: "0.78rem" }}>{desc}</div>
      </div>
      <div style={{
        width: 44, height: 26, borderRadius: 13, background: value ? "var(--chocolate)" : "var(--fine-border)",
        position: "relative", transition: "background var(--dur)", flexShrink: 0,
      }}>
        <div style={{
          position: "absolute", top: 3, left: value ? 21 : 3,
          width: 20, height: 20, borderRadius: "50%", background: "var(--pure-white)",
          transition: "left var(--dur) var(--ease)", boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }} />
      </div>
    </div>
  );
}
