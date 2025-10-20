# Gemini AI API Setup Guide

This guide will help you set up the Gemini AI API key for the AI Agent functionality.

## Step 1: Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

## Step 2: Configure the API Key

### Option 1: Environment Variable (Recommended)

1. Create a `.env` file in your project root
2. Add the following line:
   ```
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```
3. Replace `your_actual_api_key_here` with your actual API key
4. Restart your development server

### Option 2: Direct Configuration

If you prefer to hardcode the API key (not recommended for production), you can modify `src/integrations/gemini/client.ts` and replace the fallback API key.

## Step 3: Test the Connection

1. Start your application
2. Go to the AI Agent page
3. Click "Test API Connection" in the suggested questions
4. You should see a success message if everything is working

## Troubleshooting

### Common Issues:

1. **"API key is invalid or expired"**
   - Verify your API key is correct
   - Check if the API key has expired
   - Ensure you copied the entire key without extra spaces

2. **"API quota exceeded"**
   - You've reached the usage limit
   - Wait for the quota to reset or upgrade your plan

3. **"Permission denied"**
   - Your API key doesn't have the required permissions
   - Check your Google Cloud Console settings

4. **"Service unavailable"**
   - Gemini API service is temporarily down
   - Try again later

### Getting Help:

- Check the [Google AI Studio documentation](https://ai.google.dev/docs)
- Verify your API key at [Google AI Studio](https://makersuite.google.com/app/apikey)
- Contact support if issues persist

## Security Notes

- Never commit your API key to version control
- Use environment variables for production deployments
- Regularly rotate your API keys
- Monitor your API usage in Google AI Studio
