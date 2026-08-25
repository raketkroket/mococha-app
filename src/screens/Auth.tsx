import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../store/auth";
import { isSupabaseConfigured } from "../data/api";
import { signInWithPasskey } from "../lib/auth/security";
import { isPasskeySupported } from "../lib/auth/platform";
import { AlertIcon, CheckIcon, FingerprintIcon } from "../components/icons";
import { useI18n } from "../i18n";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
type FD = z.infer<typeof schema>;

export default function Auth() {
  const navigate = useNavigate();
  const signIn = useAuth((s) => s.signIn);
  const signUp = useAuth((s) => s.signUp);
  const resetPassword = useAuth((s) => s.resetPassword);
  const { t } = useI18n();
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const passkeySupported = isPasskeySupported();

  const { register, handleSubmit, formState: { errors } } = useForm<FD>({ resolver: zodResolver(schema) });

  const onSubmit = async (d: FD) => {
    setLoading(true); setError(null); setNeedsConfirmation(false);
    if (mode === "reset") {
      const { error } = await resetPassword(d.email);
      setLoading(false);
      if (error) { setError(error); return; }
      setResetSent(true);
      return;
    }
    if (mode === "login") {
      const { error } = await signIn(d.email, d.password);
      setLoading(false);
      if (error) setError(error);
      else navigate("/account");
    } else {
      const { error, needsConfirmation } = await signUp(d.email, d.password);
      setLoading(false);
      if (error) setError(error);
      else if (needsConfirmation) setNeedsConfirmation(true);
      else navigate("/account");
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div>
        <button className="bg-link" style={{ marginBottom: "var(--s5)" }} onClick={() => navigate("/account")}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>← {t("tab.account")}</span>
        </button>
        <div className="busw mb16"><AlertIcon size={16} /><span>{t("auth.env_missing")}</span></div>
      </div>
    );
  }

  if (needsConfirmation) {
    return (
      <div style={{ textAlign: "center", paddingTop: "var(--s8)" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(90,110,84,0.10)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--s4)" }}>
          <CheckIcon size={26} style={{ color: "var(--success)" }} />
        </div>
        <h1 className="editorial-title" style={{ fontSize: "1.5rem", marginBottom: "var(--s2)" }}>{t("auth.email_confirm_title")}</h1>
        <p className="muted" style={{ fontSize: "0.875rem", maxWidth: 300, margin: "0 auto var(--s6)", lineHeight: 1.5 }}>
          {t("auth.email_confirm_body")}
        </p>
        <button className="btn bp blk" style={{ maxWidth: 280, margin: "0 auto" }} onClick={() => { setMode("login"); setNeedsConfirmation(false); }}>{t("auth.back_login")}</button>
      </div>
    );
  }

  if (resetSent) {
    return (
      <div style={{ textAlign: "center", paddingTop: "var(--s8)" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(90,110,84,0.10)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--s4)" }}>
          <CheckIcon size={26} style={{ color: "var(--success)" }} />
        </div>
        <h1 className="editorial-title" style={{ fontSize: "1.5rem", marginBottom: "var(--s2)" }}>{t("auth.reset_sent_title")}</h1>
        <p className="muted" style={{ fontSize: "0.875rem", maxWidth: 300, margin: "0 auto var(--s6)", lineHeight: 1.5 }}>
          {t("auth.reset_sent_body")}
        </p>
        <button className="btn bp blk" style={{ maxWidth: 280, margin: "0 auto" }} onClick={() => { setMode("login"); setResetSent(false); }}>{t("auth.back_login")}</button>
      </div>
    );
  }

  const eyebrowKey = mode === "login" ? "auth.welcome_back" : mode === "register" ? "auth.get_started" : "auth.reset_password";
  const titleKey = mode === "login" ? "auth.login" : mode === "register" ? "auth.register" : "auth.forgot_password";
  const submitLabel = loading
    ? t("auth.loading")
    : mode === "login" ? t("auth.login")
    : mode === "register" ? t("auth.register")
    : t("auth.sending_link");

  return (
    <div>
      <button className="bg-link" style={{ marginBottom: "var(--s5)" }} onClick={() => navigate("/account")}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>← {t("tab.account")}</span>
      </button>
      <div className="eyebrow mb8">{t(eyebrowKey)}</div>
      <h1 className="editorial-title" style={{ fontSize: "1.625rem", marginBottom: "var(--s1)" }}>{t(titleKey)}</h1>
      <p className="muted mb24">
        {mode === "reset" ? t("auth.reset_desc") : t("auth.welcome_mococha")}
      </p>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="field">
          <label>{t("auth.email")}</label>
          <input className="in" type="email" autoComplete="email" {...register("email")} />
          {errors.email && <span className="fe">{t("auth.email_invalid")}</span>}
        </div>
        {mode !== "reset" && (
          <div className="field">
            <label>{t("auth.password")}</label>
            <input className="in" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} {...register("password")} />
            {errors.password && <span className="fe">{t("auth.password_short")}</span>}
          </div>
        )}
        {error && <div className="busw mb16"><AlertIcon size={16} /><span>{error}</span></div>}
        <button className="btn bp blk" type="submit" disabled={loading}>
          {submitLabel}
        </button>
      </form>

      {mode === "login" && passkeySupported && (
        <>
          <div className="rb mb16" style={{ alignItems: "center", gap: "var(--s2)", marginTop: "var(--s4)" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border-color)" }} />
            <span className="muted" style={{ fontSize: "0.75rem" }}>of</span>
            <div style={{ flex: 1, height: 1, background: "var(--border-color)" }} />
          </div>
          <button
            className="btn bs blk mb16"
            disabled={passkeyLoading}
            onClick={async () => {
              setPasskeyLoading(true);
              setError(null);
              const { error: pkError } = await signInWithPasskey();
              setPasskeyLoading(false);
              if (pkError) { setError(pkError); return; }
              navigate("/account");
            }}
          >
            <FingerprintIcon size={18} /> {passkeyLoading ? t("auth.loading") : t("security.passkey_login")}
          </button>
        </>
      )}

      {mode === "login" && (
        <button className="bg-link blk tcenter mt16" onClick={() => { setMode("reset"); setError(null); }}>
          {t("auth.forgot_link")}
        </button>
      )}
      {mode !== "reset" && (
        <button className="bg-link blk tcenter mt8" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}>
          {mode === "login" ? t("auth.no_account") : t("auth.have_account")}
        </button>
      )}
      {mode === "reset" && (
        <button className="bg-link blk tcenter mt16" onClick={() => { setMode("login"); setError(null); }}>
          {t("auth.back_login")}
        </button>
      )}
      {mode !== "reset" && (
        <button className="bg-link blk tcenter mt8" onClick={() => navigate("/")}>{t("auth.continue_guest")}</button>
      )}
    </div>
  );
}
