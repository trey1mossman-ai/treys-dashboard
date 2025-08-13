#!/bin/bash

# Test n8n accessibility
echo "🌐 Testing n8n Access"
echo "===================="
echo ""

# Test different URLs
URLS=(
    "http://localhost:5678"
    "http://127.0.0.1:5678"
    "http://0.0.0.0:5678"
)

echo "Testing URLs..."
for url in "${URLS[@]}"; do
    echo -n "Testing $url ... "
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|302"; then
        echo "✅ ACCESSIBLE!"
        echo "  Opening in Chrome..."
        open -a "Google Chrome" "$url"
        echo ""
        echo "If Chrome doesn't load the page:"
        echo "1. Try Safari: open -a Safari '$url'"
        echo "2. Try incognito mode"
        echo "3. Clear browser cache"
        echo "4. Disable browser extensions"
        break
    else
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url")
        echo "❌ Not accessible (HTTP $HTTP_CODE)"
    fi
done

echo ""
echo "Checking what's listening on port 5678..."
lsof -i :5678

echo ""
echo "Checking n8n process..."
ps aux | grep n8n | grep -v grep

echo ""
echo "Network interfaces..."
ifconfig | grep "inet " | grep -v 127.0.0.1

echo ""
echo "Firewall status..."
sudo pfctl -s info 2>/dev/null | head -5 || echo "Cannot check firewall (needs sudo)"

echo ""
echo "Try these manually in Chrome:"
for url in "${URLS[@]}"; do
    echo "  $url"
done

echo ""
echo "Alternative: Try in Terminal:"
echo "  curl http://localhost:5678"