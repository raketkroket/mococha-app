INSERT INTO public.server_secrets (key, value, description) VALUES
  ('RESEND_API_KEY', 're_FBm42RbS_EZapEHmus8F6A3vuwV2UfDt3', 'Resend API key for transactional emails')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
