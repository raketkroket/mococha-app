import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../auth";
import { usePrefs } from "../../store/prefs";
import TotpEnrollment from "../../screens/TotpEnrollment";
import PasskeyManager from "../../screens/PasskeyManager";
import {
  listMfaFactors,
  listPasskeys,
  generateRecoveryCodes,
  logSecurityEvent,
} from "../../lib/auth/security";
import { isPasskeySupported } from "../../lib/auth/platform";
import { CheckIcon, ShieldIcon, KeySquareIcon, FingerprintIcon, KeyIcon } from "../../components/icons";

type Step = "overview" | "totp" | "passkey" | "recovery" | "done";

export default function AdminOnboarding() {
  const navigate = useNavigate();
  const { verifyMfaChallenge } = useAdminAuth();
  const { language } = usePrefs();
  const [step, setStep] = useState<Step>("overview");
  const [mfaActive, setMfaActive] = useState(false);
  const [passkeyCount, setPasskeyCount] = useState(0);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const passkeySupported = isPasskeySupported();

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    const { data: factors } = await listMfaFactors();
    const totpFactors = (factors as { factor_type: string; status: string }[]) ?? [];
    setMfaActive(totpFactors.some((f) => f.factor_type === "totp" && f.status === "verified"));

    const { data: passkeys } = await listPasskeys();
    setPasskeyCount((passkeys as unknown[])?.length ?? 0);
    setLoading(false);
  };

  const handleGenerateRecovery = async () => {
    const { data, error } = await generateRecoveryCodes();
    if (error) return;
    setRecoveryCodes(data);
    await logSecurityEvent("admin_onboarding_recovery", true);
  };

  const handleComplete = async () => {
    await verifyMfaChallenge();
    await logSecurityEvent("admin_onboarding_complete", true);
    navigate("/admin");
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-dot" />
      </div>
    );
  }

  if (step === "totp") {
    return (
      <div className="admin-main" style={{ maxWidth: 480, margin: "0 auto", paddingTop: "var(--s6)" }}>
        <TotpEnrollment
          onComplete={() => { setStep("passkey"); checkStatus(); }}
          onCancel={() => { setStep("overview"); checkStatus(); }}
        />
      </div>
    );
  }

  if (step === "passkey") {
    return (
      <div className="admin-main" style={{ maxWidth: 480, margin: "0 auto", paddingTop: "var(--s6)" }}>
        <PasskeyManager onBack={() => { setStep("recovery"); checkStatus(); }} />
        {!passkeySupported && (
          <div className="admin-section" style={{ marginTop: "var(--s4)" }}>
            <button className="admin-btn-secondary" onClick={() => setStep("recovery")}>
              {language === "nl" ? "Doorgaan zonder passkey" : "Continue without passkey"}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (step === "recovery") {
    return (
      <div className="admin-main" style={{ maxWidth: 480, margin: "0 auto", paddingTop: "var(--s6)" }}>
        <h1 className="admin-page-title mb8" style={{ fontSize: "1.5rem" }}>
          {language === "nl" ? "Herstelcodes" : "Recovery codes"}
        </h1>
        <p className="admin-page-subtitle mb24" style={{ fontSize: "0.875rem" }}>
          {language === "nl"
            ? "Genereer eenmalige herstelcodes voor noodsituaties. Bewaar ze veilig buiten je apparaat."
            : "Generate one-time recovery codes for emergencies. Store them safely outside your device."}
        </p>

        {recoveryCodes ? (
          <div className="admin-section">
            <div className="admin-callout" style={{ background: "rgba(155,106,79,0.06)", borderColor: "rgba(155,106,79,0.18)", marginBottom: "var(--s4)", padding: "var(--s3)", borderRadius: 8, fontSize: "0.8125rem" }}>
              {language === "nl"
                ? "Deze codes worden maar één keer getoond. Bewaar ze op een veilige plek."
                : "These codes are shown only once. Store them in a safe place."}
            </div>
            <div className="col g8" style={{ marginBottom: "var(--s4)" }}>
              {recoveryCodes.map((code, i) => (
                <div key={i} style={{
                  fontFamily: "var(--sans)",
                  fontSize: "1rem",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  padding: "var(--s2) var(--s3)",
                  background: "var(--soft-surface)",
                  borderRadius: 6,
                  textAlign: "center",
                  userSelect: "all",
                }}>{code}</div>
              ))}
            </div>
            <button className="admin-btn-primary" onClick={() => setStep("done")}>
              {language === "nl" ? "Ik heb ze opgeslagen" : "I've saved them"}
            </button>
          </div>
        ) : (
          <button className="admin-btn-primary" onClick={handleGenerateRecovery}>
            {language === "nl" ? "Herstelcodes genereren" : "Generate recovery codes"}
          </button>
        )}

        <button className="admin-btn-secondary" style={{ marginTop: "var(--s3)" }} onClick={() => setStep("done")}>
          {language === "nl" ? "Overslaan" : "Skip"}
        </button>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="admin-main" style={{ maxWidth: 480, margin: "0 auto", paddingTop: "var(--s8)", textAlign: "center" }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "rgba(90,110,84,0.10)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto var(--s4)",
        }}>
          <CheckIcon size={26} style={{ color: "var(--success)" }} />
        </div>
        <h1 className="admin-page-title" style={{ fontSize: "1.5rem", marginBottom: "var(--s2)" }}>
          {language === "nl" ? "Beveiliging voltooid" : "Security setup complete"}
        </h1>
        <p className="admin-page-subtitle mb24" style={{ fontSize: "0.875rem" }}>
          {language === "nl"
            ? "Je account is beveiligd. Je kunt nu de beheerder gebruiken."
            : "Your account is secured. You can now access the admin panel."}
        </p>
        <button className="admin-btn-primary" onClick={handleComplete}>
          {language === "nl" ? "Naar beheerderspaneel" : "Enter admin panel"}
        </button>
      </div>
    );
  }

  // Overview step
  return (
    <div className="admin-main" style={{ maxWidth: 480, margin: "0 auto", paddingTop: "var(--s6)" }}>
      <div style={{ textAlign: "center", marginBottom: "var(--s6)" }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "rgba(91,64,52,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto var(--s4)",
        }}>
          <ShieldIcon size={26} style={{ color: "var(--chocolate)" }} />
        </div>
        <h1 className="admin-page-title" style={{ fontSize: "1.5rem", marginBottom: "var(--s2)" }}>
          {language === "nl" ? "Beveiliging instellen" : "Security setup"}
        </h1>
        <p className="admin-page-subtitle" style={{ fontSize: "0.875rem" }}>
          {language === "nl"
            ? "Voor de veiligheid van MOCOCHA is TOTP verificatie verplicht voor alle beheerders."
            : "For MOCOCHA security, TOTP verification is mandatory for all administrators."}
        </p>
      </div>

      <div className="admin-onboarding-steps">
        <div className={`admin-onboarding-step ${mfaActive ? "done" : ""}`}>
          <KeySquareIcon size={20} />
          <div className="f1">
            <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
              {language === "nl" ? "Authenticator-app (verplicht)" : "Authenticator-app (required)"}
            </div>
          </div>
          {mfaActive ? (
            <CheckIcon size={18} style={{ color: "var(--success)" }} />
          ) : (
            <button className="admin-btn-primary" style={{ fontSize: "0.75rem", padding: "6px 12px" }} onClick={() => setStep("totp")}>
              {language === "nl" ? "Instellen" : "Set up"}
            </button>
          )}
        </div>

        <div className={`admin-onboarding-step ${passkeyCount > 0 ? "done" : ""}`}>
          <FingerprintIcon size={20} />
          <div className="f1">
            <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
              {language === "nl" ? "Passkey (aanbevolen)" : "Passkey (recommended)"}
            </div>
          </div>
          {passkeyCount > 0 ? (
            <CheckIcon size={18} style={{ color: "var(--success)" }} />
          ) : (
            <button className="admin-btn-secondary" style={{ fontSize: "0.75rem", padding: "6px 12px" }} onClick={() => setStep("passkey")}>
              {language === "nl" ? "Instellen" : "Set up"}
            </button>
          )}
        </div>

        <div className="admin-onboarding-step">
          <KeyIcon size={20} />
          <div className="f1">
            <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
              {language === "nl" ? "Herstelcodes" : "Recovery codes"}
            </div>
          </div>
          <button className="admin-btn-secondary" style={{ fontSize: "0.75rem", padding: "6px 12px" }} onClick={() => setStep("recovery")}>
            {language === "nl" ? "Genereren" : "Generate"}
          </button>
        </div>
      </div>

      {mfaActive && (
        <button className="admin-btn-primary blk" style={{ width: "100%", marginTop: "var(--s6)" }} onClick={handleComplete}>
          {language === "nl" ? "Voltooien en door gaan" : "Complete and continue"}
        </button>
      )}
    </div>
  );
}
