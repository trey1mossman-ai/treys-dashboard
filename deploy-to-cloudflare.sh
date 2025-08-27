#!/bin/bash
# Cloudflare Deployment Script for Production Dashboard
# This script will deploy your dashboard to https://ailifeassistanttm.com

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deploying to Cloudflare Pages${NC}"
echo "=================================="
echo "Target: https://ailifeassistanttm.com"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo -e "${RED}❌ Error: Not in project root directory${NC}"
    echo "Please run this script from the project root"
    exit 1
fi

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI not found${NC}"
    echo "Install it with: npm install -g wrangler"
    exit 1
fi

echo -e "${YELLOW}📋 Pre-Deployment Checks${NC}"
echo "------------------------"

# Apply production patches
echo "Applying production patches..."
if [ -f "apply-production-patches.sh" ]; then
    ./apply-production-patches.sh
    echo -e "✅ ${GREEN}Production patches applied${NC}"
else
    echo -e "⚠️  ${YELLOW}Production patches script not found - continuing${NC}"
fi

# Check environment variables
echo -e "\n${YELLOW}🔐 Environment Configuration${NC}"
echo "----------------------------"

echo "Checking required secrets..."
required_secrets=("CF_ACCESS_CLIENT_ID" "CF_ACCESS_CLIENT_SECRET" "DASHBOARD_HMAC_SECRET")

for secret in "${required_secrets[@]}"; do
    echo "Checking $secret..."
    if wrangler secret list 2>/dev/null | grep -q "$secret"; then
        echo -e "✅ ${GREEN}$secret is set${NC}"
    else
        echo -e "❌ ${RED}$secret is not set${NC}"
        echo "Set it with: wrangler secret put $secret"
        
        # Offer to set it now
        read -p "Would you like to set $secret now? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            wrangler secret put "$secret"
        else
            echo -e "${RED}Cannot deploy without required secrets${NC}"
            exit 1
        fi
    fi
done

# Generate HMAC secret if needed
if ! wrangler secret list 2>/dev/null | grep -q "DASHBOARD_HMAC_SECRET"; then
    echo -e "\n${YELLOW}Generating HMAC secret...${NC}"
    HMAC_SECRET=$(openssl rand -hex 32)
    echo "$HMAC_SECRET" | wrangler secret put DASHBOARD_HMAC_SECRET
    echo -e "✅ ${GREEN}HMAC secret generated and set${NC}"
fi

echo -e "\n${YELLOW}🗄️ Database Setup${NC}"
echo "-----------------"

# Run database migrations
echo "Running database migrations..."
if [ -f "migrations/0006_final_integration.sql" ]; then
    wrangler d1 execute agenda-dashboard --file=migrations/0006_final_integration.sql
    echo -e "✅ ${GREEN}Database migrations applied${NC}"
else
    echo -e "⚠️  ${YELLOW}Migration file not found - database may need manual setup${NC}"
fi

echo -e "\n${YELLOW}🔨 Build Process${NC}"
echo "----------------"

# Install dependencies
echo "Installing dependencies..."
npm install

# Type check
echo "Running TypeScript checks..."
if npm run typecheck; then
    echo -e "✅ ${GREEN}TypeScript compilation successful${NC}"
else
    echo -e "❌ ${RED}TypeScript errors found${NC}"
    read -p "Continue with deployment anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build for production
echo "Building for production..."
if npm run build; then
    echo -e "✅ ${GREEN}Build successful${NC}"
else
    echo -e "❌ ${RED}Build failed${NC}"
    exit 1
fi

echo -e "\n${YELLOW}🚀 Deployment${NC}"
echo "-------------"

# Get current commit hash for tracking
COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo "Commit: $COMMIT_HASH"

# Deploy to Cloudflare Pages
echo "Deploying to Cloudflare Pages..."
if wrangler pages deploy dist \
    --project-name=agenda-dashboard \
    --branch=main \
    --commit-hash="$COMMIT_HASH"; then
    echo -e "✅ ${GREEN}Deployment successful!${NC}"
