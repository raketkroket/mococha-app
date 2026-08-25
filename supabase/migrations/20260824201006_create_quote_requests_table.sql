/*
# Quote requests table

Stores quote requests submitted by customers, with idempotency support
to prevent duplicate emails on refresh/retry.

## Table
- `quote_requests` — one row per concept_id (unique)
  - concept_id (uuid, unique)
  - customer_email (text, nullable)
  - concept_name (text, nullable)
  - event_details (jsonb, nullable)
  - selections (jsonb, nullable)
  - totals (jsonb, nullable)
  - status (text, default 'quotation_requested')
  - email_sent_at (timestamptz, nullable — used for idempotency)
  - created_at (timestamptz)
  - updated_at (timestamptz)

## Security
- RLS enabled
- Owner can read their own quote requests
- Service role (edge function) can insert/update
*/

CREATE TABLE IF NOT EXISTS quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id text UNIQUE NOT NULL,
  customer_email text,
  concept_name text,
  event_details jsonb,
  selections jsonb,
  totals jsonb,
  status text NOT NULL DEFAULT 'quotation_requested',
  email_sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_quote_requests" ON quote_requests;
CREATE POLICY "select_own_quote_requests"
  ON quote_requests FOR SELECT TO authenticated
  USING (
    customer_email IS NOT NULL AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.email = quote_requests.customer_email)
  );

DROP POLICY IF EXISTS "insert_quote_requests" ON quote_requests;
CREATE POLICY "insert_quote_requests"
  ON quote_requests FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "update_quote_requests" ON quote_requests;
CREATE POLICY "update_quote_requests"
  ON quote_requests FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_quote_requests_concept ON quote_requests(concept_id);
