#!/bin/bash

# Cloudflare Secrets Setup Script
# This script helps you configure all required secrets for the AI integration

echo "🔐 Cloudflare AI Integration - Secrets Setup"
echo "==========================================="
echo ""
echo "This script will help you add all required secrets to Cloudflare."
echo "Your secrets will be encrypted and stored securely."
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to add a secret
add_secret() {
    local SECRET_NAME=$1
    local DESCRIPTION=$2
    local REQUIRED=$3
    local EXAMPLE=$4
    
    if [ "$REQUIRED" == "true" ]; then
        echo -e "\n${RED}[REQUIRED]${NC} ${YELLOW}$SECRET_NAME${NC}"
    else
        echo -e "\n${BLUE}[OPTIONAL]${NC} ${YELLOW}$SECRET_NAME${NC}"
    fi
    
    echo "Description: $DESCRIPTION"
    if [ ! -z "$EXAMPLE" ]; then
        echo "Example: $EXAMPLE"
    fi
    
    echo -n "Enter value (or press Enter to skip): "
    read -s SECRET_VALUE
    echo ""
    
    if [ ! -z "$SECRET_VALUE" ]; then
        echo "$SECRET_VALUE" | wrangler secret put "$SECRET_NAME" --name agenda-dashboard
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ $SECRET_NAME configured successfully${NC}"
        else
            echo -e "${RED}❌ Failed to set $SECRET_NAME${NC}"
        fi
    else
        if [ "$REQUIRED" == "true" ]; then
            echo -e "${RED}⚠️  Skipped required secret $SECRET_NAME${NC}"
        else
            echo -e "${YELLOW}⏭️  Skipped optional secret $SECRET_NAME${NC}"
        fi
    fi
}

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}Error: wrangler CLI not found${NC}"
    echo "Install it with: npm install -g wrangler"
    exit 1
fi

# Verify we're in the right directory
if [ ! -f "wrangler.toml" ]; then
    echo -e "${RED}Error: wrangler.toml not found${NC}"
    echo "Please run this script from your project root"
    exit 1
fi

echo -e "${YELLOW}Starting secret configuration...${NC}"
echo "==========================================="

# Core AI Provider Secrets
echo -e "\n${GREEN}=== AI Provider Configuration ===${NC}"

add_secret "OPENAI_API_KEY" \
    "OpenAI API key for GPT models" \
    "true" \
    "sk-proj-..."

add_secret "ANTHROPIC_API_KEY" \
    "Anthropic API key for Claude models" \
    "false" \
    "sk-ant-api03-..."

# Communication Secrets (for tools)
echo -e "\n${GREEN}=== Communication Services (for AI tools) ===${NC}"

add_secret "SENDGRID_API_KEY" \
    "SendGrid API key for sending emails" \
    "false" \
    "SG...."

add_secret "TWILIO_ACCOUNT_SID" \
    "Twilio Account SID for SMS/WhatsApp" \
    "false" \
    "AC..."

add_secret "TWILIO_AUTH_TOKEN" \
    "Twilio Auth Token" \
    "false" \
    "..."

add_secret "TWILIO_PHONE_NUMBER" \
    "Twilio phone number for sending SMS" \
    "false" \
    "+1234567890"

add_secret "DEFAULT_FROM_EMAIL" \
    "Default email address for sending emails" \
    "false" \
    "noreply@yourdomain.com"

# n8n Integration
echo -e "\n${GREEN}=== n8n Workflow Integration ===${NC}"

add_secret "N8N_BASE_URL" \
    "n8n webhook base URL" \
    "false" \
    "https://your-n8n-instance.com"

add_secret "N8N_API_KEY" \
    "n8n API key for webhook authentication" \
    "false" \
    "..."

# Optional RAG/Vector DB
echo -e "\n${GREEN}=== RAG/Knowledge Base (Optional) ===${NC}"

add_secret "PINECONE_API_KEY" \
    "Pinecone API key (if using Pinecone for RAG)" \
    "false" \
    "..."

add_secret "PINECONE_ENV" \
    "Pinecone environment" \
    "false" \
    "us-east-1-aws"

# Summary
echo ""
echo "==========================================="
echo -e "${GREEN}Secret configuration complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test your configuration:"
echo "   curl https://your-app.pages.dev/api/ai/health"
echo ""
echo "2. Run diagnostic tests:"
echo "   ./test-ai-integration.sh"
echo ""
echo "3. View your secrets (names only):"
echo "   wrangler secret list --name agenda-dashboard"
echo ""
echo "4. Update a secret:"
echo "   wrangler secret put SECRET_NAME --name agenda-dashboard"
echo ""
echo "5. Deploy your changes:"
echo "   npm run build && wrangler pages deploy dist"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "• Debug Guide: AI_DEBUG_GUIDE.md"
echo "• Integration Docs: AI_INTEGRATION_README.md"