import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { useProfile } from "../store/profile";
import { useI18n } from "../i18n";
import { haptic } from "../lib/adapters/haptics";
import { getAppSettings } from "../data/settings";
import {
  listPasskeys,
  listMfaFactors,
  hasRecoveryCodes,
  generateRecoveryCodes,
  revokeAllOtherSessions,
  logSecurityEvent,
} from "../lib/auth/security";
import {
  AlertIcon,
  CheckIcon,
  KeyIcon,
  KeySquareIcon,
  LockIcon,
  SmartphoneIcon,
  MonitorIcon,
  FingerprintIcon,
  ChevronRight,
  MailIcon,
  ShieldIcon,
} from "../components/icons";

type View = "main" | "passkeys" | "totp" | "recovery";

export default function Security() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const resetPassword = useAuth((s) => s.resetPassword);
  const profile = useProfile();
  const { t } = useI18n();
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [, setResetting] = useState(false);
  const [settings, setSettings] = useState({ contact_email: "info@mococha.nl" });
  const [view, setView] = useState<View>("main");
  const [passkeyCount, setPasskeyCount] = useState(0);
  const [mfaActive, setMfaActive] = useState(false);
  const [hasRecovery, setHasRecovery] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [generatingRecovery, setGeneratingRecovery] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    getAppSettings().then((s) => setSettings(s));
    loadSecurityStatus();
  }, []);

  const loadSecurityStatus = async () => {
    const { data: passkeys } = await listPasskeys();
    setPasskeyCount((passkeys as unknown[])?.length ?? 0);

    const { data: factors } = await listMfaFactors();
    const totpFactors = (factors as { factor_type: string; status: string }[]) ?? [];
    setMfaActive(totpFactors.some((f) => f.factor_type === "totp" && f.status === "verified"));

    setHasRecovery(await hasRecoveryCodes());
  };

  const handleChangePassword = async () => {
    if (!user?.email) { setResetError("Geen verbinding"); return; }
    setResetting(true); setResetError(null);
    const { error } = await resetPassword(user.email);
    setResetting(false);
    if (error) { setResetError(error); return; }
    setResetSent(true); haptic("success");
    await logSecurityEvent("password_change_requested", true);
  };

  const handleLogout = async () => {
    haptic("light");
    await signOut();
    profile.clear();
    navigate("/");
  };

  const handleDelete = () => {
    haptic("warning");
    alert(t("security.delete_msg", { email: settings.contact_email }));
  };

  const handleGenerateRecovery = async () => {
    setGeneratingRecovery(true);
    setSessionError(null);
    const { data, error } = await generateRecoveryCodes();
    setGeneratingRecovery(false);
    if (error) { setSessionError(error); return; }
    setRecoveryCodes(data);
    setHasRecovery(true);
    haptic("success");
    await loadSecurityStatus();
  };

  const handleRevokeSessions = async () => {
    setRevokingSessions(true);
    setSessionError(null);
    const { error } = await revokeAllOtherSessions();
    setRevokingSessions(false);
    if (error) { setSessionError(error); return; }
    haptic("success");
  };

  // --- Sub-views ---

  if (view === "passkeys") {
    return <PasskeyInline onBack={() => { setView("main"); loadSecurityStatus(); }} />;
  }

  if (view === "totp") {
    return <TotpInline onBack={() => { setView("main"); loadSecurityStatus(); }} />;
  }

  if (view === "recovery") {
    return (
      <div style={{ paddingTop: "var(--s4)" }}>
        <button className="bg-link mb16" onClick={() => { setView("main"); loadSecurityStatus(); }}>
          ← {t("security.back")}
        </button>
        <h1 className="editorial-title mb8" style={{ fontSize: "1.5rem" }}>{t("security.recovery_title")}</h1>
        <p className="muted mb24" style={{ fontSize: "0.875rem", lineHeight: 1.5 }}>{t("security.recovery_desc")}</p>

        {recoveryCodes ? (
          <div className="card mb16" style={{ padding: "var(--s4)", borderRadius: "var(--r-md)", background: "rgba(91,64,52,0.04)" }}>
            <div className="busw mb16" style={{ background: "rgba(155,106,79,0.06)", borderColor: "rgba(155,106,79,0.18)" }}>
              <AlertIcon size={16} /><span>{t("security.recovery_warning")}</span>
            </div>
            <div className="col g8">
              {recoveryCodes.map((code, i) => (
                <div key={i} style={{
                  fontFamily: "var(--sans)",
                  fontSize: "1rem",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  padding: "var(--s2) var(--s3)",
                  background: "var(--soft-surface)",
                  borderRadius: "var(--r-sm)",
                  textAlign: "center",
                  userSelect: "all",
                }}>{code}</div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {hasRecovery ? (
              <div className="row g8 mb16" style={{ alignItems: "center" }}>
                <CheckIcon size={18} style={{ color: "var(--success)" }} />
                <span style={{ fontSize: "0.875rem" }}>{t("security.recovery_have")}</span>
              </div>
            ) : (
              <div className="row g8 mb16" style={{ alignItems: "center" }}>
                <AlertIcon size={18} style={{ color: "var(--taupe)" }} />
                <span className="muted" style={{ fontSize: "0.875rem" }}>{t("security.recovery_none")}</span>
              </div>
            )}
            {sessionError && <div className="busw mb16"><AlertIcon size={16} /><span>{sessionError}</span></div>}
            <button className="btn bp blk" disabled={generatingRecovery} onClick={handleGenerateRecovery}>
              {generatingRecovery ? t("security.recovery_generating") : t("security.recovery_generate")}
            </button>
          </>
        )}
      </div>
    );
  }

  // --- Main view ---
  return (
    <div>
      <h1 className="screen-title mb24">{t("security.title")}</h1>

      {/* LOGIN METHODS */}
      <div className="eyebrow mb8">{t("security.login_methods")}</div>
      <div className="mb24">
        <button className="info-row" style={{ width: "100%", cursor: "pointer", alignItems: "center" }} onClick={() => setView("passkeys")}>
          <div className="info-row-icon" style={{ background: "rgba(91,64,52,0.08)", color: "var(--chocolate)" }}>
            <FingerprintIcon size={20} />
          </div>
          <div className="f1">
            <div style={{ fontWeight: 500, fontSize: "0.9375rem" }}>{t("security.passkeys")}</div>
          </div>
          <span style={{ fontSize: "0.75rem", color: passkeyCount > 0 ? "var(--success)" : "var(--taupe)" }}>
            {passkeyCount > 0 ? `${t("security.status_set")} · ${passkeyCount}` : t("security.status_not_set")}
          </span>
          <ChevronRight size={18} style={{ color: "var(--taupe-light)" }} />
        </button>

        <button className="info-row" style={{ width: "100%", cursor: "pointer", alignItems: "center" }} onClick={handleChangePassword}>
          <div className="info-row-icon" style={{ background: "rgba(91,64,52,0.08)", color: "var(--chocolate)" }}>
            <LockIcon size={20} />
          </div>
          <div className="f1">
            <div style={{ fontWeight: 500, fontSize: "0.9375rem" }}>{t("security.password")}</div>
            <div className="muted" style={{ fontSize: "0.75rem" }}>{t("security.change_password_desc")}</div>
          </div>
          <ChevronRight size={18} style={{ color: "var(--taupe-light)" }} />
        </button>
      </div>

      {resetError && <div className="busw mb16"><AlertIcon size={16} /><span>{resetError}</span></div>}
      {resetSent && (
        <div className="busw mb16" style={{ background: "rgba(90,110,84,0.06)", borderColor: "rgba(90,110,84,0.18)", color: "var(--success)" }}>
          <CheckIcon size={16} /><span>{t("security.reset_sent", { email: user?.email ?? "" })}</span>
        </div>
      )}

      <div className="div" />

      {/* EXTRA SECURITY */}
      <div className="eyebrow mb8">{t("security.extra_security")}</div>
      <div className="mb24">
        <button className="info-row" style={{ width: "100%", cursor: "pointer", alignItems: "center" }} onClick={() => setView("totp")}>
          <div className="info-row-icon" style={{ background: "rgba(91,64,52,0.08)", color: "var(--chocolate)" }}>
            <KeySquareIcon size={20} />
          </div>
          <div className="f1">
            <div style={{ fontWeight: 500, fontSize: "0.9375rem" }}>{t("security.authenticator_app")}</div>
          </div>
          <span style={{ fontSize: "0.75rem", color: mfaActive ? "var(--success)" : "var(--taupe)" }}>
            {mfaActive ? t("security.status_active") : t("security.status_not_active")}
          </span>
          <ChevronRight size={18} style={{ color: "var(--taupe-light)" }} />
        </button>

        <button className="info-row" style={{ width: "100%", cursor: "pointer", alignItems: "center" }} onClick={() => setView("recovery")}>
          <div className="info-row-icon" style={{ background: "rgba(91,64,52,0.08)", color: "var(--chocolate)" }}>
            <ShieldIcon size={20} />
          </div>
          <div className="f1">
            <div style={{ fontWeight: 500, fontSize: "0.9375rem" }}>{t("security.recovery_methods")}</div>
          </div>
          <span style={{ fontSize: "0.75rem", color: hasRecovery ? "var(--success)" : "var(--taupe)" }}>
            {hasRecovery ? t("security.recovery_have") : t("security.recovery_none")}
          </span>
          <ChevronRight size={18} style={{ color: "var(--taupe-light)" }} />
        </button>
      </div>

      <div className="div" />

      {/* SESSIONS */}
      <div className="eyebrow mb8">{t("security.sessions")}</div>
      <div className="mb24">
        <div className="info-row" style={{ alignItems: "center" }}>
          <div className="info-row-icon" style={{ background: "rgba(91,64,52,0.08)", color: "var(--chocolate)" }}>
            <SmartphoneIcon size={20} />
          </div>
          <div className="f1">
            <div style={{ fontWeight: 500, fontSize: "0.9375rem" }}>{t("security.this_device")}</div>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--success)" }}>{t("security.status_active")}</span>
        </div>

        {sessionError && <div className="busw mb16"><AlertIcon size={16} /><span>{sessionError}</span></div>}

        <button className="info-row" style={{ width: "100%", cursor: "pointer", alignItems: "center" }} onClick={handleRevokeSessions} disabled={revokingSessions}>
          <div className="info-row-icon" style={{ background: "rgba(91,64,52,0.08)", color: "var(--chocolate)" }}>
            <MonitorIcon size={20} />
          </div>
          <div className="f1">
            <div style={{ fontWeight: 500, fontSize: "0.9375rem" }}>{t("security.logout_all")}</div>
          </div>
          {revokingSessions && <span className="muted" style={{ fontSize: "0.75rem" }}>...</span>}
        </button>
      </div>

      <div className="div" />

      {/* ACCOUNT */}
      <div className="eyebrow mb8">{t("security.account_section")}</div>
      <div className="mb24">
        <div className="info-row" style={{ alignItems: "center" }}>
          <div className="info-row-icon" style={{ background: "rgba(91,64,52,0.08)", color: "var(--chocolate)" }}>
            <MailIcon size={20} />
          </div>
          <div className="f1">
            <div style={{ fontWeight: 500, fontSize: "0.9375rem" }}>{t("security.email_address")}</div>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--success)" }}>{t("security.status_confirmed")}</span>
        </div>

        <button className="info-row" style={{ width: "100%", cursor: "pointer", alignItems: "center" }} onClick={handleLogout}>
          <div className="info-row-icon" style={{ background: "rgba(91,64,52,0.08)", color: "var(--chocolate)" }}>
            <KeyIcon size={20} />
          </div>
          <div className="f1">
            <div style={{ fontWeight: 500, fontSize: "0.9375rem" }}>{t("security.logout")}</div>
          </div>
          <ChevronRight size={18} style={{ color: "var(--taupe-light)" }} />
        </button>

        <button className="info-row" style={{ width: "100%", cursor: "pointer", alignItems: "center" }} onClick={handleDelete}>
          <div className="info-row-icon" style={{ background: "rgba(155,106,79,0.08)", color: "var(--warning)" }}>
            <TrashIconSafe />
          </div>
          <div className="f1">
            <div style={{ fontWeight: 500, fontSize: "0.9375rem", color: "var(--warning)" }}>{t("security.delete_account")}</div>
          </div>
          <ChevronRight size={18} style={{ color: "var(--taupe-light)" }} />
        </button>
      </div>
    </div>
  );
}

import PasskeyManager from "./PasskeyManager";
import TotpEnrollment from "./TotpEnrollment";

function PasskeyInline({ onBack }: { onBack: () => void }) {
  return <PasskeyManager onBack={onBack} />;
}

function TotpInline({ onBack }: { onBack: () => void }) {
  return <TotpEnrollment onComplete={onBack} onCancel={onBack} />;
}

function TrashIconSafe() {
  return <span style={{ fontSize: "1rem" }}>×</span>;
}
