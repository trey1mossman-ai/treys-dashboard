#!/bin/bash

echo "🚀 Quick n8n Connection Test"
echo "============================"
echo ""

# Test n8n
echo -n "n8n status: "
if curl -s http://localhost:5678 >/dev/null 2>&1; then
    echo "✅ Running"
    echo "URL: http://localhost:5678"
else
    echo "❌ Not running"
    echo "Start with: cd '/Volumes/Trey's Macbook TB/n8n./n8n-mcp' && npx n8n"
    exit 1
fi

echo ""
echo "App configured to use n8n webhooks at:"
echo "http://localhost:5678/webhook/n8n/*"
echo ""
echo "To start the app:"
echo "npm run dev"
echo ""
echo "Then open: http://localhost:5173"