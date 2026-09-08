export function friendlyError(message: string | null | undefined, fallback = "Er ging iets mis. Probeer het opnieuw.") {
  const normalized = message?.toLowerCase() ?? "";

  if (normalized.includes("invalid login credentials")) return "Je e-mailadres of wachtwoord klopt niet.";
  if (normalized.includes("email not confirmed")) return "Bevestig eerst je e-mailadres voordat je inlogt.";
  if (normalized.includes("already registered") || normalized.includes("already been registered")) return "Er bestaat al een account met dit e-mailadres.";
  if (normalized.includes("rate limit") || normalized.includes("too many requests")) return "Je hebt te veel pogingen gedaan. Probeer het straks opnieuw.";
  if (normalized.includes("network") || normalized.includes("fetch")) return "Controleer je internetverbinding en probeer het opnieuw.";

  return fallback;
}