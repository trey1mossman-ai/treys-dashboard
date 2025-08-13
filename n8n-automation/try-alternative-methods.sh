#!/bin/bash

# Alternative n8n startup methods
echo "🔧 Trying alternative n8n startup methods..."
echo "==========================================="
echo ""

# Kill any existing n8n
pkill -f n8n 2>/dev/null || true
sleep 2

N8N_DIR="/Volumes/Trey's Macbook TB/n8n./n8n-mcp"

echo "Method 1: Direct npx from n8n-mcp directory"
echo "--------------------------------------------"
cd "$N8N_DIR"
echo "Current directory: $(pwd)"
echo "Starting n8n..."
echo ""

# Try with timeout to see if it starts
timeout 20 npx n8n 2>&1 | head -50

echo ""
echo "If you saw n8n starting above, try accessing:"
echo "http://localhost:5678"
echo "http://127.0.0.1:5678"
echo "http://0.0.0.0:5678"
echo ""
echo "Press Enter to try Method 2..."
read

# Kill and try method 2
pkill -f n8n 2>/dev/null || true
sleep 2

echo ""
echo "Method 2: Using n8n from node_modules"
echo "--------------------------------------"
if [ -f "$N8N_DIR/node_modules/.bin/n8n" ]; then
    echo "Found n8n in node_modules"
    "$N8N_DIR/node_modules/.bin/n8n" start
else
    echo "n8n not found in node_modules"
    echo "Installing n8n locally..."
    cd "$N8N_DIR"
    npm install n8n
    if [ -f "$N8N_DIR/node_modules/.bin/n8n" ]; then
        "$N8N_DIR/node_modules/.bin/n8n" start
    fi
fi