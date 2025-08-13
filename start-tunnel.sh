#!/bin/bash

# Quick script to start Cloudflare tunnel for n8n
echo "🚀 Starting Cloudflare Tunnel for n8n"
echo "====================================="
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared >/dev/null 2>&1; then
    echo "❌ cloudflared not installed!"
    echo "Install with: brew install cloudflared"
    exit 1
fi

# Check if tunnel is already running
if pgrep -f "cloudflared" >/dev/null; then
    echo "⚠️  A tunnel is already running!"
    echo "To stop it: pkill -f cloudflared"
    echo ""
    ps aux | grep cloudflared | grep -v grep
    exit 0
fi

# Start the tunnel
echo "Starting tunnel to expose n8n to the internet..."
echo ""
echo "════════════════════════════════════════════════"
echo ""

cloudflared tunnel --url http://localhost:5678

# This will run until you press Ctrl+C