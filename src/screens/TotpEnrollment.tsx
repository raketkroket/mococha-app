import { useState, useRef } from "react";
import { enrollTotp, challengeTotp, verifyTotp, logSecurityEvent } from "../lib/auth/security";
import { useI18n } from "../i18n";
import { haptic } from "../lib/adapters/haptics";
import { AlertIcon, CheckIcon, ShieldIcon, CopyIcon } from "../components/icons";

type Step = "intro" | "qr" | "verify" | "success";

export default function TotpEnrollment({ onComplete, onCancel }: { onComplete: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>("intro");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    const { data, error: enrollError } = await enrollTotp();
    setLoading(false);
    if (enrollError || !data) {
      setError(enrollError ?? "Failed to start enrollment.");
      return;
    }
    setQrCode(data.qr_code);
    setSecret(data.totp_secret);
    setFactorId(data.id);
    setStep("qr");
  };

  const handleVerify = async () => {
    if (!factorId || loading || code.length !== 6) return;
    setLoading(true);
    setError(null);

    // Create challenge if we don't have one
    let chId = challengeId;
    if (!chId) {
      const { data: challenge, error: chErr } = await challengeTotp(factorId);
      if (chErr || !challenge) {
        setError(chErr ?? "Challenge failed.");
        setLoading(false);
        return;
      }
      chId = challenge.id;
      setChallengeId(chId);
    }

    const { error: verifyError } = await verifyTotp(factorId, chId, code);
    setLoading(false);

    if (verifyError) {
      setError(verifyError);
      setCode("");
      inputRef.current?.focus();
      // Need a new challenge after failed attempt
      setChallengeId(null);
      return;
    }

    haptic("success");
    await logSecurityEvent("mfa_enrolled", true);
    setStep("success");
  };

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (step === "success") {
    return (
      <div style={{ textAlign: "center", paddingTop: "var(--s6)" }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "rgba(90,110,84,0.10)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto var(--s4)",
        }}>
          <CheckIcon size={26} style={{ color: "var(--success)" }} />
        </div>
        <h1 className="editorial-title" style={{ fontSize: "1.5rem", marginBottom: "var(--s2)" }}>
          {t("security.totp_success")}
        </h1>
        <button className="btn bp blk" style={{ maxWidth: 280, margin: "0 auto" }} onClick={onComplete}>
          {t("security.back")}
        </button>
      </div>
    );
  }

  if (step === "intro") {
    return (
      <div style={{ paddingTop: "var(--s4)" }}>
        <div style={{ textAlign: "center", marginBottom: "var(--s6)" }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "rgba(91,64,52,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto var(--s4)",
          }}>
            <ShieldIcon size={26} style={{ color: "var(--chocolate)" }} />
          </div>
          <h1 className="editorial-title" style={{ fontSize: "1.5rem", marginBottom: "var(--s2)" }}>
            {t("security.totp_title")}
          </h1>
          <p className="muted" style={{ fontSize: "0.875rem", lineHeight: 1.5, maxWidth: 320, margin: "0 auto" }}>
            {t("security.totp_desc")}
          </p>
        </div>

        {error && <div className="busw mb16"><AlertIcon size={16} /><span>{error}</span></div>}

        <button className="btn bp blk mb16" disabled={loading} onClick={handleStart}>
          {loading ? t("security.mfa_verifying") : t("security.totp_activate")}
        </button>
        <button className="bg-link blk tcenter" onClick={onCancel}>
          {t("security.back")}
        </button>
      </div>
    );
  }

  // QR + verify step
  return (
    <div style={{ paddingTop: "var(--s4)" }}>
      <h1 className="editorial-title" style={{ fontSize: "1.5rem", marginBottom: "var(--s2)" }}>
        {t("security.totp_title")}
      </h1>
      <p className="muted mb16" style={{ fontSize: "0.875rem", lineHeight: 1.5 }}>
        {t("security.totp_desc")}
      </p>

      {qrCode && (
        <div style={{
          background: "var(--pure-white)",
          padding: "var(--s4)",
          borderRadius: "var(--r-md)",
          display: "flex",
          justifyContent: "center",
          marginBottom: "var(--s4)",
          border: "1px solid var(--border-color)",
        }}>
          <img src={qrCode} alt="QR code" style={{ width: 220, height: 220 }} />
        </div>
      )}

      {secret && (
        <div className="field mb16">
          <label>{t("security.totp_manual")}</label>
          <div style={{ display: "flex", gap: "var(--s2)", alignItems: "center" }}>
            <code style={{
              fontSize: "0.75rem",
              fontFamily: "var(--sans)",
              background: "var(--soft-surface)",
              padding: "var(--s2)",
              borderRadius: "var(--r-sm)",
              flex: 1,
              wordBreak: "break-all",
            }}>{secret}</code>
            <button className="hbtn" onClick={copySecret} aria-label={t("security.totp_copy")}>
              <CopyIcon size={16} />
            </button>
          </div>
          {copied && <span className="muted" style={{ fontSize: "0.75rem", color: "var(--success)" }}>{t("security.totp_copied")}</span>}
        </div>
      )}

      <div className="field">
        <label>{t("security.totp_code_label")}</label>
        <input
          ref={inputRef}
          className="in"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder={t("security.totp_code_ph")}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          style={{ fontSize: "1.5rem", letterSpacing: "0.4em", textAlign: "center", fontFamily: "var(--sans)" }}
          autoComplete="one-time-code"
        />
      </div>

      {error && <div className="busw mb16"><AlertIcon size={16} /><span>{error}</span></div>}

      <button className="btn bp blk mb16" disabled={loading || code.length !== 6} onClick={handleVerify}>
        {loading ? t("security.mfa_verifying") : t("security.totp_activate")}
      </button>
      <button className="bg-link blk tcenter" onClick={onCancel}>
        {t("security.back")}
      </button>
    </div>
  );
}
