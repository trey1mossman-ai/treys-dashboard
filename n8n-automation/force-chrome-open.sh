#!/bin/bash

# Force Chrome to open n8n with special flags
echo "🌐 Opening n8n in Chrome with special flags"
echo "==========================================="
echo ""

# Check if n8n is running
if ! pgrep -f n8n > /dev/null; then
    echo "⚠️  n8n is not running. Starting it first..."
    
    # Start n8n like Claude Code
    cd "/Volumes/Trey's Macbook TB/n8n."
    npx --prefix "/Volumes/Trey's Macbook TB/n8n./n8n-mcp" n8n &
    
    echo "Waiting for n8n to start..."
    sleep 15
fi

echo "Opening Chrome with different methods..."
echo ""

# Method 1: Open with IPv4
echo "1. Trying IPv4 address (127.0.0.1)..."
open -a "Google Chrome" "http://127.0.0.1:5678"
sleep 3

# Method 2: Open with flags to ignore certificate errors
echo "2. Trying with Chrome flags..."
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --ignore-certificate-errors \
    --allow-insecure-localhost \
    --disable-web-security \
    --user-data-dir="/tmp/chrome_temp" \
    "http://localhost:5678" 2>/dev/null &

sleep 3

# Method 3: Try with a custom hostname
echo "3. Adding custom hostname..."
if ! grep -q "127.0.0.1 n8n.local" /etc/hosts; then
    echo "127.0.0.1 n8n.local" | sudo tee -a /etc/hosts
fi
open -a "Google Chrome" "http://n8n.local:5678"

echo ""
echo "If Chrome still won't load, try:"
echo ""
echo "1. Open Chrome manually"
echo "2. Type in address bar: chrome://flags"
echo "3. Search for: localhost"
echo "4. Enable: 'Allow invalid certificates for resources loaded from localhost'"
echo "5. Restart Chrome"
echo "6. Go to: http://127.0.0.1:5678"
echo ""
echo "Or use Safari:"
echo "open -a Safari http://localhost:5678"