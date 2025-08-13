#!/bin/bash

# Quick setup to make everything ready
echo "🔧 Setting up n8n Automator with npx..."
echo ""

# Make scripts executable
chmod +x *.sh
echo "✅ Scripts are executable"

# Check if cloudflared is installed
if command -v cloudflared >/dev/null 2>&1; then
    echo "✅ Cloudflare tunnel is installed"
else
    echo "⚠️  Cloudflare tunnel not installed"
    echo "   To enable internet access: brew install cloudflared"
fi

# Check if npx works
if command -v npx >/dev/null 2>&1; then
    echo "✅ npx is available"
else
    echo "❌ npx not found (install Node.js)"
fi

# Test if we can reach the n8n directory
if [ -d "/Volumes/Trey's Macbook TB/n8n./n8n-mcp" ]; then
    echo "✅ n8n-mcp directory found"
else
    echo "❌ n8n-mcp directory not found"
fi

echo ""
echo "📋 Quick Start:"
echo "1. Open NPX_SETUP_GUIDE.md for instructions"
echo "2. Copy one of the AppleScript files into Automator"
echo "3. Save as 'Start n8n' app"
echo ""
echo "Or run directly:"
echo "./start-n8n-npx.sh"