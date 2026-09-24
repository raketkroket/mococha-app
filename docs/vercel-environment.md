# Vercel Environment Checklist

Set these variables in both the `Production` and `Preview` Vercel environments. They are embedded in the browser bundle, so only use values intended to be public.

## Required

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | The Supabase project URL, for example `https://<project-ref>.supabase.co`. |
| `VITE_SUPABASE_ANON_KEY` | The Supabase browser anon/publishable key. Never use the service-role key. |

## Optional

| Variable | Purpose |
| --- | --- |
| `VITE_APP_URL` | Canonical public app URL used by authentication redirects. Defaults to the current browser origin. |
| `VITE_WEBAUTHN_RP_ID` | WebAuthn relying-party ID. Defaults to the current hostname. Set this for a custom production domain. |
| `VITE_WEBAUTHN_RP_NAME` | Display name for passkeys. Defaults to `MOCOCHA`. |
| `VITE_INSTAGRAM_URL` | Overrides the default Instagram link. |

After changing a Vercel environment variable, redeploy the application. Vite reads `VITE_` variables at build time.

Do not configure Supabase service-role keys, Resend keys, Mollie secrets, or any other private credential as a `VITE_` variable. Keep these in Supabase Edge Function secrets instead.