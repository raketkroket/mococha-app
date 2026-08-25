/**
 * Security library — Passkey, TOTP, Recovery Code, and Security Event helpers.
 *
 * All functions use the Supabase client from data/api.ts.
 * No secrets are stored in frontend code or localStorage.
 */

import { supabase } from "../../data/api";

// --- Passkey Operations ---

export async function registerPasskey(): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Auth not configured." };
  const { error } = await supabase.auth.registerPasskey();
  if (error) return { error: mapPasskeyError(error) };
  return { error: null };
}

export async function signInWithPasskey(): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Auth not configured." };
  const { error } = await supabase.auth.signInWithPasskey();
  if (error) return { error: mapPasskeyError(error) };
  return { error: null };
}

export async function listPasskeys(): Promise<{ data: unknown[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: "Auth not configured." };
  const { data, error } = await supabase.auth.passkey.list();
  if (error) return { data: null, error: mapPasskeyError(error) };
  return { data: data ?? [], error: null };
}

export async function renamePasskey(authenticatorId: string, friendlyName: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Auth not configured." };
  const { error } = await supabase.auth.passkey.update({ id: authenticatorId, friendly_name: friendlyName } as never);
  if (error) return { error: mapPasskeyError(error) };
  return { error: null };
}

export async function deletePasskey(authenticatorId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Auth not configured." };
  const { error } = await supabase.auth.passkey.delete({ id: authenticatorId } as never);
  if (error) return { error: mapPasskeyError(error) };
  return { error: null };
}

function mapPasskeyError(error: { message?: string; name?: string }): string {
  const msg = error.message?.toLowerCase() ?? "";
  const name = error.name?.toLowerCase() ?? "";

  if (name.includes("abort") || msg.includes("cancel") || msg.includes("aborted")) {
    return "Passkey-inloggen is geannuleerd.";
  }
  if (msg.includes("not supported") || name.includes("notsupported") || name.includes("notallowed")) {
    return "Passkeys worden op dit apparaat nog niet ondersteund. Log in met je e-mailadres.";
  }
  if (msg.includes("not found") || msg.includes("no credentials") || msg.includes("no matching")) {
    return "Geen passkey gevonden voor dit apparaat. Log in met je e-mailadres.";
  }
  if (msg.includes("expired") || msg.includes("timeout")) {
    return "De passkey-sessie is verlopen. Probeer het opnieuw.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Er is een netwerkfout opgetreden. Controleer je verbinding en probeer opnieuw.";
  }
  if (msg.includes("banned") || msg.includes("forbidden")) {
    return "Dit account heeft geen toegang.";
  }
  if (msg.includes("email") && msg.includes("confirm")) {
    return "Je e-mailadres is nog niet bevestigd. Controleer je mailbox.";
  }
  return "Er is een fout opgetreden bij de passkey. Probeer het opnieuw of log in met je e-mailadres.";
}

// --- TOTP / MFA Operations ---

export async function enrollTotp(): Promise<{
  data: { id: string; totp_secret: string; uri: string; qr_code: string } | null;
  error: string | null;
}> {
  if (!supabase) return { data: null, error: "Auth not configured." };
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error) return { data: null, error: mapMfaError(error) };
  return { data: data as unknown as { id: string; totp_secret: string; uri: string; qr_code: string }, error: null };
}

export async function challengeTotp(factorId: string): Promise<{
  data: { id: string } | null;
  error: string | null;
}> {
  if (!supabase) return { data: null, error: "Auth not configured." };
  const { data, error } = await supabase.auth.mfa.challenge({ factorId });
  if (error) return { data: null, error: mapMfaError(error) };
  return { data: { id: data.id }, error: null };
}

export async function verifyTotp(
  factorId: string,
  challengeId: string,
  code: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Auth not configured." };
  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
  if (error) return { error: mapMfaError(error) };
  return { error: null };
}

export async function listMfaFactors(): Promise<{ data: unknown[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: "Auth not configured." };
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return { data: null, error: mapMfaError(error) };
  return { data: (data?.totp as unknown[]) ?? [], error: null };
}

export async function removeMfaFactor(factorId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Auth not configured." };
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { error: mapMfaError(error) };
  return { error: null };
}

