#!/bin/bash

# n8n Starter Script - Using npx like Claude Code does
# This matches exactly how your n8n was started successfully

echo "🚀 Starting n8n with Cloudflare Tunnel..."
echo "========================================="
echo ""

# Configuration
N8N_DIR="/Volumes/Trey's Macbook TB/n8n./n8n-mcp"
N8N_PORT=5678

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Kill any existing n8n process
echo "🧹 Cleaning up any existing n8n processes..."
pkill -f "n8n" 2>/dev/null || true
pkill -f cloudflared 2>/dev/null || true
sleep 2

# Start n8n using npx (same as Claude Code)
echo -e "${YELLOW}📦 Starting n8n using npx...${NC}"
echo "This may take a moment if n8n needs to be downloaded..."
echo ""

# Start n8n in background using npx
npx --prefix "$N8N_DIR" n8n &
N8N_PID=$!

echo "n8n starting with PID: $N8N_PID"
echo ""

# Wait for n8n to be ready
echo -e "${YELLOW}⏳ Waiting for n8n to start...${NC}"
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -s http://localhost:$N8N_PORT >/dev/null 2>&1; then
        echo -e "${GREEN}✅ n8n is running!${NC}"
        echo "Local URL: http://localhost:$N8N_PORT"
        break
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    echo "Waiting... ($ATTEMPT/$MAX_ATTEMPTS)"
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo "⚠️  n8n is taking longer to start, but it might still be loading..."
fi

# Check if cloudflared is installed
if command -v cloudflared >/dev/null 2>&1; then
    echo ""
    echo -e "${YELLOW}🌐 Starting Cloudflare Tunnel...${NC}"
    
    # Start tunnel
    cloudflared tunnel --url http://localhost:$N8N_PORT 2>&1 | tee /tmp/tunnel.log &
    TUNNEL_PID=$!
    
    echo "Tunnel starting with PID: $TUNNEL_PID"
    sleep 5
    
    echo ""
    echo "========================================="
    echo -e "${GREEN}✅ n8n is accessible at:${NC}"
    echo "Local: http://localhost:$N8N_PORT"
    echo ""
    echo -e "${YELLOW}Look for your public URL above ☝️${NC}"
    echo "(It will look like: https://xxx.trycloudflare.com)"
    echo "========================================="
else
    echo ""
    echo "========================================="
    echo -e "${GREEN}✅ n8n is running locally at:${NC}"
    echo "http://localhost:$N8N_PORT"
    echo ""
    echo "⚠️  Cloudflare tunnel not installed"
    echo "To enable internet access, install with:"
    echo "brew install cloudflared"
    echo "========================================="
fi

# Save PIDs
echo "$N8N_PID" > /tmp/n8n.pid
[ -n "$TUNNEL_PID" ] && echo "$TUNNEL_PID" > /tmp/tunnel.pid

echo ""
echo "📝 To stop everything:"
echo "  - Press Ctrl+C"
echo "  - Or run: pkill -f n8n"
echo ""
echo "Keep this window open while using n8n!"

# Keep script running
wait