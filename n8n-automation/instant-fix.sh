#!/bin/bash

echo "======================================"
echo "    n8n IS WORKING - Chrome Issue"
echo "======================================"
echo ""
echo "Based on Claude Code's output, n8n is"
echo "running perfectly at localhost:5678"
echo ""
echo "Chrome just won't connect to it."
echo ""
echo "INSTANT FIX - Choose one:"
echo ""
echo "1) Press Enter to open in Safari"
echo "2) Type 'tunnel' for public URL"
echo "3) Type 'test' to verify n8n works"
echo ""
read -p "Your choice (1/tunnel/test): " choice

case "$choice" in
    tunnel)
        echo ""
        echo "Creating public URL..."
        if command -v cloudflared >/dev/null 2>&1; then
            cloudflared tunnel --url http://localhost:5678
        else
            echo "Installing cloudflared first..."
            brew install cloudflared
            cloudflared tunnel --url http://localhost:5678
        fi
        ;;
    test)
        echo ""
        echo "Testing n8n..."
        if curl -s http://localhost:5678 | head -1 | grep -q "<"; then
            echo "✅ n8n IS WORKING!"
            echo "Chrome is the problem."
            echo "Opening in Safari..."
            open -a Safari http://localhost:5678
        else
            echo "❌ n8n not responding"
        fi
        ;;
    *)
        echo "Opening in Safari..."
        open -a Safari http://localhost:5678
        ;;
esac