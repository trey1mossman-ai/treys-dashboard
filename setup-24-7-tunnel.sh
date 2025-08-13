#!/bin/bash

# Setup Cloudflare Tunnel to run 24/7 as a service
echo "🔧 Setting up 24/7 Cloudflare Tunnel Service"
echo "============================================"
echo ""

CONFIG_DIR="$HOME/.cloudflared"
TOKEN_FILE="$CONFIG_DIR/n8n-tunnel-token.txt"
PLIST_FILE="$HOME/Library/LaunchAgents/com.cloudflare.n8n-tunnel.plist"

# Check if token exists
if [ ! -f "$TOKEN_FILE" ]; then
    echo "❌ Token not found! Run ./setup-permanent-tunnel.sh first"
    exit 1
fi

TOKEN=$(cat "$TOKEN_FILE")
echo "✅ Found tunnel token"
echo ""

# Create LaunchAgent plist for 24/7 operation
echo "Creating LaunchAgent for automatic startup..."

cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cloudflare.n8n-tunnel</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/cloudflared</string>
        <string>tunnel</string>
        <string>run</string>
        <string>--token</string>
        <string>$TOKEN</string>
    </array>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>$HOME/.cloudflared/tunnel.log</string>
    
    <key>StandardErrorPath</key>
    <string>$HOME/.cloudflared/tunnel.error.log</string>
    
    <key>WorkingDirectory</key>
    <string>$HOME</string>
</dict>
</plist>
EOF

echo "✅ LaunchAgent created"
echo ""

# Load the service
echo "Loading service..."
launchctl unload "$PLIST_FILE" 2>/dev/null
launchctl load "$PLIST_FILE"

echo "✅ Service loaded and started!"
echo ""

# Check if it's running
sleep 2
if launchctl list | grep -q "com.cloudflare.n8n-tunnel"; then
    echo "✅ Tunnel service is running!"
    echo ""
    echo "The tunnel will now:"
    echo "• Start automatically when you log in"
    echo "• Restart if it crashes"
    echo "• Run 24/7 in the background"
else
    echo "⚠️  Service may not have started properly"
    echo "Check logs at: ~/.cloudflared/tunnel.error.log"
fi

echo ""
echo "=========================================="
echo "📝 Service Management Commands:"
echo ""
echo "Stop tunnel:    launchctl unload ~/Library/LaunchAgents/com.cloudflare.n8n-tunnel.plist"
echo "Start tunnel:   launchctl load ~/Library/LaunchAgents/com.cloudflare.n8n-tunnel.plist"
echo "Check status:   launchctl list | grep cloudflare"
echo "View logs:      tail -f ~/.cloudflared/tunnel.log"
echo "View errors:    tail -f ~/.cloudflared/tunnel.error.log"
echo ""
echo "Your n8n is now accessible 24/7 at your configured domain!"
echo "(e.g., https://n8n.yourdomain.com)"