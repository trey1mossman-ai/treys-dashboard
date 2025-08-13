#!/bin/bash

# Setup Agenda Dashboard to work with n8n
echo "🔗 Connecting Agenda Dashboard to n8n"
echo "======================================"
echo ""

APP_DIR="/Volumes/Trey's Macbook TB/Agenda for the day"
N8N_URL="http://localhost:5678"

# Step 1: Check n8n
echo "Step 1: Checking n8n status..."
if curl -s "$N8N_URL" >/dev/null 2>&1; then
    echo "✅ n8n is running at $N8N_URL"
else
    echo "❌ n8n is not running!"
    echo ""
    echo "Start n8n with Claude Code or run:"
    echo "cd '/Volumes/Trey's Macbook TB/n8n./n8n-mcp' && npx n8n"
    echo ""
    read -p "Press Enter after starting n8n to continue..."
    
    if ! curl -s "$N8N_URL" >/dev/null 2>&1; then
        echo "Still can't connect to n8n. Exiting."
        exit 1
    fi
fi
echo ""

# Step 2: Create .env.local
echo "Step 2: Configuring app to use n8n..."
cd "$APP_DIR"

cat > .env.local << EOF
# Connect directly to n8n webhooks
VITE_API_BASE_URL=$N8N_URL/webhook

# If using mock Cloudflare functions locally:
# VITE_API_BASE_URL=http://localhost:8788/api
EOF

echo "✅ Created .env.local"
echo ""

# Step 3: Install dependencies
echo "Step 3: Installing app dependencies..."
if [ -f "package.json" ]; then
    npm install
    echo "✅ Dependencies installed"
else
    echo "❌ package.json not found!"
fi
echo ""

# Step 4: Instructions for n8n setup
echo "Step 4: n8n Webhook Setup Instructions"
echo "---------------------------------------"
echo ""
echo "1. Open n8n at: $N8N_URL"
echo ""
echo "2. Import the example workflow:"
echo "   - Click 'Add workflow' → 'Import from File'"
echo "   - Select: $APP_DIR/n8n-workflows/email-digest-webhook.json"
echo "   - Save and Activate the workflow"
echo ""
echo "3. Or create webhooks manually:"
echo "   For each endpoint the app needs:"
echo "   • /webhook/n8n/email-digest"
echo "   • /webhook/n8n/calendar-summary"
echo "   • /webhook/n8n/status-draft"
echo "   • /webhook/n8n/create-lead"
echo "   • /webhook/n8n/push-agenda"
echo "   • /webhook/n8n/followup"
echo ""
echo "   Steps for each:"
echo "   a) Create new workflow"
echo "   b) Add 'Webhook' node"
echo "   c) Set HTTP Method: POST"
echo "   d) Set Path: n8n/[endpoint-name]"
echo "   e) Add your automation logic"
echo "   f) Add 'Respond to Webhook' node"
echo "   g) Save and Activate"
echo ""

# Step 5: Start the app
echo "Step 5: Starting the Agenda Dashboard..."
echo ""
echo "Run in a new terminal:"
echo "cd '$APP_DIR' && npm run dev"
echo ""
echo "The app will be at: http://localhost:5173"
echo ""

# Step 6: Test endpoints
echo "Step 6: Quick Test"
echo "------------------"
echo ""
echo "Testing a webhook (will fail if not created in n8n):"
curl -X POST "$N8N_URL/webhook/n8n/email-digest" \
  -H "Content-Type: application/json" \
  -d '{"limit": 5}' \
  -w "\nHTTP Status: %{http_code}\n" 2>/dev/null

echo ""
echo "======================================"
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Create webhooks in n8n (see Step 4)"
echo "2. Start the app: npm run dev"
echo "3. Open http://localhost:5173"
echo ""
echo "The app will now connect to your local n8n!"