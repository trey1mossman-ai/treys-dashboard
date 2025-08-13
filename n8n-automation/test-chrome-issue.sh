#!/bin/bash

# Test if n8n is ACTUALLY accessible even though Chrome won't load it
echo "🔍 Testing n8n Accessibility"
echo "============================"
echo ""
echo "Based on Claude Code output, n8n IS running correctly."
echo "Let's test if it's actually accessible..."
echo ""

# Test with curl
echo "1. Testing with curl..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5678 2>/dev/null)

if [ "$response" = "200" ] || [ "$response" = "302" ]; then
    echo "   ✅ n8n IS WORKING! (HTTP $response)"
    echo "   The issue is with Chrome, not n8n!"
    echo ""
    
    echo "2. Let's get the actual HTML to prove it's working:"
    echo "   ----------------------------------------"
    curl -s http://localhost:5678 | head -20
    echo "   ----------------------------------------"
    echo ""
    
    echo "3. SOLUTIONS FOR CHROME:"
    echo ""
    echo "   Option A: Use IPv4 explicitly"
    echo "   • Open Chrome"
    echo "   • Type exactly: http://127.0.0.1:5678"
    echo "   • Press Enter"
    echo ""
    
    echo "   Option B: Use Safari instead"
    open -a Safari http://localhost:5678
    echo "   • Safari should open automatically"
    echo ""
    
    echo "   Option C: Fix Chrome's localhost handling"
    echo "   • Open Chrome"
    echo "   • Go to: chrome://flags"
    echo "   • Search for: 'localhost'"
    echo "   • Enable: 'Allow invalid certificates for resources loaded from localhost'"
    echo "   • Restart Chrome"
    echo ""
    
    echo "   Option D: Use Firefox"
    echo "   • Install: brew install --cask firefox"
    echo "   • Open: open -a Firefox http://localhost:5678"
    echo ""
    
    echo "   Option E: Add hosts file entry"
    echo "   • Run: echo '127.0.0.1 n8n.local' | sudo tee -a /etc/hosts"
    echo "   • Then access: http://n8n.local:5678"
    echo ""
    
else
    echo "   ❌ n8n is not accessible (HTTP $response)"
    echo ""
    echo "   Checking if n8n process is running..."
    if pgrep -f n8n > /dev/null; then
        echo "   ✅ n8n process is running"
        echo "   PID: $(pgrep -f n8n)"
        echo ""
        echo "   Trying IPv6 addresses..."
        
        # Try IPv6
        response6=$(curl -s -o /dev/null -w "%{http_code}" "http://[::1]:5678" 2>/dev/null)
        if [ "$response6" = "200" ] || [ "$response6" = "302" ]; then
            echo "   ✅ n8n is accessible via IPv6!"
            echo "   Use: http://[::1]:5678"
            open "http://[::1]:5678"
        fi
    else
        echo "   ❌ n8n is not running"
        echo "   Start it with: ./fix-ipv6-issue.sh"
    fi
fi

echo ""
echo "4. Alternative: Use ngrok for a public URL"
echo "   • Install: brew install ngrok"
echo "   • Run: ngrok http 5678"
echo "   • Use the https URL it provides"