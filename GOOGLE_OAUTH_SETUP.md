# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for your Expense Tracker application.

## Prerequisites

1. A Google Cloud Console account
2. Access to your Supabase project dashboard

## Step 1: Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application" as the application type
   - Add authorized redirect URIs:
     - `https://your-project-ref.supabase.co/auth/v1/callback`
     - `http://localhost:8080/auth/v1/callback` (for local development)
   - Note down your Client ID and Client Secret

## Step 2: Configure Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to "Authentication" > "Providers"
4. Find "Google" in the list and click "Edit"
5. Enable the Google provider
6. Enter your Google OAuth credentials:
   - **Client ID**: Your Google OAuth Client ID
   - **Client Secret**: Your Google OAuth Client Secret
7. Save the configuration

## Step 3: Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to your application
3. Click "Continue with Google" on the login page
4. You should be redirected to Google's OAuth consent screen
5. After authorization, you should be redirected back to your app

## Troubleshooting

### Common Issues:

1. **"Invalid redirect URI" error**:
   - Make sure the redirect URI in Google Cloud Console matches exactly
   - Include both production and development URLs

2. **"Provider not enabled" error**:
   - Ensure Google provider is enabled in Supabase dashboard
   - Check that credentials are correctly entered

3. **"Client ID not found" error**:
   - Verify your Google OAuth Client ID is correct
   - Ensure the Google+ API is enabled in Google Cloud Console

### Environment Variables

Make sure your Supabase environment variables are correctly set in your `.env` file:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Security Notes

- Never commit your Google OAuth Client Secret to version control
- Use environment variables for sensitive configuration
- Regularly rotate your OAuth credentials
- Monitor your OAuth usage in Google Cloud Console

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth Providers](https://supabase.com/docs/guides/auth/auth-providers)
