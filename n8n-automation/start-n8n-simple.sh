#!/bin/bash

# Simple n8n starter - just n8n, no tunnel
echo "Starting n8n locally (no tunnel)..."
echo "=================================="
echo ""

# Kill any existing n8n
pkill -f n8n 2>/dev/null || true
sleep 1

# Start n8n with basic settings
echo "Starting on http://localhost:5678"
echo ""

N8N_PORT=5678 \
N8N_PROTOCOL=http \
N8N_HOST=0.0.0.0 \
n8n start

# If we get here, n8n stopped or crashed
echo ""
echo "n8n has stopped."