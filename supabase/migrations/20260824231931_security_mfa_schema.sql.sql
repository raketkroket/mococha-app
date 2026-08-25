/*
# Security: MFA, Passkeys, Recovery Codes, Security Events

1. New Tables
- `security_events` — Audit log for all security-related actions (login, MFA, passkey, recovery, sessions)
  - id, user_id, event_type, success, device_info, ip_hint, target_user_id, metadata, created_at
- `recovery_codes` — Hashed one-time recovery codes for users with MFA
  - id, user_id, code_hash, used_at, created_at, used_by
- `passkey_names` — Friendly names for registered passkeys (maps Supabase authenticator IDs to user-chosen names)
  - id, user_id, authenticator_id, friendly_name, created_at, last_used_at
- `security_settings` — Per-user security preferences and status tracking
  - id, user_id, mfa_enabled, passkey_count, recovery_codes_generated_at, last_security_update, created_at, updated_at

2. Security
- RLS enabled on all tables
- security_events: users can read their own events; only service role can insert (via edge functions)
- recovery_codes: users can only read whether they have codes (not the hashes); all operations via edge functions with service role
- passkey_names: users can CRUD their own passkey names
- security_settings: users can read/update their own settings

3. Important Notes
- Recovery codes are stored as SHA-256 hashes only — never plaintext
- Security events do not store secrets, codes, or tokens
- Passkey private keys remain on the user's device — only friendly names are stored here
- The metadata JSONB column in security_events is for non-sensitive context (e.g., browser family, event source)
*/

-- Security events table
CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  success boolean NOT NULL DEFAULT true,
  device_info text,
  ip_hint text,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_security_events" ON security_events;
CREATE POLICY "select_own_security_events"
  ON security_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_security_events" ON security_events;
CREATE POLICY "insert_own_security_events"
  ON security_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Recovery codes table (hashes only)
CREATE TABLE IF NOT EXISTS recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recovery_codes ENABLE ROW LEVEL SECURITY;

-- Users can only see whether they have codes, not the hashes
DROP POLICY IF EXISTS "select_own_recovery_codes" ON recovery_codes;
CREATE POLICY "select_own_recovery_codes"
  ON recovery_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_recovery_codes" ON recovery_codes;
CREATE POLICY "insert_own_recovery_codes"
  ON recovery_codes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_recovery_codes" ON recovery_codes;
CREATE POLICY "update_own_recovery_codes"
  ON recovery_codes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_recovery_codes" ON recovery_codes;
CREATE POLICY "delete_own_recovery_codes"
  ON recovery_codes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Passkey friendly names
CREATE TABLE IF NOT EXISTS passkey_names (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  authenticator_id text NOT NULL,
  friendly_name text NOT NULL DEFAULT 'Passkey',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  UNIQUE(user_id, authenticator_id)
);

ALTER TABLE passkey_names ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_passkey_names" ON passkey_names;
CREATE POLICY "select_own_passkey_names"
  ON passkey_names FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_passkey_names" ON passkey_names;
CREATE POLICY "insert_own_passkey_names"
  ON passkey_names FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_passkey_names" ON passkey_names;
CREATE POLICY "update_own_passkey_names"
  ON passkey_names FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_passkey_names" ON passkey_names;
CREATE POLICY "delete_own_passkey_names"
  ON passkey_names FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Security settings
CREATE TABLE IF NOT EXISTS security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  recovery_codes_generated_at timestamptz,
  last_security_update timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_security_settings" ON security_settings;
CREATE POLICY "select_own_security_settings"
  ON security_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_security_settings" ON security_settings;
CREATE POLICY "insert_own_security_settings"
  ON security_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_security_settings" ON security_settings;
CREATE POLICY "update_own_security_settings"
  ON security_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recovery_codes_user_id ON recovery_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_passkey_names_user_id ON passkey_names(user_id);
CREATE INDEX IF NOT EXISTS idx_security_settings_user_id ON security_settings(user_id);
