#!/bin/bash

# Test your permanent Cloudflare tunnel
echo "🌐 Test Your Permanent Cloudflare Tunnel"
echo "========================================"
echo ""

# Prompt for domain
echo "Enter your tunnel domain (e.g., n8n.yourdomain.com):"
read -r DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ Domain required!"
    exit 1
fi

# Add https if not present
if [[ ! $DOMAIN == https://* ]]; then
    DOMAIN="https://$DOMAIN"
fi

echo ""
echo "Testing: $DOMAIN"
echo ""

# Test 1: Basic connectivity
echo "1. Testing basic connectivity..."
if curl -s -o /dev/null -w "%{http_code}" "$DOMAIN" | grep -q "200\|302\|401"; then
    echo "   ✅ Tunnel is reachable!"
else
    echo "   ❌ Cannot reach tunnel"
    echo "   Check if tunnel is running and domain is correct"
    exit 1
fi

# Test 2: n8n webhook
echo ""
echo "2. Testing n8n webhook..."
WEBHOOK_URL="$DOMAIN/webhook-test/agenda-test"
echo "   URL: $WEBHOOK_URL"

response=$(curl -s -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d '{"test": true, "source": "permanent-tunnel-test"}' 2>&1)

if echo "$response" | grep -q "success"; then
    echo "   ✅ Webhook working!"
    echo ""
    echo "Response:"
    echo "$response" | jq . 2>/dev/null || echo "$response"
else
    echo "   ⚠️  Webhook not responding correctly"
    echo "   Make sure the 'Webhook test' workflow is activated in n8n"
    echo ""
    echo "Response:"
    echo "$response"
fi

echo ""
echo "========================================"
echo ""
echo "✅ Your permanent tunnel URL is:"
echo "$DOMAIN"
echo ""
echo "📝 Use this in your Agenda app's .env.local:"
echo "VITE_API_BASE_URL=$DOMAIN/webhook"
echo ""
echo "🔗 Webhook URL for testing:"
echo "$WEBHOOK_URL"
echo ""
echo "This URL will work from anywhere on the internet!"