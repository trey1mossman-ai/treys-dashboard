#!/bin/bash

echo "🔄 Updating Agenda App to Use Your Permanent Tunnel"
echo "==================================================="
echo ""

# Get the tunnel URL
echo "Enter your tunnel domain (e.g., n8n.yourdomain.com):"
read -r DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ Domain required!"
    exit 1
fi

# Add https if not present
if [[ ! $DOMAIN == https://* ]]; then
    DOMAIN="https://$DOMAIN"
fi

echo ""
echo "Updating app configuration..."
echo ""

# Update .env.local
cat > .env.local << EOF
# Your permanent n8n tunnel URL
VITE_API_BASE_URL=$DOMAIN/webhook

# For local development (optional)
# VITE_API_BASE_URL=http://localhost:5678/webhook
EOF

echo "✅ Updated .env.local with your tunnel URL"
echo ""

# Update Cloudflare function environment example
cat > cloudflare-env-example.txt << EOF
# Add these to your Cloudflare Workers environment variables:
N8N_BASE_URL=$DOMAIN
N8N_WEBHOOK_TOKEN=your-optional-token-here

# In Cloudflare Dashboard:
# 1. Go to Workers & Pages
# 2. Select your app
# 3. Settings → Variables
# 4. Add these variables
EOF

echo "✅ Created cloudflare-env-example.txt"
echo ""

# Create a test file
cat > test-app-connection.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Test App → n8n Connection</title>
    <style>
        body { font-family: system-ui; max-width: 800px; margin: 50px auto; padding: 20px; }
        button { background: #667eea; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
        button:hover { background: #5a67d8; }
        .success { color: green; }
        .error { color: red; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>Test Agenda App → n8n Connection</h1>
    <p>Your tunnel URL: <strong id="tunnelUrl"></strong></p>
    
    <button onclick="testConnection()">Test n8n Connection</button>
    <button onclick="testEmailDigest()">Test Email Digest</button>
    
    <div id="result"></div>
    
    <script>
        const params = new URLSearchParams(window.location.search);
        const tunnelUrl = params.get('url') || prompt('Enter your tunnel URL (e.g., https://n8n.yourdomain.com):');
        document.getElementById('tunnelUrl').textContent = tunnelUrl;
        
        async function testConnection() {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '<p>Testing...</p>';
            
            try {
                const response = await fetch(`${tunnelUrl}/webhook-test/agenda-test`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ test: true, from: 'agenda-app' })
                });
                
                const data = await response.json();
                resultDiv.innerHTML = `<p class="success">✅ Connection successful!</p><pre>${JSON.stringify(data, null, 2)}</pre>`;
            } catch (error) {
                resultDiv.innerHTML = `<p class="error">❌ Error: ${error.message}</p>`;
            }
        }
        
        async function testEmailDigest() {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '<p>Testing email digest...</p>';
            
            try {
                const response = await fetch(`${tunnelUrl}/webhook/n8n/email-digest`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ limit: 5 })
                });
                
                if (response.status === 404) {
                    resultDiv.innerHTML = '<p class="error">❌ Email digest webhook not found. Create it in n8n first.</p>';
                } else {
                    const data = await response.json();
                    resultDiv.innerHTML = `<p class="success">✅ Email digest endpoint ready!</p><pre>${JSON.stringify(data, null, 2)}</pre>`;
                }
            } catch (error) {
                resultDiv.innerHTML = `<p class="error">❌ Error: ${error.message}</p>`;
            }
        }
    </script>
</body>
</html>
EOF

echo "✅ Created test-app-connection.html"
echo ""

echo "======================================"
echo "✅ App configuration updated!"
echo ""
echo "Next steps:"
echo ""
echo "1. Start your Agenda app:"
echo "   npm run dev"
echo ""
echo "2. Test the connection:"
echo "   Open test-app-connection.html in your browser"
echo ""
echo "3. The app will now use your permanent n8n URL!"
echo ""
echo "Your permanent webhook URLs:"
echo "- Test: $DOMAIN/webhook-test/agenda-test"
echo "- Production: $DOMAIN/webhook/n8n/[endpoint-name]"