export async function getAuthenticatorAssuranceLevel(): Promise<{
  currentLevel: string;
  nextLevel: string;
  error: string | null;
}> {
  if (!supabase) return { currentLevel: "aal1", nextLevel: "aal1", error: "Auth not configured." };
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return { currentLevel: "aal1", nextLevel: "aal1", error: mapMfaError(error) };
  return {
    currentLevel: data?.currentLevel ?? "aal1",
    nextLevel: data?.nextLevel ?? "aal1",
    error: null,
  };
}

function mapMfaError(error: { message?: string; code?: string }): string {
  const msg = error.message?.toLowerCase() ?? "";
  if (msg.includes("invalid") || msg.includes("code") || msg.includes("verify")) {
    return "Deze code klopt niet of is verlopen. Probeer de nieuwste code uit je authenticator-app.";
  }
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return "Te veel pogingen. Wacht even voordat je het opnieuw probeert.";
  }
  if (msg.includes("expired")) {
    return "Deze code is verlopen. Probeer de nieuwste code uit je authenticator-app.";
  }
  if (msg.includes("network")) {
    return "Er is een netwerkfout opgetreden. Controleer je verbinding.";
  }
  return "Er is een fout opgetreden. Probeer het opnieuw.";
}

// --- Recovery Codes ---

/**
 * Calls the security-manage edge function to generate recovery codes.
 * The edge function creates high-entropy codes, stores only SHA-256 hashes,
 * and returns the plaintext codes once for the user to save.
 */
export async function generateRecoveryCodes(): Promise<{
  data: string[] | null;
  error: string | null;
}> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { data: null, error: "Auth not configured." };
  if (!supabase) return { data: null, error: "Auth not configured." };

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { data: null, error: "Niet ingelogd." };

  const resp = await fetch(`${url}/functions/v1/security-manage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ action: "generate_recovery_codes" }),
  });
  if (!resp.ok) {
    const json = await resp.json().catch(() => ({}));
    return { data: null, error: json.error ?? "Er is een fout opgetreden." };
  }
  const json = (await resp.json()) as { codes?: string[]; error?: string };
  return { data: json.codes ?? null, error: json.error ?? null };
}

export async function verifyRecoveryCode(code: string): Promise<{ error: string | null; success: boolean }> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey || !supabase) return { error: "Auth not configured.", success: false };

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { error: "Niet ingelogd.", success: false };

  const resp = await fetch(`${url}/functions/v1/security-manage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ action: "verify_recovery_code", code }),
  });
  if (!resp.ok) {
    const json = await resp.json().catch(() => ({}));
    return { error: json.error ?? "Ongeldige of gebruikte code.", success: false };
  }
  return { error: null, success: true };
}

export async function hasRecoveryCodes(): Promise<boolean> {
  if (!supabase) return false;
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return false;
  const { count } = await supabase
    .from("recovery_codes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.user.id)
    .is("used_at", null);
  return (count ?? 0) > 0;
}

// --- Security Events ---

export async function logSecurityEvent(
  eventType: string,
  success: boolean,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!supabase) return;
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return;
  await supabase.from("security_events").insert({
    user_id: user.user.id,
    event_type: eventType,
    success,
    device_info: navigator.userAgent.slice(0, 200),
    metadata: metadata ?? {},
  });
}

export async function getSecurityEvents(): Promise<{ data: unknown[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: "Auth not configured." };
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { data: null, error: "Niet ingelogd." };
  const { data, error } = await supabase
    .from("security_events")
    .select("*")
    .eq("user_id", user.user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return { data: null, error: error.message };
  return { data: data ?? [], error: null };
}

// --- Sessions ---

export async function listSessions(): Promise<{ data: unknown[] | null; error: string | null }> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey || !supabase) return { data: null, error: "Auth not configured." };

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { data: null, error: "Niet ingelogd." };

  const resp = await fetch(`${url}/functions/v1/security-manage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ action: "list_sessions" }),
  });
  if (!resp.ok) return { data: null, error: "Sessies ophalen mislukt." };
  const json = (await resp.json()) as { sessions?: unknown[] };
  return { data: json.sessions ?? [], error: null };
}

export async function revokeAllOtherSessions(): Promise<{ error: string | null }> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey || !supabase) return { error: "Auth not configured." };

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { error: "Niet ingelogd." };

  const resp = await fetch(`${url}/functions/v1/security-manage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ action: "revoke_other_sessions" }),
  });
  if (!resp.ok) return { error: "Sessies intrekken mislukt." };
  return { error: null };
}
