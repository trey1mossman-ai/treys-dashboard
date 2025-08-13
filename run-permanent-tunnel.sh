#!/bin/bash

# Run your permanent Cloudflare tunnel
echo "🌐 Running Permanent Cloudflare Tunnel for n8n"
echo "=============================================="
echo ""

CONFIG_DIR="$HOME/.cloudflared"
TOKEN_FILE="$CONFIG_DIR/n8n-tunnel-token.txt"

# Check if token file exists
if [ -f "$TOKEN_FILE" ]; then
    echo "✅ Found saved tunnel token"
    TOKEN=$(cat "$TOKEN_FILE")
    
    echo ""
    echo "Starting tunnel..."
    echo "Your n8n will be accessible at your configured domain"
    echo "(e.g., https://n8n.yourdomain.com)"
    echo ""
    echo "Press Ctrl+C to stop"
    echo ""
    
    # Run the tunnel
    cloudflared tunnel run --token "$TOKEN"
else
    echo "❌ No saved token found!"
    echo ""
    echo "First run: ./setup-permanent-tunnel.sh"
    echo "To save your tunnel token"
fi