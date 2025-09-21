#!/bin/bash

# Day 2 Launch Script
# Starts everything needed for Day 2 features

echo ""
echo "🚀 DAY 2 LAUNCH SEQUENCE"
echo "========================"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if build works
echo "Checking build status..."
if ! npm run build:day2 > /dev/null 2>&1; then
  echo -e "${RED}❌ Build is failing!${NC}"
  echo ""
  echo "Please fix build issues first:"
  echo "  1. Run: ./scripts/day2-ts-fixes.sh"
  echo "  2. Check: SIMPLE_DASHBOARD_FIX.md"
  exit 1
fi

echo -e "${GREEN}✅ Build is passing!${NC}"
echo ""

# Function to check if port is in use
port_in_use() {
  lsof -i :$1 > /dev/null 2>&1
}

# Check if WebSocket server is already running
if port_in_use 3001; then
  echo -e "${YELLOW}⚠️  WebSocket server already running on port 3001${NC}"
else
  echo "Starting WebSocket mock server..."
  if [ -f "mock-websocket-server.js" ]; then
    node mock-websocket-server.js &
    WS_PID=$!
    echo -e "${GREEN}✅ WebSocket server started (PID: $WS_PID)${NC}"
    sleep 2
  else
    echo -e "${YELLOW}⚠️  mock-websocket-server.js not found${NC}"
  fi
fi

# Check if dev server is already running
if port_in_use 5173; then
  echo -e "${YELLOW}⚠️  Dev server already running on port 5173${NC}"
  echo ""
  echo "================================"
  echo -e "${GREEN}Ready to test!${NC}"
  echo "================================"
else
  echo ""
  echo "Starting dev server..."
  echo "================================"
  echo -e "${GREEN}🎉 DAY 2 FEATURES READY!${NC}"
  echo "================================"
  echo ""
  echo "Opening in browser..."
  echo ""
  echo -e "${BLUE}Test these features:${NC}"
  echo "  • Command Palette: Cmd+K"
  echo "  • Keyboard Shortcuts: Shift+?"
  echo "  • WebSocket: Check connection indicator"
  echo "  • Day 2 Demo: http://localhost:5173/day2"
  echo ""
  echo "================================"
  echo ""
  
  # Start dev server (this will block)
  npm run dev
fi

# Cleanup function
cleanup() {
  echo ""
  echo "Shutting down..."
  if [ ! -z "$WS_PID" ]; then
    kill $WS_PID 2>/dev/null
    echo "WebSocket server stopped"
  fi
  exit 0
}

# Set up cleanup on exit
trap cleanup EXIT INT TERM
