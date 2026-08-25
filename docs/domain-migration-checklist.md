# MOCOCHA Domain Migration Checklist

## From: mococha-app.vercel.app → To: app.mococha.nl

### Before Production

1. **Connect `app.mococha.nl`** — Point DNS to your hosting provider
2. **Enable HTTPS** — Provision SSL certificate for app.mococha.nl
3. **Update Supabase Site URL** — In Supabase Dashboard → Authentication → URL Configuration:
   - Site URL: `https://app.mococha.nl`
   - Redirect URLs: Add `https://app.mococha.nl/**`
4. **Update environment variables**:
   ```env
   VITE_APP_URL=https://app.mococha.nl
   VITE_WEBAUTHN_RP_ID=mococha.nl
   VITE_WEBAUTHN_RP_NAME=MOCOCHA
   ```
5. **Update Supabase WebAuthn configuration** — In Supabase Dashboard → Authentication → WebAuthn:
   - RP ID: `mococha.nl`
   - Allowed Origins: `https://app.mococha.nl`
6. **Deploy Apple App Site Association**:
   - URL: `https://mococha.nl/.well-known/apple-app-site-association`
   - Content: `webcredentials:mococha.nl` with app ID `nl.mococha.app`
7. **Deploy Android Asset Links**:
   - URL: `https://mococha.nl/.well-known/assetlinks.json`
   - Add real Android signing certificate fingerprint (replace placeholder)
8. **Test passkeys on production domain** — Register a new passkey on app.mococha.nl
9. **Delete all test passkeys** — Vercel-domain passkeys are cryptographically linked to `mococha-app.vercel.app` and CANNOT be migrated
10. **Register fresh production passkeys** — All users must register new passkeys on the production domain

### Important Notes

- Passkeys are cryptographically linked to the Relying Party ID
- Passkeys registered on `mococha-app.vercel.app` will NOT work on `mococha.nl`
- Users must register a new passkey after the domain change
- TOTP authenticator apps continue to work across domain changes (TOTP is not domain-bound)
- Recovery codes continue to work across domain changes

### Native App Preparation

#### iOS
- Bundle identifier: `nl.mococha.app`
- Associated domain: `webcredentials:mococha.nl`
- Production RP ID: `mococha.nl`

#### Android
- Asset links: `https://mococha.nl/.well-known/assetlinks.json`
- Trusted origin: Based on final app-signing certificate (placeholder until real certificate exists)
- DO NOT create fake signing-certificate values
