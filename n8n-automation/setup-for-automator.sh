#!/bin/bash
# Quick setup script to make everything ready for Automator

echo "🔧 Setting up n8n Automator Integration..."

# Make all scripts executable
chmod +x *.sh

# Check if dependencies are installed
echo "Checking dependencies..."

if ! command -v n8n &> /dev/null; then
    echo "⚠️  n8n is not installed"
    echo "Install with: npm install -g n8n"
    exit 1
fi

if ! command -v cloudflared &> /dev/null; then
    echo "⚠️  cloudflared is not installed"
    echo "Install with: brew install cloudflared"
    echo "Or download from: https://github.com/cloudflare/cloudflared/releases"
    exit 1
fi

echo "✅ All dependencies found!"
echo ""
echo "📝 Next Steps:"
echo "1. Open Automator"
echo "2. Choose 'Application'"
echo "3. Add 'Run Shell Script' action"
echo "4. Copy this path to use in your script:"
echo ""
echo "/Volumes/Trey's Macbook TB/Agenda for the day/n8n-automation"
echo ""
echo "5. Use one of these scripts:"
echo "   - automator-shell-script.txt (simple)"
echo "   - automator-applescript-advanced.txt (full features)"
echo ""
echo "Ready to create your Automator app!"