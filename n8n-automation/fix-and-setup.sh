#!/bin/bash

# Make all scripts executable
echo "Setting up permissions..."
chmod +x *.sh
echo "✅ All scripts are now executable"
echo ""

# Quick check
echo "Checking n8n installation..."
if command -v n8n >/dev/null 2>&1; then
    echo "✅ n8n is installed ($(n8n --version))"
else
    echo "❌ n8n is not installed"
    echo "Installing now..."
    npm install -g n8n
fi
echo ""

echo "Ready! You can now:"
echo "1. Run ./diagnose-n8n.sh to check for issues"
echo "2. Run ./start-n8n-simple.sh to test n8n alone"
echo "3. Run ./start-n8n-enhanced.sh for full setup with tunnel"
echo "4. Update your Automator app with AUTOMATOR_FINAL.applescript"