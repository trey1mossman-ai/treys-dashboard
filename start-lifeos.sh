#!/bin/bash

# Life OS Quick Start Script
echo "
╔═══════════════════════════════════════════════════════════╗
║                    🚀 LIFE OS LAUNCHER                     ║
║                 Your Personal Operating System              ║
╚═══════════════════════════════════════════════════════════╝
"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "✨ Starting your Life OS..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎨 Styling: Fixed - No more disco! Clean, disciplined glow effects"
echo "🤖 AI: Working in smart fallback mode (no backend required)"  
echo "⚡ Quick Commands: /task, /block, /meal, /supp all working"
echo "🔄 n8n Ready: Add webhook URLs in Settings when ready"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Opening at: http://localhost:5173"
echo "📱 Mobile: Use your local IP address on same network"
echo ""
echo "💡 Tips:"
echo "  • Press 'N' or '/' to quick capture"
echo "  • Use AI assistant (bottom right) for natural commands"
echo "  • Set up n8n webhooks for automation superpowers"
echo ""
echo "Press Ctrl+C to stop"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Start the dev server
npm run dev