#!/bin/bash

# Quick diagnostic to see why n8n might not be starting

echo "🔍 n8n Diagnostic Check"
echo "======================="
echo ""

# Check if n8n is installed
if command -v n8n >/dev/null 2>&1; then
    echo "✅ n8n is installed"
    n8n --version
else
    echo "❌ n8n is NOT installed"
    echo "   Install with: npm install -g n8n"
    exit 1
fi
echo ""

# Check if port 5678 is already in use
echo "Checking port 5678..."
if lsof -Pi :5678 -sTCP:LISTEN -t >/dev/null; then
    echo "⚠️  Port 5678 is already in use by:"
    lsof -Pi :5678
    echo ""
    echo "Try stopping it with: pkill -f n8n"
else
    echo "✅ Port 5678 is available"
fi
echo ""

# Try to start n8n directly and see what happens
echo "Testing n8n startup..."
echo "Starting n8n (will run for 5 seconds)..."

# Start n8n with timeout
timeout 5 n8n start 2>&1 | head -20

echo ""
echo "If you see errors above, that's why n8n won't start."
echo ""

# Check n8n data folder
echo "n8n data folder:"
echo "$HOME/.n8n"
if [ -d "$HOME/.n8n" ]; then
    echo "✅ Data folder exists"
else
    echo "📁 Creating data folder..."
    mkdir -p "$HOME/.n8n"
fi
echo ""

# Suggest fixes
echo "Common fixes:"
echo "1. Kill existing n8n: pkill -f n8n"
echo "2. Clear n8n data: rm -rf ~/.n8n"
echo "3. Reinstall n8n: npm uninstall -g n8n && npm install -g n8n"
echo "4. Check Node version: node --version (should be 16 or higher)"