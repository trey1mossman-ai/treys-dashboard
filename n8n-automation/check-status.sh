#!/bin/bash

# Check n8n status
echo "🔍 Checking n8n status..."
echo "========================"
echo ""

# Check if n8n is running
if pgrep -f "n8n" >/dev/null; then
    echo "✅ n8n is running"
    echo ""
    echo "Process details:"
    ps aux | grep n8n | grep -v grep
    echo ""
    
    # Check if accessible
    if curl -s http://localhost:5678 >/dev/null 2>&1; then
        echo "✅ n8n web interface is accessible at:"
        echo "   http://localhost:5678"
    else
        echo "⚠️  n8n process found but web interface not responding"
    fi
else
    echo "❌ n8n is not running"
    echo ""
    echo "To start n8n:"
    echo "1. Use your Automator app, or"
    echo "2. Run: ./start-n8n-npx.sh"
fi

echo ""

# Check for tunnel
if pgrep -f "cloudflared" >/dev/null; then
    echo "✅ Cloudflare tunnel is running"
    echo "   Check Terminal for your public URL"
else
    echo "ℹ️  No Cloudflare tunnel running"
    echo "   n8n is only accessible locally"
fi

echo ""
echo "========================"