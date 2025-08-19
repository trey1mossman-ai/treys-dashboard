#!/bin/bash

# Setup Agent API for Agenda Dashboard
# This script configures your Agent API for AI control

echo "========================================="
echo "🤖 AGENT API SETUP FOR AGENDA DASHBOARD"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to generate random token
generate_token() {
    openssl rand -hex 32
}

# Function to generate HMAC secret
generate_secret() {
    openssl rand -hex 16
}

echo -e "${BLUE}This script will help you set up the Agent API for AI control of your dashboard.${NC}"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI not found!${NC}"
    echo "Please install it first:"
    echo "  npm install -g wrangler"
    exit 1
fi

echo -e "${GREEN}✅ Wrangler CLI found${NC}"
echo ""

# Step 1: Generate credentials
echo -e "${YELLOW}Step 1: Generate Secure Credentials${NC}"
echo "---------------------------------------"

AGENT_TOKEN=$(generate_token)
AGENT_SECRET=$(generate_secret)

echo "Generated credentials:"
echo -e "  Token: ${GREEN}${AGENT_TOKEN}${NC}"
echo -e "  Secret: ${GREEN}${AGENT_SECRET}${NC}"
echo ""

# Save to a secure file
echo -e "${YELLOW}Step 2: Save Credentials${NC}"
echo "------------------------"

CREDS_FILE=".agent-credentials.env"
cat > $CREDS_FILE << EOF
# Agent API Credentials - KEEP THIS FILE SECURE!
# Generated on $(date)

AGENT_SERVICE_TOKEN=${AGENT_TOKEN}
AGENT_HMAC_SECRET=${AGENT_SECRET}

# For Anthropic Claude Integration
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# For OpenAI GPT Integration (optional)
OPENAI_API_KEY=your-openai-api-key-here
EOF

echo -e "${GREEN}✅ Credentials saved to ${CREDS_FILE}${NC}"
echo -e "${RED}⚠️  Keep this file secure and never commit it to git!${NC}"
echo ""

# Step 3: Deploy to Cloudflare
echo -e "${YELLOW}Step 3: Deploy to Cloudflare Pages${NC}"
echo "-----------------------------------"

read -p "Do you want to deploy to Cloudflare Pages now? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Deploying to Cloudflare Pages..."
    
    # Build the project
    echo "Building project..."
    npm run build
    
    # Deploy
    echo "Deploying..."
    wrangler pages deploy dist --project-name=agenda-dashboard
    
    echo ""
    echo -e "${YELLOW}Step 4: Set Cloudflare Secrets${NC}"
    echo "-------------------------------"
    echo "Now we need to add the secrets to Cloudflare."
    echo ""
    
    echo "Setting AGENT_SERVICE_TOKEN..."
    echo $AGENT_TOKEN | wrangler pages secret put AGENT_SERVICE_TOKEN --project-name=agenda-dashboard
    
    echo "Setting AGENT_HMAC_SECRET..."
    echo $AGENT_SECRET | wrangler pages secret put AGENT_HMAC_SECRET --project-name=agenda-dashboard
    
    echo ""
    read -p "Do you have an Anthropic API key? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your Anthropic API key: " ANTHROPIC_KEY
        echo $ANTHROPIC_KEY | wrangler pages secret put ANTHROPIC_API_KEY --project-name=agenda-dashboard
        
        # Update the credentials file
        sed -i '' "s/your-anthropic-api-key-here/${ANTHROPIC_KEY}/" $CREDS_FILE
    fi
    
    echo ""
    read -p "Do you have an OpenAI API key? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your OpenAI API key: " OPENAI_KEY
        echo $OPENAI_KEY | wrangler pages secret put OPENAI_API_KEY --project-name=agenda-dashboard
        
        # Update the credentials file
        sed -i '' "s/your-openai-api-key-here/${OPENAI_KEY}/" $CREDS_FILE
    fi
fi

echo ""
echo -e "${YELLOW}Step 5: Configure Your App${NC}"
echo "--------------------------"
echo ""
echo -e "${GREEN}Your Agent API is ready!${NC}"
echo ""
echo "To use it in your app:"
echo "1. Open your Agenda Dashboard"
echo "2. Go to Settings → AI Configuration"
echo "3. Configure AI Provider (Claude or OpenAI) with your API key"
echo "4. Configure Agent API with these credentials:"
echo ""
echo -e "   Token: ${GREEN}${AGENT_TOKEN}${NC}"
echo -e "   Secret: ${GREEN}${AGENT_SECRET}${NC}"
echo ""
echo "5. Test the connection"
echo "6. Start using natural language commands!"
echo ""
echo -e "${BLUE}Example commands you can try:${NC}"
echo "  • 'Schedule a meeting tomorrow at 2pm'"
echo "  • 'Add a task to review documents'"
echo "  • 'Create a note about project ideas'"
echo "  • 'Show me today's agenda'"
echo ""
echo -e "${GREEN}✨ Setup complete!${NC}"
echo ""
echo -e "${YELLOW}Important files created:${NC}"
echo "  • ${CREDS_FILE} - Your credentials (keep secure!)"
echo "  • dist/ - Built application"
echo ""
echo -e "${RED}Security reminder:${NC}"
echo "  • Never share your credentials"
echo "  • Add ${CREDS_FILE} to .gitignore"
echo "  • Rotate tokens regularly"
echo ""
