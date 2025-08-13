#!/bin/bash

# Permanent Cloudflare Tunnel Setup for n8n
echo "🚀 Setting up Permanent Cloudflare Tunnel"
echo "=========================================="
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared >/dev/null 2>&1; then
    echo "Installing cloudflared..."
    brew install cloudflared
fi

echo "✅ cloudflared is installed"
echo ""

# Create config directory if it doesn't exist
CONFIG_DIR="$HOME/.cloudflared"
mkdir -p "$CONFIG_DIR"

echo "📝 Permanent Tunnel Setup Instructions:"
echo ""
echo "1. In Cloudflare Dashboard:"
echo "   - Go to Zero Trust → Access → Tunnels"
echo "   - Click 'Create a tunnel'"
echo "   - Name it: n8n-tunnel"
echo "   - Save the tunnel"
echo ""
echo "2. You'll get a token that looks like:"
echo "   cloudflared service install eyJhIjoiYm......"
echo ""
echo "3. Configure your tunnel route:"
echo "   - Public hostname: n8n.yourdomain.com"
echo "   - Service: HTTP → localhost:5678"
echo ""

read -p "Do you have your tunnel token? (y/n): " has_token

if [ "$has_token" = "y" ]; then
    echo ""
    echo "Paste your ENTIRE tunnel run command (starting with 'cloudflared service install' or just the token):"
    read -r tunnel_command
    
    # Extract token if full command was pasted
    if [[ $tunnel_command == *"cloudflared service install"* ]]; then
        token=$(echo "$tunnel_command" | sed 's/cloudflared service install //')
    else
        token="$tunnel_command"
    fi
    
    # Save token to file for reuse
    echo "$token" > "$CONFIG_DIR/n8n-tunnel-token.txt"
    echo "✅ Token saved to $CONFIG_DIR/n8n-tunnel-token.txt"
    echo ""
    
    echo "Starting your permanent tunnel..."
    echo ""
    
    # Run tunnel with the token
    cloudflared tunnel run --token "$token"
else
    echo ""
    echo "To get your token:"
    echo "1. Go to Cloudflare Dashboard"
    echo "2. Zero Trust → Access → Tunnels"
    echo "3. Click on your tunnel"
    echo "4. Copy the token from the install command"
    echo ""
    echo "Then run this script again!"
fi