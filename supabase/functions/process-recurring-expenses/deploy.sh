#!/bin/bash

# Deploy the edge function
echo "Deploying process-recurring-expenses Edge Function..."

supabase functions deploy process-recurring-expenses

if [ $? -eq 0 ]; then
    echo "✅ Edge function deployed successfully!"
    echo "Function URL: https://vurtgjyhvnaarzfbmznh.supabase.co/functions/v1/process-recurring-expenses"
    echo ""
    echo "To test the function:"
    echo "curl -X POST \\"
    echo "  \"https://vurtgjyhvnaarzfbmznh.supabase.co/functions/v1/process-recurring-expenses\" \\"
    echo "  -H \"apikey: YOUR_SUPABASE_ANON_KEY\" \\"
    echo "  -H \"Authorization: Bearer YOUR_SUPABASE_ANON_KEY\" \\"
    echo "  -H \"Content-Type: application/json\""
else
    echo "❌ Failed to deploy edge function"
    exit 1
fi
