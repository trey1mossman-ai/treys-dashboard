#!/bin/bash

echo "🧪 Testing Your Live Tunnel Connection"
echo "======================================"
echo ""

# Get the tunnel URL from user
echo "What's your tunnel URL? (e.g., n8n.yourdomain.com)"
echo -n "Enter domain: "
read DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ Domain required!"
    exit 1
fi

# Add https if not present
if [[ ! $DOMAIN == https://* ]]; then
    DOMAIN="https://$DOMAIN"
fi

echo ""
echo "Testing your setup..."
echo ""

# Test 1: n8n is accessible
echo "1. Testing n8n access at $DOMAIN..."
if curl -s -o /dev/null -w "%{http_code}" "$DOMAIN" | grep -q "200\|302"; then
    echo "   ✅ n8n is accessible from the internet!"
else
    echo "   ❌ Cannot reach n8n through tunnel"
    exit 1
fi

# Test 2: Webhook works
echo ""
echo "2. Testing webhook at $DOMAIN/webhook-test/agenda-test..."
response=$(curl -s -X POST "$DOMAIN/webhook-test/agenda-test" \
    -H "Content-Type: application/json" \
    -d '{"test": true, "source": "tunnel-test", "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' 2>&1)

if echo "$response" | grep -q "success"; then
    echo "   ✅ Webhook is working!"
    echo ""
    echo "Response:"
    echo "$response" | jq . 2>/dev/null || echo "$response"
else
    echo "   ⚠️  Webhook not responding"
    echo "   Make sure 'Webhook test' workflow is ACTIVATED in n8n"
fi

echo ""
echo "======================================"
echo "✅ Your n8n is live on the internet!"
echo ""
echo "📝 Save these URLs:"
echo "n8n Interface: $DOMAIN"
echo "Webhook Base: $DOMAIN/webhook"
echo "Test Webhook: $DOMAIN/webhook-test/agenda-test"
echo ""
echo "Now let's update your Agenda app to use this URL!"