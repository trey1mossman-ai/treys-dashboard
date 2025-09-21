#!/bin/bash

# Deploy to Production Script - Day 2
# Deploys the dashboard to production with strict validation

set -e

echo "======================================"
echo "   DEPLOYING TO PRODUCTION"
echo "   Time: $(date '+%I:%M %p')"
echo "======================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_URL=${PRODUCTION_URL:-"https://dashboard.production.com"}
BUILD_DIR="dist"
MIN_LIGHTHOUSE_SCORE=95
MAX_BUNDLE_SIZE_KB=350

# Function to check last command status
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ $1${NC}"
        exit 1
    fi
}

# Production deployment requires confirmation
echo -e "${YELLOW}⚠️  WARNING: This will deploy to PRODUCTION!${NC}"
echo ""
read -p "Are you sure you want to continue? Type 'DEPLOY' to confirm: " CONFIRM
if [ "$CONFIRM" != "DEPLOY" ]; then
    echo "Deployment cancelled"
    exit 1
fi

# 1. Strict Pre-deployment Checks
echo ""
echo -e "${BLUE}Running STRICT production checks...${NC}"

# Must be on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}✗ Must be on main branch (currently on $CURRENT_BRANCH)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ On main branch${NC}"

# No uncommitted changes allowed
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo -e "${RED}✗ Uncommitted changes detected${NC}"
    git status --short
    exit 1
fi
echo -e "${GREEN}✓ Working directory clean${NC}"

# 2. Run Full Test Suite
echo ""
echo -e "${BLUE}Running FULL test suite...${NC}"

# Type checking
npm run typecheck
check_status "TypeScript validation"

# All tests must pass
npm test -- --run
check_status "Unit tests"

# Integration tests
./test-integration.sh
check_status "Integration tests"

# 3. Build Production Bundle
echo ""
echo -e "${BLUE}Building production bundle with optimizations...${NC}"

# Clean build directory
rm -rf $BUILD_DIR

# Production build with strict mode
NODE_ENV=production npm run build
check_status "Production build"

# 4. Bundle Size Validation
echo ""
echo -e "${BLUE}Validating bundle size...${NC}"

BUNDLE_SIZE_KB=$(du -sk $BUILD_DIR | cut -f1)
if [ $BUNDLE_SIZE_KB -gt $MAX_BUNDLE_SIZE_KB ]; then
    echo -e "${RED}✗ Bundle size ${BUNDLE_SIZE_KB}KB exceeds limit of ${MAX_BUNDLE_SIZE_KB}KB${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Bundle size: ${BUNDLE_SIZE_KB}KB (limit: ${MAX_BUNDLE_SIZE_KB}KB)${NC}"

# 5. Performance Validation
echo ""
echo -e "${BLUE}Running performance validation...${NC}"

# Start preview server
npm run preview > /dev/null 2>&1 &
PREVIEW_PID=$!
sleep 5

# Lighthouse audit is REQUIRED for production
if ! command -v lighthouse &> /dev/null; then
    echo -e "${RED}✗ Lighthouse is required for production deployment${NC}"
    echo "Install with: npm i -g lighthouse"
    kill $PREVIEW_PID 2>/dev/null || true
    exit 1
fi

lighthouse http://localhost:4173 \
    --output=json \
    --output-path=./lighthouse-report.json \
    --chrome-flags="--headless" \
    --only-categories=performance,accessibility,best-practices,seo \
    > /dev/null 2>&1

# Parse and validate scores
PERF_SCORE=$(cat lighthouse-report.json | jq '.categories.performance.score * 100' | cut -d. -f1)
A11Y_SCORE=$(cat lighthouse-report.json | jq '.categories.accessibility.score * 100' | cut -d. -f1)
BEST_SCORE=$(cat lighthouse-report.json | jq '.categories["best-practices"].score * 100' | cut -d. -f1)
SEO_SCORE=$(cat lighthouse-report.json | jq '.categories.seo.score * 100' | cut -d. -f1)

echo "Lighthouse Scores:"
echo "  Performance: ${PERF_SCORE}/100"
echo "  Accessibility: ${A11Y_SCORE}/100"
echo "  Best Practices: ${BEST_SCORE}/100"
echo "  SEO: ${SEO_SCORE}/100"

if [ "$PERF_SCORE" -lt "$MIN_LIGHTHOUSE_SCORE" ]; then
    echo -e "${RED}✗ Performance score ${PERF_SCORE} below minimum ${MIN_LIGHTHOUSE_SCORE}${NC}"
    kill $PREVIEW_PID 2>/dev/null || true
    exit 1
fi

rm lighthouse-report.json
kill $PREVIEW_PID 2>/dev/null || true

echo -e "${GREEN}✓ All performance metrics passed${NC}"

# 6. Create Production Backup
echo ""
echo -e "${BLUE}Creating production backup...${NC}"

BACKUP_TAG="backup-$(date +%Y%m%d-%H%M%S)"
git tag -a $BACKUP_TAG -m "Pre-deployment backup $(date)"
git push origin $BACKUP_TAG
check_status "Backup created: $BACKUP_TAG"

# 7. Deploy to Production
echo ""
echo -e "${BLUE}Deploying to PRODUCTION...${NC}"

if [ -f "vercel.json" ]; then
    # Vercel production deployment
    vercel --prod --confirm --token=$VERCEL_TOKEN_PROD
    check_status "Production deployment"
    
elif [ -f "wrangler.toml" ]; then
    # Cloudflare production deployment
    wrangler pages deploy $BUILD_DIR --project-name=dashboard --branch=main
    check_status "Production deployment"
    
else
    echo -e "${RED}✗ No production deployment configuration found${NC}"
    exit 1
fi

# 8. Post-deployment Health Check
echo ""
echo -e "${BLUE}Running production health check...${NC}"

sleep 10  # Wait for deployment propagation

# Health check
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" ${PRODUCTION_URL}/health)
if [ "$HEALTH_CHECK" != "200" ]; then
    echo -e "${RED}✗ Health check failed (HTTP ${HEALTH_CHECK})${NC}"
    echo "Rolling back deployment..."
    ./scripts/rollback.sh $BACKUP_TAG
    exit 1
fi
echo -e "${GREEN}✓ Health check passed${NC}"

# 9. Create Release Tag
RELEASE_TAG="release-$(date +%Y%m%d-%H%M%S)"
git tag -a $RELEASE_TAG -m "Production release $(date)"
git push origin $RELEASE_TAG

# 10. Success Summary
echo ""
echo "======================================"
echo -e "${GREEN}   PRODUCTION DEPLOYMENT SUCCESSFUL!${NC}"
echo "======================================"
echo ""
echo -e "🚀 Deployed to: ${BLUE}$PRODUCTION_URL${NC}"
echo -e "🏷️  Release tag: ${BLUE}$RELEASE_TAG${NC}"
echo -e "🔒 Backup tag: ${BLUE}$BACKUP_TAG${NC}"
echo ""
echo "Post-deployment checklist:"
echo "[ ] Monitor error rates for 30 minutes"
echo "[ ] Check performance metrics"
echo "[ ] Verify critical user journeys"
echo "[ ] Update status page"
echo ""
echo "If issues arise, rollback with:"
echo "  ./scripts/rollback.sh $BACKUP_TAG"
echo ""
