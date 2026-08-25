/*
# Add user_id and emails_sent to quote_requests, rename selections to selected_items

## Purpose
The quote_requests table exists but needs additional columns for:
- user_id: to link quote requests to authenticated users
- emails_sent: idempotency flag to prevent duplicate emails on retry
- selected_items: to match the edge function's expected column name

## Changes
1. Add `user_id` column (uuid, nullable, references auth.users)
2. Add `emails_sent` column (boolean, default false) — idempotency flag
3. Add `selected_items` column (jsonb) — alias for existing `selections` column
4. Add RLS policies for authenticated users to read their own quote requests

## Security
- RLS enabled on quote_requests
- Authenticated users can read their own quote requests
- Anon + authenticated can insert (guest quotes)
*/

-- Add missing columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_requests' AND column_name = 'user_id') THEN
    ALTER TABLE quote_requests ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_requests' AND column_name = 'emails_sent') THEN
    ALTER TABLE quote_requests ADD COLUMN emails_sent boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_requests' AND column_name = 'selected_items') THEN
    ALTER TABLE quote_requests ADD COLUMN selected_items jsonb;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any, then recreate
DROP POLICY IF EXISTS "select_own_quote_requests" ON quote_requests;
CREATE POLICY "select_own_quote_requests" ON quote_requests FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_quote_requests" ON quote_requests;
CREATE POLICY "insert_quote_requests" ON quote_requests FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_quote_requests" ON quote_requests;
CREATE POLICY "update_own_quote_requests" ON quote_requests FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_quote_requests" ON quote_requests;
CREATE POLICY "delete_own_quote_requests" ON quote_requests FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_quote_requests_concept_id ON quote_requests(concept_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_user_id ON quote_requests(user_id);
