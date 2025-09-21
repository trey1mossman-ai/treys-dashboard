#!/bin/bash

# Day 2 - Staging Deployment Script
# Deploy to staging environment with performance checks

set -e

echo "======================================"
echo "🚀 DEPLOYING TO STAGING ENVIRONMENT"
echo "Day 2 - Advanced Features Deployment"
echo "Time: $(date '+%I:%M %p')"
echo "======================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STAGING_URL=${STAGING_URL:-"https://staging.dashboard.app"}
BUILD_DIR="dist"
DEPLOY_BRANCH="staging"

# Pre-deployment checks
echo "📋 Pre-deployment Checklist"
echo "----------------------------"

# 1. Check for uncommitted changes
if git diff --quiet && git diff --cached --quiet; then
    echo -e "${GREEN}✅ No uncommitted changes${NC}"
else
    echo -e "${RED}❌ Uncommitted changes detected${NC}"
    echo "Please commit or stash changes before deploying"
    exit 1
fi

# 2. Run tests
echo ""
echo "🧪 Running Tests..."
if npm run test:run > /dev/null 2>&1; then
    echo -e "${GREEN}✅ All tests passed${NC}"
else
    echo -e "${RED}❌ Tests failed${NC}"
    exit 1
fi

# 3. Type checking
echo "📝 Type Checking..."
if npm run typecheck > /dev/null 2>&1; then
    echo -e "${GREEN}✅ No TypeScript errors${NC}"
else
    echo -e "${RED}❌ TypeScript errors found${NC}"
    exit 1
fi

# 4. Build production bundle
echo ""
echo "📦 Building Production Bundle..."
npm run build > /dev/null 2>&1

# Check bundle size
TOTAL_SIZE=$(du -sh dist | cut -f1)
JS_SIZE=$(find dist/assets -name "*.js" -exec du -ch {} + | grep total | awk '{print $1}')
CSS_SIZE=$(find dist/assets -name "*.css" -exec du -ch {} + 2>/dev/null | grep total | awk '{print $1}' || echo "0")

echo -e "${BLUE}Bundle Sizes:${NC}"
echo "  Total: $TOTAL_SIZE"
echo "  JS: $JS_SIZE"
echo "  CSS: $CSS_SIZE"

# 5. Run Lighthouse audit on build
echo ""
echo "🔍 Running Lighthouse Audit..."
npx lighthouse $STAGING_URL \
    --output=json \
    --output-path=./lighthouse-staging.json \
    --chrome-flags="--headless" \
    --only-categories=performance \
    --quiet > /dev/null 2>&1 || true

