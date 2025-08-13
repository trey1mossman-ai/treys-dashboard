#!/bin/bash

# Test n8n connection from the Agenda app
echo "🧪 Testing n8n Connection for Agenda Dashboard"
echo "=============================================="
echo ""

# Check if n8n is running
echo "1. Checking if n8n is running..."
if curl -s http://localhost:5678 >/dev/null 2>&1; then
    echo "   ✅ n8n is accessible at http://localhost:5678"
else
    echo "   ❌ n8n is not accessible!"
    echo "   Start n8n first with Claude Code or:"
    echo "   cd '/Volumes/Trey's Macbook TB/n8n./n8n-mcp' && npx n8n"
    exit 1
fi
echo ""

# Check for webhooks
echo "2. Testing n8n webhook endpoints..."
echo "   (These will 404 until you create them in n8n)"
echo ""

WEBHOOKS=(
    "email-digest"
    "calendar-summary"
    "status-draft"
    "create-lead"
    "push-agenda"
    "followup"
)

for webhook in "${WEBHOOKS[@]}"; do
    echo -n "   Testing /webhook/n8n/$webhook ... "
    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
        "http://localhost:5678/webhook/n8n/$webhook" \
        -H "Content-Type: application/json" \
        -d '{"test": true}' 2>/dev/null)
    
    if [ "$response" = "404" ]; then
        echo "❌ Not found (need to create in n8n)"
    elif [ "$response" = "200" ] || [ "$response" = "201" ]; then
        echo "✅ Working!"
    else
        echo "⚠️  HTTP $response"
    fi
done

echo ""
echo "3. Creating .env.local for the app..."

# Create .env.local file
cat > "/Volumes/Trey's Macbook TB/Agenda for the day/.env.local" << 'EOF'
# Connect to local n8n instance
VITE_API_BASE_URL=http://localhost:5678/webhook

# Or if you want to use Cloudflare functions that proxy to n8n:
# VITE_API_BASE_URL=http://localhost:8788/api
EOF

echo "   ✅ Created .env.local"
echo ""

echo "4. Next Steps:"
echo "   a) Create webhook workflows in n8n for each endpoint"
echo "   b) Start the app: npm run dev"
echo "   c) The app will connect to n8n at localhost:5678"
echo ""
echo "=============================================="
echo ""
echo "To create a test webhook in n8n:"
echo "1. Open http://localhost:5678"
echo "2. Create new workflow"
echo "3. Add 'Webhook' node"
echo "4. Set path to: n8n/email-digest"
echo "5. Set method to: POST"
echo "6. Add your logic nodes"
echo "7. Save and Activate"
echo ""
echo "Example n8n webhook response node:"
echo "Set 'Respond to Webhook' node with:"
echo '{"emails": [{"from": "test@example.com", "subject": "Test"}]}'