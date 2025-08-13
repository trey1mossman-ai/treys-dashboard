#!/bin/bash

# Test the CORRECT n8n webhook URL and check Cloudflare tunnel
echo "🧪 Testing n8n Webhook with Correct URL"
echo "========================================"
echo ""

# Correct webhook URL for test webhooks
WEBHOOK_URL="http://localhost:5678/webhook-test/agenda-test"

echo "Testing webhook at: $WEBHOOK_URL"
echo ""

# Test data
TEST_DATA='{
  "test": true,
  "source": "Agenda Dashboard",
  "action": "test-connection",
  "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
}'

echo "Sending test data..."
echo ""

# Send the request
echo "Response from n8n:"
echo "-------------------"
response=$(curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA" 2>&1)

if [ $? -eq 0 ]; then
    echo "$response" | jq . 2>/dev/null || echo "$response"
    echo ""
    echo "✅ Webhook test successful!"
else
    echo "❌ Failed to connect to webhook"
    echo "$response"
fi

echo ""
echo "========================================"
echo ""
echo "🌐 Checking for Cloudflare Tunnel..."
echo ""

# Check if cloudflared is running
if pgrep -f "cloudflared" >/dev/null; then
    echo "✅ Cloudflare tunnel process is running!"
    echo ""
    echo "Looking for tunnel URL..."
    
    # Try to find the tunnel URL from logs
    if [ -f /tmp/tunnel.log ]; then
        echo "Checking tunnel log..."
        grep -o 'https://.*\.trycloudflare\.com' /tmp/tunnel.log | tail -1
    fi
    
    # Check running processes for tunnel info
    echo ""
    echo "Tunnel process info:"
    ps aux | grep cloudflared | grep -v grep | head -1
    
    echo ""
    echo "📝 Your public tunnel URL should be visible in the Terminal"
    echo "   where you started the tunnel. Look for:"
    echo "   https://[random-string].trycloudflare.com"
    echo ""
    echo "To test from the internet, use:"
    echo "curl -X POST https://[your-tunnel].trycloudflare.com/webhook-test/agenda-test \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -d '{\"test\": true}'"
else
    echo "❌ No Cloudflare tunnel running"
    echo ""
    echo "To start a tunnel for internet access:"
    echo "cloudflared tunnel --url http://localhost:5678"
    echo ""
    echo "Or use the automation script:"
    echo "cd n8n-automation && ./start-n8n-npx.sh"
fi