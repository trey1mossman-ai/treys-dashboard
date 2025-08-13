#!/bin/bash

# Enhanced n8n Automation Script with Better Startup
# This ensures n8n actually starts and shows you what's happening

echo "🚀 Starting n8n with Cloudflare Tunnel..."
echo "========================================="

# Configuration
N8N_PORT=5678
N8N_DATA="$HOME/.n8n"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create n8n data folder if it doesn't exist
mkdir -p "$N8N_DATA"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if n8n is installed
if ! command_exists n8n; then
    echo -e "${RED}❌ n8n is not installed!${NC}"
    echo "Installing n8n now..."
    npm install -g n8n
    
    if ! command_exists n8n; then
        echo -e "${RED}Failed to install n8n. Please run manually:${NC}"
        echo "npm install -g n8n"
        exit 1
    fi
fi

# Check if cloudflared is installed
if ! command_exists cloudflared; then
    echo -e "${RED}❌ cloudflared is not installed!${NC}"
    echo "Please install it first:"
    echo "brew install cloudflared"
    echo ""
    echo "Or download from:"
    echo "https://github.com/cloudflare/cloudflared/releases"
    exit 1
fi

# Kill any existing n8n or tunnel processes
echo "🧹 Cleaning up any existing processes..."
pkill -f "n8n start" 2>/dev/null || true
pkill -f cloudflared 2>/dev/null || true
sleep 2

# Start n8n with detailed output
echo -e "${YELLOW}📦 Starting n8n server...${NC}"
echo "Data folder: $N8N_DATA"
echo "Port: $N8N_PORT"
echo ""

# Start n8n in a more visible way
N8N_PROTOCOL=http \
N8N_HOST=0.0.0.0 \
N8N_PORT=$N8N_PORT \
N8N_EDITOR_BASE_URL=http://localhost:$N8N_PORT \
EXECUTIONS_PROCESS=main \
N8N_DIAGNOSTICS_ENABLED=false \
n8n start 2>&1 | sed 's/^/[n8n] /' &

N8N_PID=$!
echo "n8n process started with PID: $N8N_PID"

# Wait for n8n to be ready with better checking
echo -e "${YELLOW}⏳ Waiting for n8n to start...${NC}"
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -s http://localhost:$N8N_PORT >/dev/null 2>&1; then
        echo -e "${GREEN}✅ n8n is running!${NC}"
        break
    fi
    
    # Check if process died
    if ! kill -0 $N8N_PID 2>/dev/null; then
        echo -e "${RED}❌ n8n process died unexpectedly${NC}"
        echo "Trying to see what went wrong..."
        
        # Try to start n8n directly to see error
        echo "Starting n8n in foreground to see errors..."
        N8N_PORT=$N8N_PORT n8n start
        exit 1
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    echo "Attempt $ATTEMPT/$MAX_ATTEMPTS - n8n not ready yet..."
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "${RED}❌ n8n failed to start after $MAX_ATTEMPTS attempts${NC}"
    echo "Try running n8n manually to see the error:"
    echo "n8n start"
    exit 1
fi

# Now start the tunnel
echo ""
echo -e "${YELLOW}🌐 Starting Cloudflare Tunnel...${NC}"

# Start cloudflared tunnel and capture output
cloudflared tunnel --url http://localhost:$N8N_PORT 2>&1 | tee /tmp/tunnel.log &
TUNNEL_PID=$!

echo "Tunnel process started with PID: $TUNNEL_PID"

# Wait for tunnel URL to appear
echo -e "${YELLOW}⏳ Waiting for tunnel URL...${NC}"
sleep 5

# Try to get the URL from cloudflared output
echo ""
echo "========================================="
echo -e "${GREEN}🎉 n8n is now accessible!${NC}"
echo ""
echo "Local URL: http://localhost:$N8N_PORT"
echo ""
echo -e "${YELLOW}Look for your public tunnel URL above ☝️${NC}"
echo "It will look like: https://[random-string].trycloudflare.com"
echo ""
echo "⚠️  SAVE THIS URL for your Cloudflare Workers!"
echo "========================================="
echo ""

# Save PIDs for cleanup
echo "$N8N_PID" > /tmp/n8n.pid
echo "$TUNNEL_PID" > /tmp/tunnel.pid

# Show status
echo "📊 Status:"
echo "  - n8n PID: $N8N_PID"
echo "  - Tunnel PID: $TUNNEL_PID"
echo ""
echo "📝 To stop everything:"
echo "  - Press Ctrl+C in this window"
echo "  - Or run: ./stop-n8n-tunnel.sh"
echo ""

# Keep the script running
echo "✅ Everything is running! Keep this window open."
wait