#!/bin/bash

# Test the n8n webhook we just created
echo "🧪 Testing n8n Webhook Integration"
echo "==================================="
echo ""

# Webhook URL
WEBHOOK_URL="http://localhost:5678/webhook/agenda-test"

echo "Testing webhook at: $WEBHOOK_URL"
echo ""

# Test data
TEST_DATA='{
  "test": true,
  "source": "Agenda Dashboard",
  "action": "test-connection",
  "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
}'

echo "Sending test data:"
echo "$TEST_DATA" | jq . 2>/dev/null || echo "$TEST_DATA"
echo ""

# Send the request
echo "Response from n8n:"
echo "-------------------"
response=$(curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA" 2>&1)

# Check if curl succeeded
if [ $? -eq 0 ]; then
    # Try to format with jq if available
    echo "$response" | jq . 2>/dev/null || echo "$response"
    echo ""
    echo "✅ Webhook test completed!"
else
    echo "❌ Failed to connect to webhook"
    echo "$response"
fi

echo ""
echo "==================================="
echo ""
echo "📝 What this test does:"
echo "1. Sends a POST request to your n8n webhook"
echo "2. n8n processes the data through the workflow"
echo "3. Returns enhanced response with mock email data"
echo ""
echo "⚠️  Note: The workflow must be ACTIVATED in n8n!"
echo "Go to http://localhost:5678 and activate the 'Webhook test' workflow"