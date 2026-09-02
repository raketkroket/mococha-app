import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../data/api";
import { AlertIcon, CheckIcon } from "../components/icons";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;

    const checkRecoverySession = async () => {
      const { data } = await client.auth.getSession();
      setReady(Boolean(data.session));
    };

    void checkRecoverySession();
    const { data: subscription } = client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Je wachtwoord moet minimaal 6 tekens bevatten.");
      return;
    }
    if (password !== confirmation) {
      setError("De wachtwoorden komen niet overeen.");
      return;
    }
    if (!supabase) {
      setError("Inloggen is momenteel niet beschikbaar.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSaved(true);
  };

  if (saved) {
    return (
      <div style={{ textAlign: "center", paddingTop: "var(--s8)" }}>
        <CheckIcon size={32} style={{ color: "var(--success)", marginBottom: "var(--s3)" }} />
        <h1 className="editorial-title" style={{ fontSize: "1.5rem", marginBottom: "var(--s2)" }}>Wachtwoord gewijzigd</h1>
        <p className="muted mb24">Je kunt nu met je nieuwe wachtwoord inloggen.</p>
        <button className="btn bp blk" onClick={() => navigate("/account/inloggen")}>Inloggen</button>
      </div>
    );
  }

  return (
    <div>
      <div className="eyebrow mb8">Accountbeveiliging</div>
      <h1 className="editorial-title" style={{ fontSize: "1.625rem", marginBottom: "var(--s1)" }}>Nieuw wachtwoord</h1>
      <p className="muted mb24">Kies een nieuw wachtwoord voor je MOCOCHA-account.</p>

      {!ready && (
        <div className="busw mb16"><AlertIcon size={16} /><span>Deze herstellink is verlopen of ongeldig. Vraag een nieuwe link aan.</span></div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Nieuw wachtwoord</label>
          <input className="in" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={!ready || loading} />
        </div>
        <div className="field">
          <label>Herhaal nieuw wachtwoord</label>
          <input className="in" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={!ready || loading} />
        </div>
        {error && <div className="busw mb16"><AlertIcon size={16} /><span>{error}</span></div>}
        <button className="btn bp blk" type="submit" disabled={!ready || loading}>{loading ? "Opslaan..." : "Wachtwoord opslaan"}</button>
      </form>

      <button className="bg-link blk tcenter mt16" onClick={() => navigate("/account/inloggen")}>Terug naar inloggen</button>
    </div>
  );
}