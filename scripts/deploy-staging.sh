#!/bin/bash

# Deploy to Staging Script - Day 2
# Deploys the dashboard to staging environment with validation

set -e

echo "======================================"
echo "   DEPLOYING TO STAGING ENVIRONMENT"
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
STAGING_URL=${STAGING_URL:-"https://staging-dashboard.vercel.app"}
DEPLOY_BRANCH="staging"
BUILD_DIR="dist"

# Function to check last command status
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ $1${NC}"
        exit 1
    fi
}

# 1. Pre-deployment Checks
echo -e "${BLUE}Running pre-deployment checks...${NC}"

# Check for uncommitted changes
if git diff --quiet && git diff --cached --quiet; then
    echo -e "${GREEN}✓ Working directory clean${NC}"
else
    echo -e "${YELLOW}⚠ Uncommitted changes detected${NC}"
    git status --short
    echo ""
    read -p "Continue with deployment? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 1
    fi
fi

# 2. Run Tests
echo ""
echo -e "${BLUE}Running test suite...${NC}"

# Type checking
npm run typecheck > /dev/null 2>&1
check_status "TypeScript validation"

# Unit tests
npm test -- --run > /dev/null 2>&1
check_status "Unit tests"

# Integration tests
if [ -f "./test-integration.sh" ]; then
    ./test-integration.sh > /dev/null 2>&1
    check_status "Integration tests"
fi

# 3. Build Production Bundle
echo ""
echo -e "${BLUE}Building production bundle...${NC}"

# Clean previous build
rm -rf $BUILD_DIR

# Build with production optimizations
NODE_ENV=production npm run build > /dev/null 2>&1
check_status "Production build"

# Check bundle size
BUNDLE_SIZE=$(du -sh $BUILD_DIR | cut -f1)
echo -e "${GREEN}✓ Bundle size: $BUNDLE_SIZE${NC}"

# 4. Run Lighthouse Audit
echo ""
echo -e "${BLUE}Running Lighthouse audit...${NC}"

# Start preview server in background
npm run preview > /dev/null 2>&1 &
PREVIEW_PID=$!
sleep 3

# Run Lighthouse (if installed)
if command -v lighthouse &> /dev/null; then
    lighthouse http://localhost:4173 \
        --output=json \
        --output-path=./lighthouse-report.json \
        --chrome-flags="--headless" \
        --only-categories=performance,accessibility,best-practices,seo \
        > /dev/null 2>&1
    
    # Parse scores
    PERF_SCORE=$(cat lighthouse-report.json | grep -o '"performance":[^,]*' | grep -o '[0-9.]*' | head -1)
    PERF_SCORE_INT=$(echo "$PERF_SCORE * 100" | bc | cut -d. -f1)
    
    if [ "$PERF_SCORE_INT" -ge 95 ]; then
        echo -e "${GREEN}✓ Lighthouse Performance: ${PERF_SCORE_INT}/100${NC}"
    else
        echo -e "${YELLOW}⚠ Lighthouse Performance: ${PERF_SCORE_INT}/100 (target: 95+)${NC}"
    fi
    
    rm lighthouse-report.json
else
    echo -e "${YELLOW}⚠ Lighthouse not installed, skipping audit${NC}"
fi

# Kill preview server
kill $PREVIEW_PID 2>/dev/null || true

# 5. Deploy to Staging
echo ""
echo -e "${BLUE}Deploying to staging...${NC}"

# Check deployment method
if [ -f "vercel.json" ]; then
    # Vercel deployment
    echo "Using Vercel deployment..."
    
    if command -v vercel &> /dev/null; then
        vercel --prod --confirm --token=$VERCEL_TOKEN > deployment-url.txt 2>&1
        DEPLOYED_URL=$(cat deployment-url.txt | grep "https://" | tail -1)
        check_status "Vercel deployment"
        rm deployment-url.txt
    else
        echo -e "${RED}✗ Vercel CLI not installed${NC}"
        echo "Install with: npm i -g vercel"
        exit 1
    fi
    
elif [ -f "wrangler.toml" ]; then
    # Cloudflare Pages deployment
    echo "Using Cloudflare Pages deployment..."
    
    if command -v wrangler &> /dev/null; then
        wrangler pages deploy $BUILD_DIR --project-name=dashboard-staging
        check_status "Cloudflare deployment"
        DEPLOYED_URL=$STAGING_URL
    else
        echo -e "${RED}✗ Wrangler CLI not installed${NC}"
        echo "Install with: npm i -g wrangler"
        exit 1
    fi
    
else
    # Fallback: Netlify Drop
    echo "Using Netlify Drop deployment..."
    
    if command -v netlify &> /dev/null; then
        netlify deploy --dir=$BUILD_DIR --prod --site=$NETLIFY_SITE_ID
        check_status "Netlify deployment"
        DEPLOYED_URL=$STAGING_URL
    else
        # Manual deployment instructions
        echo -e "${YELLOW}No deployment tool found${NC}"
        echo ""
        echo "Manual deployment options:"
        echo "1. Drag $BUILD_DIR folder to https://app.netlify.com/drop"
        echo "2. Use GitHub Pages: git subtree push --prefix dist origin gh-pages"
        echo "3. Use surge.sh: npx surge $BUILD_DIR"
        exit 1
    fi
fi

# 6. Post-deployment Validation
echo ""
echo -e "${BLUE}Validating deployment...${NC}"

# Wait for deployment to propagate
sleep 5

# Check if site is accessible
if curl -s -o /dev/null -w "%{http_code}" $DEPLOYED_URL | grep -q "200"; then
    echo -e "${GREEN}✓ Site is accessible${NC}"
else
    echo -e "${RED}✗ Site is not accessible${NC}"
    exit 1
fi

# 7. Tag Release
echo ""
echo -e "${BLUE}Creating deployment tag...${NC}"

TAG_NAME="staging-$(date +%Y%m%d-%H%M%S)"
git tag -a $TAG_NAME -m "Staging deployment $(date)"
git push origin $TAG_NAME
check_status "Git tag created: $TAG_NAME"

# 8. Summary
echo ""
echo "======================================"
echo -e "${GREEN}   DEPLOYMENT SUCCESSFUL!${NC}"
echo "======================================"
echo ""
echo -e "🚀 Deployed to: ${BLUE}$DEPLOYED_URL${NC}"
echo -e "🏷️  Tagged as: ${BLUE}$TAG_NAME${NC}"
echo ""
echo "Next steps:"
echo "1. Test on staging: $DEPLOYED_URL"
echo "2. Run E2E tests against staging"
echo "3. Get team approval"
echo "4. Deploy to production: ./scripts/deploy-production.sh"
echo ""
echo "To rollback this deployment:"
echo "  ./scripts/rollback.sh $TAG_NAME"
echo ""
