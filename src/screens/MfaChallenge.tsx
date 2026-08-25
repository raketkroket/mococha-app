import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../data/api";
import { challengeTotp, verifyTotp, logSecurityEvent } from "../lib/auth/security";
import { useI18n } from "../i18n";
import { haptic } from "../lib/adapters/haptics";
import { AlertIcon, ShieldIcon } from "../components/icons";

interface Factor {
  id: string;
  factor_type: string;
  status: string;
}

export default function MfaChallenge({ onSuccess, targetPath }: { onSuccess: () => void; targetPath?: string }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    (async () => {
      if (!supabase) return;
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const factors = (factorsData?.totp ?? []) as Factor[];
      const verified = factors.find((f) => f.status === "verified");
      if (!verified) {
        setError("Geen actieve authenticator-app gevonden.");
        return;
      }
      setFactorId(verified.id);
      const { data: challenge, error: chErr } = await challengeTotp(verified.id);
      if (chErr) setError(chErr);
      else if (challenge) setChallengeId(challenge.id);
    })();
  }, []);

  const handleVerify = async () => {
    if (!factorId || !challengeId || loading) return;
    if (code.length !== 6) return;

    if (attemptCount >= 5) {
      setError("Te veel pogingen. Wacht even voordat je het opnieuw probeert.");
      return;
    }

    setLoading(true);
    setError(null);
    const { error: verifyError } = await verifyTotp(factorId, challengeId, code);
    setLoading(false);

    if (verifyError) {
      setAttemptCount((c) => c + 1);
      setError(verifyError);
      setCode("");
      inputRef.current?.focus();
      haptic("warning");

      // Create new challenge for retry
      const { data: newChallenge } = await challengeTotp(factorId);
      if (newChallenge) setChallengeId(newChallenge.id);
      return;
    }

    haptic("success");
    await logSecurityEvent("mfa_verified", true, { target_path: targetPath });
    onSuccess();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleVerify();
  };

  return (
    <div style={{ paddingTop: "var(--s8)", maxWidth: 360, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "var(--s6)" }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "rgba(91,64,52,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto var(--s4)",
        }}>
          <ShieldIcon size={26} style={{ color: "var(--chocolate)" }} />
        </div>
        <h1 className="editorial-title" style={{ fontSize: "1.5rem", marginBottom: "var(--s1)" }}>
          {t("security.mfa_challenge_title")}
        </h1>
        <p className="muted" style={{ fontSize: "0.875rem", lineHeight: 1.5 }}>
          {t("security.mfa_challenge_desc")}
        </p>
      </div>

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
          onKeyDown={handleKeyDown}
          style={{ fontSize: "1.5rem", letterSpacing: "0.4em", textAlign: "center", fontFamily: "var(--sans)" }}
          aria-label={t("security.totp_code_label")}
          autoComplete="one-time-code"
        />
      </div>

      {error && (
        <div className="busw mb16">
          <AlertIcon size={16} />
          <span>{error}</span>
        </div>
      )}

      <button
        className="btn bp blk"
        disabled={loading || code.length !== 6}
        onClick={handleVerify}
      >
        {loading ? t("security.mfa_verifying") : t("security.mfa_verify")}
      </button>

      <button className="bg-link blk tcenter mt16" onClick={() => navigate("/")}>
        ← {t("security.back")}
      </button>
    </div>
  );
}