else
    echo -e "❌ ${RED}Deployment failed${NC}"
    exit 1
fi

echo -e "\n${YELLOW}🧪 Post-Deployment Validation${NC}"
echo "-----------------------------"

# Wait a moment for deployment to propagate
echo "Waiting for deployment to propagate..."
sleep 10

# Test health endpoint
echo "Testing health endpoint..."
if curl -s -f "https://ailifeassistanttm.com/api/health" >/dev/null; then
    echo -e "✅ ${GREEN}Health check passed${NC}"
    curl -s "https://ailifeassistanttm.com/api/health" | head -1
else
    echo -e "❌ ${RED}Health check failed${NC}"
    echo "The deployment may need a few more minutes to propagate"
fi

# Test version endpoint
echo "Testing version endpoint..."
if curl -s -f "https://ailifeassistanttm.com/api/version" >/dev/null; then
    echo -e "✅ ${GREEN}Version endpoint working${NC}"
else
    echo -e "⚠️  ${YELLOW}Version endpoint not responding${NC}"
fi

# Test SSE endpoint
echo "Testing SSE endpoint..."
if timeout 5s curl -s "https://ailifeassistanttm.com/events" | head -1 >/dev/null 2>&1; then
    echo -e "✅ ${GREEN}SSE endpoint working${NC}"
else
    echo -e "⚠️  ${YELLOW}SSE endpoint may need more time to activate${NC}"
fi

echo -e "\n${GREEN}🎉 Deployment Complete!${NC}"
echo "========================"
echo -e "Dashboard URL: ${BLUE}https://ailifeassistanttm.com${NC}"
echo -e "Commit: ${COMMIT_HASH}"
echo -e "Deployed at: $(date)"

echo -e "\n${YELLOW}📋 Next Steps${NC}"
echo "--------------"
echo "1. Open https://ailifeassistanttm.com in your browser"
echo "2. Test the AI Dock (press 'C' key)"
echo "3. Test the Command Palette (press ⌘K or Ctrl+K)"
echo "4. Configure your n8n webhooks to point to:"
echo "   • https://ailifeassistanttm.com/ingest/calendar"
echo "   • https://ailifeassistanttm.com/ingest/supplements"
echo "   • https://ailifeassistanttm.com/ingest/workout"
echo "   • https://ailifeassistanttm.com/ingest/inventory"
echo "   • https://ailifeassistanttm.com/ingest/status-snapshot"
echo "   • https://ailifeassistanttm.com/ingest/notifications"
echo "   • https://ailifeassistanttm.com/ingest/today-ready"

echo -e "\n${YELLOW}🔧 n8n Configuration${NC}"
echo "-------------------"
echo "Update your n8n HTTP nodes with these headers:"
echo '{
  "Content-Type": "application/json",
  "CF-Access-Client-Id": "{{ $env.CF_ACCESS_CLIENT_ID }}",
  "CF-Access-Client-Secret": "{{ $env.CF_ACCESS_CLIENT_SECRET }}",
  "X-Timestamp": "{{ Math.floor(Date.now() / 1000) }}",
  "Idempotency-Key": "{{ $runId }}-{{ $nodeId }}",
  "X-Signature": "{{ hmacSha256($json, $env.DASHBOARD_HMAC_SECRET) }}"
}'

echo -e "\n${GREEN}Your dashboard is now live! 🎉${NC}"
echo -e "Visit: ${BLUE}https://ailifeassistanttm.com${NC}"

# Optional: Run integration tests
if [ -f "test-integration-suite.sh" ]; then
    echo -e "\n${YELLOW}🧪 Run Integration Tests?${NC}"
    read -p "Would you like to run the full integration test suite? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Running integration tests..."
        ./test-integration-suite.sh
    fi
fi

echo -e "\n${BLUE}Deployment log saved to: deployment-$(date +%Y%m%d-%H%M%S).log${NC}"