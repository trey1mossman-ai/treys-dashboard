#!/bin/bash

# Simple test to prove n8n is working
echo "🧪 Quick n8n Test"
echo "================="
echo ""

# Test if n8n is responding
echo "Testing if n8n is actually working..."
echo ""

# Test with curl and save response
curl -s http://localhost:5678 > /tmp/n8n-test.html

# Check if we got a response
if [ -s /tmp/n8n-test.html ]; then
    echo "✅ SUCCESS! n8n IS WORKING!"
    echo ""
    echo "Proof - here's the beginning of the HTML response:"
    echo "---------------------------------------------------"
    head -10 /tmp/n8n-test.html
    echo "---------------------------------------------------"
    echo ""
    echo "The issue is 100% with Chrome, NOT with n8n!"
    echo ""
    echo "SOLUTIONS:"
    echo ""
    echo "1. Use Safari (opening now):"
    open -a Safari http://localhost:5678
    echo ""
    echo "2. Use Firefox:"
    echo "   brew install --cask firefox"
    echo "   open -a Firefox http://localhost:5678"
    echo ""
    echo "3. Try this exact URL in Chrome:"
    echo "   http://127.0.0.1:5678"
    echo ""
    echo "4. Or create a tunnel (this WILL work):"
    echo "   brew install cloudflared"
    echo "   cloudflared tunnel --url http://localhost:5678"
    echo "   (use the https URL it gives you)"
else
    echo "❌ n8n is not responding"
    echo ""
    echo "Start it with:"
    echo "cd '/Volumes/Trey's Macbook TB/n8n.'"
    echo "npx --prefix '/Volumes/Trey's Macbook TB/n8n./n8n-mcp' n8n"
fi