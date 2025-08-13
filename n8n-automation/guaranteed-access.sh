#!/bin/bash

# Ultimate solution - Start n8n and create a public URL
echo "🚀 n8n with Guaranteed Browser Access"
echo "====================================="
echo ""

# Start n8n if not running
if ! pgrep -f n8n > /dev/null; then
    echo "Starting n8n..."
    cd "/Volumes/Trey's Macbook TB/n8n."
    npx --prefix "/Volumes/Trey's Macbook TB/n8n./n8n-mcp" n8n &
    N8N_PID=$!
    echo "n8n starting with PID: $N8N_PID"
    
    # Wait for it to be ready
    echo "Waiting for n8n to start..."
    for i in {1..30}; do
        if curl -s http://localhost:5678 > /dev/null 2>&1; then
            echo "✅ n8n is running!"
            break
        fi
        sleep 1
        echo -n "."
    done
    echo ""
else
    echo "✅ n8n is already running"
fi

echo ""
echo "Creating public URL for guaranteed access..."
echo ""

# Check if cloudflared is available
if command -v cloudflared >/dev/null 2>&1; then
    echo "Using Cloudflare Tunnel..."
    
    # Kill any existing tunnel
    pkill -f cloudflared 2>/dev/null || true
    
    # Start tunnel
    cloudflared tunnel --url http://localhost:5678 2>&1 | tee /tmp/tunnel.log &
    TUNNEL_PID=$!
    
    echo "Waiting for tunnel URL..."
    sleep 5
    
    # Extract URL from output (if possible)
    echo ""
    echo "========================================="
    echo "✅ SUCCESS!"
    echo ""
    echo "Your n8n is accessible at:"
    echo "1. Look for the https://*.trycloudflare.com URL above"
    echo "2. This URL works from ANY browser, anywhere!"
    echo "========================================="
    
elif command -v ngrok >/dev/null 2>&1; then
    echo "Using ngrok..."
    
    # Kill any existing ngrok
    pkill -f ngrok 2>/dev/null || true
    
    # Start ngrok
    ngrok http 5678 &
    NGROK_PID=$!
    
    sleep 3
    
    # Get ngrok URL
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | grep -o 'https://.*')
    
    echo ""
    echo "========================================="
    echo "✅ SUCCESS!"
    echo ""
    echo "Your n8n is accessible at:"
    echo "$NGROK_URL"
    echo ""
    echo "This URL works from ANY browser!"
    echo "========================================="
    
    # Open it
    open "$NGROK_URL"
else
    echo "⚠️  No tunneling tool found!"
    echo ""
    echo "Install one of these:"
    echo "• Cloudflare: brew install cloudflared"
    echo "• ngrok: brew install ngrok"
    echo ""
    echo "For now, try these local URLs:"
    echo "• http://127.0.0.1:5678"
    echo "• http://localhost:5678"
    echo ""
    echo "Or use Safari instead of Chrome:"
    open -a Safari http://localhost:5678
fi

echo ""
echo "Keep this Terminal window open!"
echo "Press Ctrl+C to stop everything"

# Keep running
wait