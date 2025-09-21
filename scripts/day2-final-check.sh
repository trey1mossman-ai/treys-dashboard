#!/bin/bash

# Day 2 Final Check Script
# Verifies all systems are go for integration

echo "======================================"
echo "   DAY 2 FINAL CHECK"
echo "   Time: $(date '+%I:%M %p')"
echo "======================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TOTAL_CHECKS=0
PASSED_CHECKS=0

# Function to run a check
run_check() {
  local name=$1
  local command=$2
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  
  echo -n "Checking $name... "
  if eval $command > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    return 0
  else
    echo -e "${RED}✗${NC}"
    return 1
  fi
}

# 1. Check Node & npm
run_check "Node.js" "node --version"
run_check "npm" "npm --version"

# 2. Check for legacy files (should NOT exist)
echo ""
echo -e "${BLUE}Legacy Files Check:${NC}"
LEGACY_CLEAN=true
for file in \
  "src/pages/index-optimized.tsx" \
  "src/components/SimpleDashboardOptimized.tsx" \
  "src/services/agentBridge-fixed.ts"; do
  
  if [ -f "$file" ]; then
    echo -e "  ${RED}✗ $file still exists${NC}"
    LEGACY_CLEAN=false
  fi
done

if [ "$LEGACY_CLEAN" = true ]; then
  echo -e "  ${GREEN}✓ All legacy files removed${NC}"
  PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# 3. Check required files exist
echo ""
echo -e "${BLUE}Required Files:${NC}"
run_check "websocket.ts" "[ -f src/services/websocket.ts ]"
run_check "animations.ts" "[ -f src/lib/animations.ts ]"
run_check "animations.css" "[ -f src/styles/animations.css ]"
run_check "simple-dashboard.css" "[ -f src/styles/simple-dashboard.css ]"

# 4. Check TypeScript
echo ""
echo -e "${BLUE}Build Checks:${NC}"
run_check "TypeScript" "npm run typecheck"
run_check "Build" "npm run build:day2"

# 5. Check if WebSocket mock server exists
echo ""
echo -e "${BLUE}WebSocket Setup:${NC}"
run_check "Mock server script" "[ -f mock-websocket-server.js ]"

# 6. Check package.json scripts
echo ""
echo -e "${BLUE}npm Scripts:${NC}"
run_check "dev script" "npm run dev --dry-run"
run_check "build:day2 script" "npm run build:day2 --dry-run"

# Summary
echo ""
echo "======================================"
echo -e "${BLUE}SUMMARY${NC}"
echo "======================================"
echo ""
echo "Checks Passed: $PASSED_CHECKS / $TOTAL_CHECKS"
echo ""

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ]; then
  echo -e "${GREEN}✅ ALL SYSTEMS GO!${NC}"
  echo ""
  echo "You're ready to:"
  echo "1. Start WebSocket server: node mock-websocket-server.js"
  echo "2. Start dev server: npm run dev"
  echo "3. Open http://localhost:5173"
  echo ""
  echo "Test pages:"
  echo "- Main dashboard: http://localhost:5173"
  echo "- Day 2 demo: http://localhost:5173/day2"
else
  FAILED=$((TOTAL_CHECKS - PASSED_CHECKS))
  echo -e "${YELLOW}⚠️  $FAILED checks failed${NC}"
  echo ""
  echo "To fix:"
  echo "1. Run: ./scripts/day2-cleanup.sh"
  echo "2. Fix any TypeScript errors manually"
  echo "3. Run this check again"
fi

echo ""
echo "======================================"
echo "Time: $(date '+%I:%M %p')"
echo "======================================"
