#!/bin/bash

# EXACT Claude Code Method
echo "🎯 Using EXACT Claude Code method..."
echo "===================================="
echo ""

# Kill existing n8n
pkill -f n8n 2>/dev/null || true
sleep 2

# Go to the exact directory Claude Code used
cd "/Volumes/Trey's Macbook TB/n8n./n8n-mcp"

echo "Directory: $(pwd)"
echo ""
echo "Running exactly what Claude Code ran:"
echo "npx --prefix \"/Volumes/Trey's Macbook TB/n8n./n8n-mcp\" n8n"
echo ""

# Run it exactly as Claude Code did
npx --prefix "/Volumes/Trey's Macbook TB/n8n./n8n-mcp" n8n