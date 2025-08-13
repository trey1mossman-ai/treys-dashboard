#!/bin/bash

echo "✅ Quick Status Check - Is Everything Running?"
echo "=============================================="
echo ""

# Check n8n
echo "1. n8n Status:"
if curl -s http://localhost:5678 >/dev/null 2>&1; then
    echo "   ✅ n8n is running locally"
else
    echo "   ❌ n8n is not running"
    echo "   Start with: cd '/Volumes/Trey's Macbook TB/n8n./n8n-mcp' && npx n8n"
fi

# Check tunnel service
echo ""
echo "2. Tunnel Service Status:"
if launchctl list | grep -q "com.cloudflare.n8n-tunnel"; then
    echo "   ✅ Tunnel service is running (24/7)"
    
    # Get PID
    PID=$(launchctl list | grep "com.cloudflare.n8n-tunnel" | awk '{print $1}')
    if [ "$PID" != "-" ]; then
        echo "   Process ID: $PID"
    fi
else
    echo "   ⚠️  Tunnel service not running as 24/7 service"
    echo "   Run: ./setup-24-7-tunnel.sh to make it permanent"
fi

# Check if cloudflared process is running at all
echo ""
echo "3. Cloudflared Process:"
if pgrep -f "cloudflared" >/dev/null; then
    echo "   ✅ Cloudflared is running"
else
    echo "   ❌ Cloudflared not running"
fi

# Check webhook
echo ""
echo "4. Test Webhook:"
echo -n "   Enter your tunnel domain (e.g., n8n.yourdomain.com): "
read DOMAIN

if [ -n "$DOMAIN" ]; then
    if [[ ! $DOMAIN == https://* ]]; then
        DOMAIN="https://$DOMAIN"
    fi
    
    if curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/webhook-test/agenda-test" -X POST -H "Content-Type: application/json" -d '{"test":true}' | grep -q "200"; then
        echo "   ✅ Webhook is accessible from internet!"
    else
        echo "   ⚠️  Webhook not responding (check if workflow is activated)"
    fi
fi

echo ""
echo "=============================================="
echo ""
echo "📝 Summary:"
echo "If all checks are ✅, you're ready for production!"
echo "Your n8n is accessible 24/7 from anywhere!"