#!/bin/bash

# N8N Automation Script with Cloudflare Tunnel
# This script starts n8n and creates a secure tunnel to the internet

echo "🚀 Starting n8n with Cloudflare Tunnel..."

# Configuration
N8N_PORT=5678
TUNNEL_NAME="n8n-agenda-tunnel"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Start n8n in background
echo "📦 Starting n8n..."
if command_exists n8n; then
    # Kill any existing n8n process
    pkill -f n8n || true
    
    # Start n8n
    N8N_PROTOCOL=http \
    N8N_HOST=localhost \
    N8N_PORT=$N8N_PORT \
    N8N_WEBHOOK_BASE_URL=https://$TUNNEL_NAME.trycloudflare.com \
    n8n start &
    N8N_PID=$!
    echo "✅ n8n started with PID: $N8N_PID"
    
    # Wait for n8n to be ready
    echo "⏳ Waiting for n8n to be ready..."
    sleep 5
    
    # Check if n8n is running
    until curl -s http://localhost:$N8N_PORT/healthz > /dev/null 2>&1; do
        echo "Waiting for n8n to start..."
        sleep 2
    done
    echo "✅ n8n is ready!"
else
    echo "❌ n8n is not installed. Install it with: npm install -g n8n"
    exit 1
fi

# Step 2: Start Cloudflare Tunnel
echo "🌐 Starting Cloudflare Tunnel..."
if command_exists cloudflared; then
    # Kill any existing tunnel
    pkill -f cloudflared || true
    
    # Start tunnel (using quick tunnel - no account needed)
    cloudflared tunnel --url http://localhost:$N8N_PORT &
    TUNNEL_PID=$!
    echo "✅ Tunnel started with PID: $TUNNEL_PID"
    
    # Wait and display tunnel URL
    echo "⏳ Waiting for tunnel URL..."
    sleep 5
    
    # The URL will be displayed in the cloudflared output
    echo ""
    echo "========================================="
    echo "🎉 n8n is now accessible from the internet!"
    echo "Look for the URL above that looks like:"
    echo "https://[random-string].trycloudflare.com"
    echo ""
    echo "⚠️  SAVE THIS URL for your Cloudflare Workers!"
    echo "========================================="
    echo ""
    echo "📝 To stop everything, press Ctrl+C or run:"
    echo "   ./stop-n8n-tunnel.sh"
    echo ""
    
    # Save PIDs for cleanup
    echo "$N8N_PID" > /tmp/n8n.pid
    echo "$TUNNEL_PID" > /tmp/tunnel.pid
    
    # Keep script running
    wait $N8N_PID
else
    echo "❌ cloudflared is not installed."
    echo "Install it with: brew install cloudflared"
    echo "Or download from: https://github.com/cloudflare/cloudflared/releases"
    kill $N8N_PID
    exit 1
fi