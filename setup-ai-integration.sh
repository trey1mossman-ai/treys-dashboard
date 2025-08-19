#!/bin/bash

# Setup AI Integration for Agenda Dashboard
echo "🚀 Setting up AI Integration for Agenda Dashboard"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}Creating .env.local file...${NC}"
    cp .env.example .env.local
fi

# Function to generate random token
generate_token() {
    openssl rand -hex 32
}

echo ""
echo "📋 Step 1: Generate Security Tokens"
echo "-----------------------------------"
AGENT_TOKEN=$(generate_token)
AGENT_SECRET=$(generate_token)

echo "AGENT_SERVICE_TOKEN=$AGENT_TOKEN"
echo "AGENT_HMAC_SECRET=$AGENT_SECRET"
echo ""
echo -e "${GREEN}✅ Tokens generated!${NC}"
echo ""

# Create setup instructions file
cat > AI_SETUP_INSTRUCTIONS.md << 'EOL'
# 🤖 AI Integration Setup Instructions

## Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

#### For Local Development (.env.local)
```env
VITE_API_BASE_URL=http://localhost:3000/api

# Add these for local testing (DO NOT commit)
VITE_AGENT_SERVICE_TOKEN=your_generated_token
VITE_AGENT_HMAC_SECRET=your_generated_secret
```

#### For Production (Cloudflare Pages)
Add these in Cloudflare Dashboard → Your Project → Settings → Environment Variables:

```env
AGENT_SERVICE_TOKEN=your_generated_token
AGENT_HMAC_SECRET=your_generated_secret
OPENAI_API_KEY=your_openai_key
# OR
ANTHROPIC_API_KEY=your_anthropic_key
```

### 3. Configure AI in the App

1. Start the development server:
```bash
npm run dev
```

2. Open http://localhost:5173
3. Go to Settings → AI Configuration
4. Enter your API credentials:
   - Choose OpenAI or Claude
   - Add your API key
   - Add Agent tokens (or generate for testing)
5. Click "Test Connection"
6. Save configuration

## 🎯 Testing the Integration

### Test Natural Language Commands
Open the Assistant (bottom-right chat icon) and try:
- "Schedule a meeting tomorrow at 2pm"
- "Add a task to review documents"
- "Create a note about project ideas"
- "Show me today's agenda"
- "Mark the first task as complete"

### Test Direct API Calls
```bash
# Generate test signature
BODY='{"tool":"agenda.listByDate","args":{"date":"2025-01-15"}}'
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "your_secret" -binary | xxd -p -c256)

# Make test request
curl -X POST http://localhost:3000/api/agent/command \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -H "X-TS: $(date +%s)" \
  -H "X-Signature: sha256=$SIGNATURE" \
  -d "$BODY"
```

## 🔧 Troubleshooting

### Assistant not responding?
1. Check browser console for errors
2. Verify credentials in Settings
3. Test API connection with the test button

### API calls failing?
1. Check Cloudflare deployment logs
2. Verify environment variables are set
3. Check network tab for detailed errors

### Database not persisting?
1. Run migrations: `npx wrangler d1 migrations apply agenda-db`
2. Check D1 database in Cloudflare dashboard
3. Verify database binding in wrangler.toml

## 📚 Available AI Commands

The assistant understands natural language for:

### Agenda Management
- "Schedule [event] at [time]"
- "Add meeting with [person] tomorrow at [time]"
- "Block 2 hours for deep work this afternoon"
- "Show me today's schedule"
- "What's next on my agenda?"

### Task Management
- "Add task: [description]"
- "Create todo to [action]"
- "Mark [task] as complete"
- "Show me pending tasks"
- "Reorder tasks by priority"

### Note Taking
- "Create note: [content]"
- "Add idea about [topic]"
- "Archive old notes"
- "Show recent notes"

### Quick Actions
- "Run [action name]"
- "Execute webhook for [purpose]"
- "Create automation for [task]"

