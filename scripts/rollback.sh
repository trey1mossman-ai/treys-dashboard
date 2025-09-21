#!/bin/bash

# Rollback Script - Emergency Recovery
# Quickly rollback to a previous deployment

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

if [ -z "$1" ]; then
    echo -e "${RED}Usage: ./rollback.sh <tag-name>${NC}"
    echo ""
    echo "Recent tags:"
    git tag -l --sort=-creatordate | head -10
    exit 1
fi

TAG_NAME=$1

echo "======================================"
echo -e "${YELLOW}   EMERGENCY ROLLBACK${NC}"
echo "   Rolling back to: $TAG_NAME"
echo "======================================"
echo ""

# Confirmation
echo -e "${YELLOW}⚠️  This will rollback production!${NC}"
read -p "Type 'ROLLBACK' to confirm: " CONFIRM
if [ "$CONFIRM" != "ROLLBACK" ]; then
    echo "Rollback cancelled"
    exit 1
fi

# 1. Checkout tag
echo -e "${BLUE}Checking out tag $TAG_NAME...${NC}"
git fetch --tags
git checkout $TAG_NAME

# 2. Build
echo -e "${BLUE}Building from tag...${NC}"
npm install
npm run build

# 3. Deploy
echo -e "${BLUE}Deploying rollback...${NC}"

if [ -f "vercel.json" ]; then
    vercel --prod --confirm --token=$VERCEL_TOKEN_PROD
elif [ -f "wrangler.toml" ]; then
    wrangler pages deploy dist --project-name=dashboard --branch=main
else
    echo -e "${RED}No deployment configuration found${NC}"
    exit 1
fi

# 4. Verify
echo -e "${BLUE}Verifying rollback...${NC}"
sleep 10

HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" ${PRODUCTION_URL}/health)
if [ "$HEALTH_CHECK" == "200" ]; then
    echo -e "${GREEN}✓ Rollback successful${NC}"
else
    echo -e "${RED}✗ Rollback verification failed${NC}"
fi

# 5. Return to main
git checkout main

echo ""
echo -e "${GREEN}Rollback complete!${NC}"
echo "Deployed version: $TAG_NAME"
echo ""
echo "Don't forget to:"
echo "1. Notify the team"
echo "2. Create incident report"
echo "3. Fix the issue that caused rollback"
