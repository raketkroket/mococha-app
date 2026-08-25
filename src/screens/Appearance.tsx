import { usePrefs, type TextSize } from "../store/prefs";
import { useTheme, type ThemeMode } from "../store/theme";
import { useI18n } from "../i18n";
import { haptic } from "../lib/adapters/haptics";


export default function Appearance() {
  const prefs = usePrefs();
  const { mode, setMode } = useTheme();
  const { t } = useI18n();

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: "system", label: t("appearance.theme_system") },
    { value: "light", label: t("appearance.theme_light") },
    { value: "dark", label: t("appearance.theme_dark") },
  ];

  const textOptions: { value: TextSize; label: string }[] = [
    { value: "default", label: t("appearance.text_default") },
    { value: "larger", label: t("appearance.text_larger") },
  ];

  return (
    <div>
      <h1 className="screen-title mb24">{t("appearance.title")}</h1>

      <div className="eyebrow mb8">{t("appearance.theme")}</div>
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

      <div className="eyebrow mb8">{t("appearance.text_size")}</div>
      <div className="field">
        <div className="seg">
          {textOptions.map((o) => (
            <button key={o.value} className={`seg-btn ${prefs.textSize === o.value ? "active" : ""}`} onClick={() => { prefs.setTextSize(o.value); haptic("selection"); }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="div" />

      <div style={{ borderTop: "0.5px solid var(--hairline)" }}>
        <ToggleRow label={t("appearance.reduced_motion")} desc={t("appearance.reduced_motion_desc")} value={prefs.reducedMotion} onChange={(v) => { prefs.setReducedMotion(v); haptic("light"); }} />
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
