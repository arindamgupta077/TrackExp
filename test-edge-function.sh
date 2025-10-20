#!/bin/bash

echo "🧪 Testing Edge Function..."

# Test the Edge Function
response=$(curl -X POST \
  "https://vurtgjyhvnaarzfbmznh.supabase.co/functions/v1/process-recurring-expenses" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cnRnanlodm5hYXJ6ZmJtem5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODc3MTgsImV4cCI6MjA3MTk2MzcxOH0.LzxFQJ7lPtyICPcJstrUSoay7vf1uxsHP5vxx1EfwWI" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cnRnanlodm5hYXJ6ZmJtem5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODc3MTgsImV4cCI6MjA3MTk2MzcxOH0.LzxFQJ7lPtyICPcJstrUSoay7vf1uxsHP5vxx1EfwWI" \
  -H "Content-Type: application/json" \
  -w "\nHTTP_STATUS:%{http_code}")

# Extract status and body
status=$(echo "$response" | tail -n1 | sed 's/HTTP_STATUS://')
body=$(echo "$response" | sed '$d')

echo "📊 HTTP Status: $status"
echo "📄 Response Body: $body"

if [ "$status" -eq 200 ]; then
  echo "✅ Edge Function is working correctly!"
else
  echo "❌ Edge Function returned error status: $status"
fi
