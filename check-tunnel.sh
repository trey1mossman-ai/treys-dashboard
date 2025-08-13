#!/bin/bash

# Check and test Cloudflare tunnel for n8n
echo "🌐 Cloudflare Tunnel Status & Test"
echo "==================================="
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared >/dev/null 2>&1; then
    echo "❌ cloudflared is not installed"
    echo ""
    echo "Install with:"
    echo "brew install cloudflared"
    echo ""
    echo "Or download from:"
    echo "https://github.com/cloudflare/cloudflared/releases"
    exit 1
fi

echo "✅ cloudflared is installed"
echo ""

# Check if tunnel is running
if pgrep -f "cloudflared" >/dev/null; then
    echo "✅ Cloudflare tunnel process is running!"
    echo ""
    
    # Get process details
    echo "Tunnel process details:"
    ps aux | grep cloudflared | grep -v grep
    echo ""
    
    # Try to find the tunnel URL
    echo "Looking for tunnel URL..."
    echo "Check the Terminal where you started the tunnel for the URL"
    echo "It will look like: https://[random-string].trycloudflare.com"
    echo ""
    
    # Prompt for tunnel URL
    echo "Enter your tunnel URL (or press Enter to skip):"
    read -r TUNNEL_URL
    
    if [ -n "$TUNNEL_URL" ]; then
        echo ""
        echo "Testing webhook through tunnel..."
        echo "URL: $TUNNEL_URL/webhook-test/agenda-test"
        echo ""
        
        # Test the webhook through tunnel
        response=$(curl -s -X POST "$TUNNEL_URL/webhook-test/agenda-test" \
            -H "Content-Type: application/json" \
            -d '{"test": true, "source": "tunnel-test"}' 2>&1)
        
        if [ $? -eq 0 ]; then
            echo "Response from tunnel:"
            echo "$response" | jq . 2>/dev/null || echo "$response"
            echo ""
            echo "✅ Tunnel is working! Your n8n is accessible from the internet!"
            echo ""
            echo "Share this URL for external access:"
            echo "$TUNNEL_URL/webhook-test/agenda-test"
        else
            echo "❌ Failed to connect through tunnel"
            echo "Make sure the tunnel URL is correct"
        fi
    fi
    
else
    echo "❌ No Cloudflare tunnel is running"
    echo ""
    echo "To start a tunnel and make n8n accessible from the internet:"
    echo ""
    echo "Option 1: Simple tunnel (URL changes each time):"
    echo "cloudflared tunnel --url http://localhost:5678"
    echo ""
    echo "Option 2: Use the automation script:"
    echo "cd n8n-automation"
    echo "./start-n8n-npx.sh"
    echo ""
    echo "After starting, you'll see a URL like:"
    echo "https://abc-xyz-123.trycloudflare.com"
    echo ""
    echo "This URL can be accessed from anywhere on the internet!"
fi

echo ""
echo "==================================="
echo ""
echo "📝 How Cloudflare Tunnel Works:"
echo ""
echo "  Internet → Cloudflare → Your Mac → n8n (localhost:5678)"
echo ""
echo "  Anyone can access: https://your-tunnel.trycloudflare.com/webhook-test/agenda-test"
echo "  Which forwards to: http://localhost:5678/webhook-test/agenda-test"
echo ""
echo "This allows your Agenda app deployed on Cloudflare to reach your local n8n!"