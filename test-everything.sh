#!/bin/bash

echo "🧪 Testing Agenda Dashboard..."

# Test API health
echo "Testing API..."
curl -s http://localhost:8788/api/quick_actions/list | jq '.' || echo "API not responding (might not be started yet)"

# Test creating a quick action
echo "Creating test action..."
curl -s -X POST http://localhost:8788/api/quick_actions/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Action",
    "webhook_url": "https://webhook.site/test",
    "method": "POST"
  }' | jq '.' || echo "Could not create test action"

# Open in browser
echo "Opening in browser..."
open http://localhost:5173

echo "✅ If you see the app, everything works!"