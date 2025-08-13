#!/bin/bash

# Test n8n webhook connectivity
# This script tests if your n8n webhooks are accessible

echo "🧪 Testing n8n Webhook Connectivity"
echo "===================================="

# Get the n8n URL
read -p "Enter your n8n URL (e.g., https://abc.trycloudflare.com): " N8N_URL
read -p "Enter your webhook token (or press Enter to skip): " WEBHOOK_TOKEN

# Remove trailing slash if present
N8N_URL=${N8N_URL%/}

# Prepare auth header if token provided
if [ -n "$WEBHOOK_TOKEN" ]; then
    AUTH_HEADER="Authorization: Bearer $WEBHOOK_TOKEN"
else
    AUTH_HEADER=""
fi

echo ""
echo "Testing webhooks at: $N8N_URL"
echo ""

# Test function
test_webhook() {
    local path=$1
    local data=$2
    local description=$3
    
    echo "Testing: $description"
    echo "Endpoint: $N8N_URL/webhook/$path"
    
    if [ -n "$AUTH_HEADER" ]; then
        response=$(curl -s -X POST "$N8N_URL/webhook/$path" \
            -H "Content-Type: application/json" \
            -H "$AUTH_HEADER" \
            -d "$data" \
            -w "\nHTTP_STATUS:%{http_code}")
    else
        response=$(curl -s -X POST "$N8N_URL/webhook/$path" \
            -H "Content-Type: application/json" \
            -d "$data" \
            -w "\nHTTP_STATUS:%{http_code}")
    fi
    
    http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_STATUS/d')
    
    if [ "$http_status" = "200" ] || [ "$http_status" = "201" ]; then
        echo "✅ Success (HTTP $http_status)"
        echo "Response: $body"
    elif [ "$http_status" = "404" ]; then
        echo "❌ Webhook not found (HTTP 404)"
        echo "Make sure the webhook path '$path' exists in n8n"
    elif [ "$http_status" = "401" ] || [ "$http_status" = "403" ]; then
        echo "❌ Authentication failed (HTTP $http_status)"
        echo "Check your webhook token"
    else
        echo "❌ Failed (HTTP $http_status)"
        echo "Response: $body"
    fi
    echo "---"
    echo ""
}

# Test each webhook
test_webhook "email-send" \
    '{"to":"test@example.com","subject":"Test Email","text":"This is a test"}' \
    "Email Webhook"

test_webhook "sms-send" \
    '{"to":"+1234567890","body":"Test SMS"}' \
    "SMS Webhook"

test_webhook "whatsapp-send" \
    '{"to":"+1234567890","body":"Test WhatsApp message"}' \
    "WhatsApp Webhook"

test_webhook "ai-agent" \
    '{"messages":[{"role":"user","content":"Hello AI"}]}' \
    "AI Agent Webhook"

echo "===================================="
echo "🏁 Testing Complete!"
echo ""
echo "Next steps:"
echo "1. Create any missing webhooks in n8n"
echo "2. Add this URL to your Cloudflare Workers:"
echo "   N8N_BASE_URL=$N8N_URL"
echo "3. Add the webhook token to Cloudflare secrets:"
echo "   wrangler secret put N8N_WEBHOOK_TOKEN"