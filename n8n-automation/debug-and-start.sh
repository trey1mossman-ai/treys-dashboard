#!/bin/bash

# Comprehensive n8n diagnostic and startup script
echo "🔍 n8n Diagnostic & Startup Tool"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Check if n8n is already running
echo "Step 1: Checking for existing n8n processes..."
if pgrep -f "n8n" >/dev/null; then
    echo -e "${YELLOW}⚠️  n8n processes found:${NC}"
    ps aux | grep n8n | grep -v grep
    echo ""
    echo "Killing existing n8n processes..."
    pkill -f n8n
    sleep 2
    echo "✅ Cleaned up"
else
    echo "✅ No existing n8n processes"
fi
echo ""

# Step 2: Check port 5678
echo "Step 2: Checking port 5678..."
if lsof -Pi :5678 -sTCP:LISTEN -t >/dev/null; then
    echo -e "${YELLOW}⚠️  Port 5678 is in use by:${NC}"
    lsof -Pi :5678
    echo "Attempting to free port..."
    kill $(lsof -t -i:5678) 2>/dev/null || true
    sleep 2
fi
echo "✅ Port 5678 is available"
echo ""

# Step 3: Check n8n directories
echo "Step 3: Checking n8n directories..."
N8N_DIR="/Volumes/Trey's Macbook TB/n8n./n8n-mcp"
if [ -d "$N8N_DIR" ]; then
    echo "✅ n8n-mcp directory exists"
    echo "   Path: $N8N_DIR"
else
    echo -e "${RED}❌ n8n-mcp directory not found!${NC}"
    exit 1
fi

# Check .n8n folder
if [ -d "$HOME/.n8n" ]; then
    echo "✅ n8n data directory exists: $HOME/.n8n"
    
    # Check permissions
    if [ -f "$HOME/.n8n/config" ]; then
        PERMS=$(stat -f "%OLp" "$HOME/.n8n/config" 2>/dev/null || stat -c "%a" "$HOME/.n8n/config" 2>/dev/null)
        echo "   Config file permissions: $PERMS"
        if [ "$PERMS" != "600" ]; then
            echo "   Fixing permissions..."
            chmod 600 "$HOME/.n8n/config" 2>/dev/null || true
        fi
    fi
else
    echo "Creating n8n data directory..."
    mkdir -p "$HOME/.n8n"
fi
echo ""

# Step 4: Test npx availability
echo "Step 4: Testing npx..."
if command -v npx >/dev/null 2>&1; then
    echo "✅ npx is available"
    NPX_VERSION=$(npx --version)
    echo "   Version: $NPX_VERSION"
else
    echo -e "${RED}❌ npx not found!${NC}"
    echo "   Install Node.js first"
    exit 1
fi
echo ""

# Step 5: Try different startup methods
echo "Step 5: Starting n8n..."
echo "=================================="
echo ""

# Method 1: Try with explicit environment variables
echo -e "${YELLOW}Method 1: Starting with environment variables...${NC}"
export N8N_PORT=5678
export N8N_HOST=0.0.0.0
export N8N_PROTOCOL=http
export N8N_BASIC_AUTH_ACTIVE=false
export EXECUTIONS_PROCESS=main
export N8N_DIAGNOSTICS_ENABLED=false

cd "$N8N_DIR"

# Start n8n with more verbose output
echo "Running: npx n8n"
echo "From directory: $(pwd)"
echo ""

# Start n8n and capture output
npx n8n 2>&1 | while IFS= read -r line; do
    echo "[n8n] $line"
    
    # Check for success message
    if echo "$line" | grep -q "Editor is now accessible via"; then
        echo ""
        echo -e "${GREEN}✅ n8n started successfully!${NC}"
        echo "URL: http://localhost:5678"
        echo ""
        echo "Opening in browser..."
        open "http://localhost:5678"
    fi
    
    # Check for error messages
    if echo "$line" | grep -q "Error:"; then
        echo -e "${RED}❌ Error detected${NC}"
    fi
    
    if echo "$line" | grep -q "EADDRINUSE"; then
        echo -e "${RED}❌ Port already in use!${NC}"
        echo "Try: lsof -i :5678"
        echo "Then: kill -9 [PID]"
    fi
done &

N8N_PID=$!
echo "n8n process started with PID: $N8N_PID"
echo ""

# Wait and check if it's accessible
echo "Waiting for n8n to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:5678 >/dev/null 2>&1; then
        echo ""
        echo -e "${GREEN}✅ SUCCESS! n8n is running!${NC}"
        echo "=================================="
        echo "Access n8n at: http://localhost:5678"
        echo "Process PID: $N8N_PID"
        echo ""
        echo "Opening in Chrome..."
        open -a "Google Chrome" "http://localhost:5678"
        echo ""
        echo "Press Ctrl+C to stop n8n"
        break
    fi
    echo -n "."
    sleep 2
done

# If still not accessible after 30 attempts
if ! curl -s http://localhost:5678 >/dev/null 2>&1; then
    echo ""
    echo -e "${RED}❌ n8n failed to become accessible${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check if process is still running: ps aux | grep n8n"
    echo "2. Check logs above for errors"
    echo "3. Try accessing: http://0.0.0.0:5678"
    echo "4. Check firewall settings"
fi

# Keep script running
wait $N8N_PID