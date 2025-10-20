-- Enable Google OAuth provider
-- This migration enables Google OAuth for authentication
-- Note: You'll need to configure Google OAuth credentials in your Supabase dashboard

-- Enable the Google provider
INSERT INTO auth.providers (id, name, created_at, updated_at)
VALUES ('google', 'google', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Note: To complete Google OAuth setup, you need to:
-- 1. Go to your Supabase dashboard
-- 2. Navigate to Authentication > Providers
-- 3. Enable Google provider
-- 4. Add your Google OAuth credentials (Client ID and Client Secret)
-- 5. Configure authorized redirect URIs in Google Cloud Console
