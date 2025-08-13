#!/bin/bash

# Fix for n8n IPv6 binding issue
echo "🔧 n8n IPv4 Fix - Force IPv4 binding"
echo "====================================="
echo ""

# Kill any existing n8n
pkill -f n8n 2>/dev/null || true
sleep 2

# Fix the permissions issue first
echo "1. Fixing permissions warning..."
if [ -f "$HOME/.n8n/config" ]; then
    chmod 600 "$HOME/.n8n/config"
    echo "   ✅ Fixed config permissions"
fi
echo ""

# Set the directory
N8N_DIR="/Volumes/Trey's Macbook TB/n8n./n8n-mcp"
cd "$N8N_DIR"

echo "2. Starting n8n with IPv4 binding..."
echo "   (Claude Code shows it's binding to :: which is IPv6)"
echo ""

# Force IPv4 binding and fix the deprecated warning
export N8N_HOST=127.0.0.1  # Force IPv4 localhost
export N8N_PORT=5678
export N8N_PROTOCOL=http
export N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true
export N8N_RUNNERS_ENABLED=true  # Fix the deprecation warning
export NODE_OPTIONS="--dns-result-order=ipv4first"  # Prefer IPv4

echo "Starting n8n with forced IPv4..."
echo "================================="
echo ""

# Start n8n with npx like Claude Code does
npx --prefix "$N8N_DIR" n8n 2>&1 | while IFS= read -r line; do
    echo "$line"
    
    # Look for the success message
    if echo "$line" | grep -q "Editor is now accessible via"; then
        echo ""
        echo "========================================="
        echo "✅ n8n is ready!"
        echo ""
        echo "Try these URLs in order:"
        echo "1. http://127.0.0.1:5678"
        echo "2. http://localhost:5678"
        echo "3. http://[::1]:5678"
        echo "========================================="
        echo ""
        
        # Try opening with IPv4 explicitly
        sleep 2
        open "http://127.0.0.1:5678"
    fi
done