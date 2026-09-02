/*
# Store Mollie API key as a server-side secret

## What this does
Creates a `server_secrets` table accessible ONLY by the service role (which edge functions use).
No anon/authenticated SELECT policy — the key is never exposed to the browser client.
Edge functions read it via the service role key which bypasses RLS.

## Security
- RLS enabled, NO policies for anon or authenticated → only service role can read
- The Mollie live key is inserted here, not in .env or client code
*/
CREATE TABLE IF NOT EXISTS public.server_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.server_secrets ENABLE ROW LEVEL SECURITY;

-- No policies — only service role (which bypasses RLS) can access this table.
-- anon and authenticated roles get zero rows.

-- Set MOLLIE_API_KEY with `supabase secrets set`; never commit provider keys.
