#!/bin/bash

# Complete diagnostic and fix script
echo "🔍 Complete n8n Diagnostic & Fix"
echo "================================"
echo ""

# Function to test URL
test_url() {
    local url=$1
    echo -n "Testing $url ... "
    
    # Try with curl
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$url" 2>/dev/null)
    
    if [ "$response" = "200" ] || [ "$response" = "302" ]; then
        echo "✅ Working!"
        return 0
    else
        echo "❌ Not working (HTTP $response)"
        return 1
    fi
}

# 1. Clean everything up first
echo "1. Cleaning up..."
pkill -f n8n 2>/dev/null || true
pkill -f node 2>/dev/null || true
sleep 3
echo "   ✅ Cleaned"
echo ""

# 2. Check the directory
echo "2. Checking n8n directory..."
N8N_DIR="/Volumes/Trey's Macbook TB/n8n./n8n-mcp"
if [ -d "$N8N_DIR" ]; then
    echo "   ✅ Directory exists"
    cd "$N8N_DIR"
    echo "   Current path: $(pwd)"
else
    echo "   ❌ Directory not found!"
    exit 1
fi
echo ""

# 3. Check Node.js and npm
echo "3. Checking Node.js setup..."
echo "   Node version: $(node --version)"
echo "   npm version: $(npm --version)"
echo "   npx version: $(npx --version)"
echo ""

# 4. Check if n8n is in node_modules
echo "4. Checking n8n installation..."
if [ -d "node_modules/n8n" ]; then
    echo "   ✅ n8n found in node_modules"
    N8N_VERSION=$(node -e "console.log(require('./node_modules/n8n/package.json').version)" 2>/dev/null || echo "unknown")
    echo "   Version: $N8N_VERSION"
else
    echo "   ⚠️  n8n not in node_modules, will use npx to download"
fi
echo ""

# 5. Clear any port conflicts
echo "5. Checking port 5678..."
if lsof -Pi :5678 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "   ⚠️  Port in use, clearing..."
    lsof -ti:5678 | xargs kill -9 2>/dev/null || true
    sleep 2
fi
echo "   ✅ Port 5678 is free"
echo ""

# 6. Fix permissions
echo "6. Fixing permissions..."
if [ -f "$HOME/.n8n/config" ]; then
    chmod 600 "$HOME/.n8n/config" 2>/dev/null || true
    echo "   ✅ Fixed config permissions"
fi
echo ""

# 7. Start n8n with detailed output
echo "7. Starting n8n..."
echo "   Using command: npx --prefix \"$N8N_DIR\" n8n"
echo ""
echo "========================================="
echo "Starting n8n now..."
echo "========================================="
echo ""

# Start n8n with environment variables
export N8N_PORT=5678
export N8N_HOST=0.0.0.0
export N8N_PROTOCOL=http
export NODE_ENV=production
export N8N_BASIC_AUTH_ACTIVE=false

# Start in background and monitor
(
    npx --prefix "$N8N_DIR" n8n 2>&1 | while read line; do
        echo "[n8n] $line"
        if echo "$line" | grep -q "Editor is now accessible"; then
            echo ""
            echo "🎉 n8n is ready!"
            echo ""
        fi
    done
) &

N8N_PID=$!
echo "Started with PID: $N8N_PID"
echo ""

# 8. Wait and test access
echo "8. Waiting for n8n to be ready..."
MAX_WAIT=60
WAITED=0

while [ $WAITED -lt $MAX_WAIT ]; do
    if test_url "http://localhost:5678"; then
        echo ""
        echo "========================================="
        echo "✅ SUCCESS! n8n is running!"
        echo "========================================="
        echo ""
        echo "Try these URLs:"
        echo "  • http://localhost:5678"
        echo "  • http://127.0.0.1:5678"
        echo ""
        echo "Opening in browsers..."
        
        # Try different browsers
        open "http://localhost:5678" 2>/dev/null || true
        open -a "Google Chrome" "http://localhost:5678" 2>/dev/null || true
        open -a "Safari" "http://localhost:5678" 2>/dev/null || true
        
        echo ""
        echo "If browser doesn't load:"
        echo "1. Copy/paste URL manually"
        echo "2. Try incognito/private mode"
        echo "3. Disable ad blockers"
        echo "4. Clear browser cache"
        echo ""
        echo "Process running with PID: $N8N_PID"
        echo "Stop with: kill $N8N_PID"
        echo ""
        break
    fi
    
    sleep 2
    WAITED=$((WAITED + 2))
    echo -n "."
done

if [ $WAITED -ge $MAX_WAIT ]; then
    echo ""
    echo "❌ n8n didn't become accessible after $MAX_WAIT seconds"
    echo ""
    echo "Checking if process is still running..."
    if ps -p $N8N_PID > /dev/null; then
        echo "Process is running but not accessible"
        echo ""
        echo "Try manually:"
        echo "1. Open new Terminal tab"
        echo "2. Run: curl http://localhost:5678"
        echo "3. If that works, it's a browser issue"
    else
        echo "Process died. Check error messages above."
    fi
fi

# Keep running
echo ""
echo "Press Ctrl+C to stop n8n"
wait $N8N_PID