### Analysis
- "Analyze my productivity today"
- "Show completion rate this week"
- "What did I accomplish today?"
- "Generate daily summary"

## 🚀 Next Steps

1. **Connect Calendar**: Set up Google Calendar sync in n8n
2. **Enable Notifications**: Configure push notifications
3. **Add Voice Input**: Integrate speech-to-text
4. **Train Custom Model**: Fine-tune for your specific workflow
5. **Set Up Analytics**: Track usage patterns

## 🔐 Security Notes

- Never commit API keys to git
- Rotate tokens monthly
- Use environment variables for all secrets
- Enable CORS only for your domain
- Monitor audit logs regularly

## 📞 Need Help?

- Check `/migrations/agent_control.sql` for database schema
- Review `/functions/cloudflare/api/agent/handlers.ts` for available tools
- Test with `/agent-client/test-suite.sh`
- View logs in Cloudflare dashboard

---
Generated: $(date)
EOL

echo -e "${GREEN}✅ Setup instructions created in AI_SETUP_INSTRUCTIONS.md${NC}"
echo ""

# Check for required files
echo "📋 Step 2: Checking Required Files"
echo "-----------------------------------"

required_files=(
    "src/services/agentBridge.ts"
    "src/services/aiService.ts"
    "src/features/assistant/AssistantDock.tsx"
    "functions/cloudflare/api/agent/command.ts"
    "functions/cloudflare/api/agent/handlers.ts"
    "migrations/agent_control.sql"
)

all_files_present=true
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file"
        all_files_present=false
    fi
done

echo ""
if [ "$all_files_present" = true ]; then
    echo -e "${GREEN}✅ All required files present!${NC}"
else
    echo -e "${YELLOW}⚠️  Some files are missing. Run 'npm install' and check your setup.${NC}"
fi

# Create test script
cat > test-ai-integration.sh << 'EOL'
#!/bin/bash

echo "🧪 Testing AI Integration"
echo "========================"

# Test health endpoint
echo "Testing API health..."
curl -s http://localhost:3000/api/health | jq '.'

# Test with mock credentials
echo ""
echo "Testing agent command (will fail without proper tokens)..."
BODY='{"tool":"agenda.listByDate","args":{"date":"2025-01-15"}}'
curl -X POST http://localhost:3000/api/agent/command \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -H "X-TS: $(date +%s)" \
  -H "X-Signature: sha256=test" \
  -d "$BODY" | jq '.'

echo ""
echo "To test with real tokens:"
echo "1. Add tokens to .env.local"
echo "2. Restart the dev server"
echo "3. Configure in Settings UI"
echo "4. Use the Assistant chat"
EOL

chmod +x test-ai-integration.sh

echo ""
echo "📋 Step 3: Database Setup"
echo "------------------------"

# Check if wrangler.toml exists
if [ -f "wrangler.toml" ]; then
    echo "Found wrangler.toml"
    echo "Run these commands to set up the database:"
    echo ""
    echo "  npx wrangler d1 create agenda-db"
    echo "  npx wrangler d1 migrations apply agenda-db"
    echo ""
else
    echo -e "${YELLOW}wrangler.toml not found. Create it for Cloudflare deployment.${NC}"
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Add the generated tokens to Cloudflare Pages environment"
echo "2. Get your AI API key (OpenAI or Anthropic)"
echo "3. Run: npm run dev"
echo "4. Configure credentials in Settings"
echo "5. Test with the Assistant chat"
echo ""
echo "Generated Tokens (save these!):"
echo "--------------------------------"
echo "AGENT_SERVICE_TOKEN=$AGENT_TOKEN"
echo "AGENT_HMAC_SECRET=$AGENT_SECRET"
echo ""
echo -e "${GREEN}Ready to go! Check AI_SETUP_INSTRUCTIONS.md for detailed instructions.${NC}"