if [ -f lighthouse-staging.json ]; then
    LIGHTHOUSE_SCORE=$(node -e "
        const report = require('./lighthouse-staging.json');
        const score = Math.round(report.categories.performance.score * 100);
        console.log(score);
    " 2>/dev/null || echo "0")
    
    if [ "$LIGHTHOUSE_SCORE" -ge "95" ]; then
        echo -e "${GREEN}✅ Lighthouse Score: $LIGHTHOUSE_SCORE/100${NC}"
    elif [ "$LIGHTHOUSE_SCORE" -ge "90" ]; then
        echo -e "${YELLOW}⚠️  Lighthouse Score: $LIGHTHOUSE_SCORE/100${NC}"
    else
        echo -e "${RED}❌ Lighthouse Score: $LIGHTHOUSE_SCORE/100${NC}"
        echo "Score must be 90+ for staging deployment"
        exit 1
    fi
fi

# 6. Deploy to staging
echo ""
echo "🚀 Deploying to Staging..."

# Using Cloudflare Pages for example
if command -v wrangler &> /dev/null; then
    wrangler pages deploy $BUILD_DIR \
        --project-name=dashboard-staging \
        --branch=$DEPLOY_BRANCH
    
    echo -e "${GREEN}✅ Deployed to Cloudflare Pages${NC}"
    
# Using Vercel
elif command -v vercel &> /dev/null; then
    vercel $BUILD_DIR \
        --prod=false \
        --name=dashboard-staging \
        --yes
    
    echo -e "${GREEN}✅ Deployed to Vercel Staging${NC}"
    
# Using Netlify
elif command -v netlify &> /dev/null; then
    netlify deploy \
        --dir=$BUILD_DIR \
        --site=dashboard-staging \
        --message="Day 2 deployment"
    
    echo -e "${GREEN}✅ Deployed to Netlify${NC}"
    
else
    echo -e "${YELLOW}⚠️  No deployment platform detected${NC}"
    echo "Please configure Cloudflare, Vercel, or Netlify"
fi

# 7. Run smoke tests on staging
echo ""
echo "🔥 Running Smoke Tests on Staging..."

# Wait for deployment to be ready
sleep 10

# Test if staging is accessible
if curl -s -o /dev/null -w "%{http_code}" $STAGING_URL | grep -q "200"; then
    echo -e "${GREEN}✅ Staging site is accessible${NC}"
else
    echo -e "${RED}❌ Staging site is not responding${NC}"
    exit 1
fi

# Test critical endpoints
ENDPOINTS=(
    "/"
    "/api/health"
    "/manifest.json"
)

for endpoint in "${ENDPOINTS[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL$endpoint")
    if [ "$STATUS" == "200" ] || [ "$STATUS" == "304" ]; then
        echo -e "${GREEN}✅ $endpoint - OK${NC}"
    else
        echo -e "${RED}❌ $endpoint - Failed (Status: $STATUS)${NC}"
    fi
done

# 8. Performance metrics on staging
echo ""
echo "📊 Staging Performance Metrics"
echo "------------------------------"

# Measure load time
START_TIME=$(date +%s%N)
curl -s $STAGING_URL > /dev/null
END_TIME=$(date +%s%N)
LOAD_TIME=$(( ($END_TIME - $START_TIME) / 1000000 ))

echo "Load Time: ${LOAD_TIME}ms"
if [ $LOAD_TIME -lt 1500 ]; then
    echo -e "${GREEN}✅ Performance target met (<1500ms)${NC}"
else
    echo -e "${YELLOW}⚠️  Performance needs optimization${NC}"
fi

# 9. Create deployment record
echo ""
echo "📝 Recording Deployment..."

DEPLOYMENT_RECORD="{
  \"environment\": \"staging\",
  \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
  \"commit\": \"$(git rev-parse HEAD)\",
  \"branch\": \"$(git branch --show-current)\",
  \"bundleSize\": {
    \"total\": \"$TOTAL_SIZE\",
    \"js\": \"$JS_SIZE\",
    \"css\": \"$CSS_SIZE\"
  },
  \"lighthouse\": $LIGHTHOUSE_SCORE,
  \"loadTime\": $LOAD_TIME
}"

echo "$DEPLOYMENT_RECORD" > deployments/staging-$(date +%Y%m%d-%H%M%S).json

# 10. Notify team
echo ""
echo "======================================"
echo -e "${GREEN}✅ STAGING DEPLOYMENT COMPLETE${NC}"
echo "======================================"
echo ""
echo "📋 Deployment Summary:"
echo "  URL: $STAGING_URL"
echo "  Time: $(date '+%I:%M %p')"
echo "  Commit: $(git rev-parse --short HEAD)"
echo "  Bundle: $TOTAL_SIZE"
echo "  Performance: ${LOAD_TIME}ms"
echo "  Lighthouse: $LIGHTHOUSE_SCORE/100"
echo ""
echo "Next Steps:"
echo "1. Test all features on staging"
echo "2. Run E2E tests"
echo "3. Get team approval"
echo "4. Deploy to production"
echo ""
echo "To deploy to production, run:"
echo "  ./scripts/deploy-production.sh"

# Cleanup
rm -f lighthouse-staging.json

exit 0
