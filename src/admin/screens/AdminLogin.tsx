import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../auth";
import { usePrefs } from "../../store/prefs";
import { createAdminT } from "../i18n";
import { ShieldIcon } from "../../components/icons";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { signIn, resetPassword } = useAdminAuth();
  const { language } = usePrefs();
  const t = createAdminT(language);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      navigate("/admin");
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMsg(null);
    const { error: err } = await resetPassword(resetEmail);
    if (err) {
      setResetMsg(t("admin.login.reset_error"));
    } else {
      setResetMsg(t("admin.login.reset_sent"));
    }
  };

  return (
    <div className="admin-login-screen">
      <div className="admin-login-container">
        <div className="admin-login-logo">
          <div className="admin-login-mark">
            <span>M</span>
          </div>
          <h1 className="admin-login-title">{t("admin.app_name")}</h1>
          <p className="admin-login-subtitle">{t("admin.login.subtitle")}</p>
        </div>

        {!showReset ? (
          <form className="admin-login-form" onSubmit={handleSubmit}>
            <div className="admin-field">
              <label className="admin-field-label">{t("admin.login.email")}</label>
              <input
                className="admin-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
            </div>
            <div className="admin-field">
              <label className="admin-field-label">{t("admin.login.password")}</label>
              <input
                className="admin-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && <div className="admin-error">{error}</div>}

            <button className="admin-btn-primary" type="submit" disabled={loading}>
              {loading ? t("admin.login.signing_in") : t("admin.login.submit")}
            </button>

            <button
              className="admin-text-link"
              type="button"
              onClick={() => setShowReset(true)}
            >
              {t("admin.login.forgot")}
            </button>
          </form>
        ) : (
          <form className="admin-login-form" onSubmit={handleReset}>
            <div className="admin-field">
              <label className="admin-field-label">{t("admin.login.email")}</label>
              <input
                className="admin-input"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            {resetMsg && <div className="admin-info">{resetMsg}</div>}
            <button className="admin-btn-primary" type="submit">
              {t("admin.login.forgot")}
            </button>
            <button
              className="admin-text-link"
              type="button"
              onClick={() => setShowReset(false)}
            >
              {t("admin.login.submit")}
            </button>
          </form>
        )}

        <div className="admin-login-footer">
          <ShieldIcon size={16} />
          <span>MOCOCHA Beheer</span>
        </div>
        <button className="admin-text-link" onClick={() => navigate("/")}>
          {t("admin.login.back_to_customer")}
        </button>
      </div>
    </div>
  );
}
