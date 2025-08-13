#!/bin/bash

# Pre-flight check before creating Automator app
echo "🔍 n8n Automator Pre-Flight Check"
echo "=================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check results
READY=true

# 1. Check if scripts are executable
echo "Checking script permissions..."
if [ -x "./start-n8n-tunnel.sh" ]; then
    echo -e "${GREEN}✅ Scripts are executable${NC}"
else
    echo -e "${YELLOW}⚠️  Making scripts executable...${NC}"
    chmod +x *.sh
    echo -e "${GREEN}✅ Fixed!${NC}"
fi
echo ""

# 2. Check n8n installation
echo "Checking n8n installation..."
if command -v n8n &> /dev/null; then
    N8N_VERSION=$(n8n --version 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ n8n installed (version: $N8N_VERSION)${NC}"
else
    echo -e "${RED}❌ n8n is not installed${NC}"
    echo "   Install with: npm install -g n8n"
    READY=false
fi
echo ""

# 3. Check cloudflared installation
echo "Checking cloudflared installation..."
if command -v cloudflared &> /dev/null; then
    CF_VERSION=$(cloudflared --version 2>&1 | head -n1)
    echo -e "${GREEN}✅ cloudflared installed${NC}"
else
    echo -e "${RED}❌ cloudflared is not installed${NC}"
    echo "   Install with: brew install cloudflared"
    READY=false
fi
echo ""

# 4. Check if port 5678 is available
echo "Checking if port 5678 is available..."
if lsof -Pi :5678 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Port 5678 is in use (n8n might already be running)${NC}"
    echo "   Run './stop-n8n-tunnel.sh' to stop it"
else
    echo -e "${GREEN}✅ Port 5678 is available${NC}"
fi
echo ""

# 5. Test if we can start n8n
echo "Testing n8n startup..."
timeout 3 n8n start > /dev/null 2>&1 &
TEST_PID=$!
sleep 2
if kill -0 $TEST_PID 2>/dev/null; then
    kill $TEST_PID 2>/dev/null
    wait $TEST_PID 2>/dev/null
    echo -e "${GREEN}✅ n8n can start successfully${NC}"
else
    echo -e "${YELLOW}⚠️  n8n test start failed (might already be running)${NC}"
fi
echo ""

# 6. Display Automator script path
echo "Your Automator script path:"
echo -e "${YELLOW}$(pwd)${NC}"
echo ""

# Final verdict
echo "=================================="
if [ "$READY" = true ]; then
    echo -e "${GREEN}✅ READY! You can now create your Automator app!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Open Automator"
    echo "2. Create new 'Application'"
    echo "3. Add 'Run AppleScript' action"
    echo "4. Copy the script from SIMPLEST_AUTOMATOR_SCRIPT.applescript"
    echo "5. Save to Desktop as 'Start n8n'"
else
    echo -e "${RED}❌ Please fix the issues above first${NC}"
fi
echo ""
echo "For detailed instructions, see: QUICK_START_GUIDE.md"