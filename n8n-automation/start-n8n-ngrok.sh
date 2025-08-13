#!/bin/bash

# N8N with ngrok tunnel (alternative to Cloudflare)
# Requires ngrok account (free tier available)

echo "🚀 Starting n8n with ngrok tunnel..."

# Configuration
N8N_PORT=5678
NGROK_REGION=us  # Change to your preferred region: us, eu, ap, au

# Check if ngrok is configured
if [ ! -f ~/.ngrok2/ngrok.yml ]; then
    echo "⚠️  ngrok not configured!"
    echo "Please run: ngrok config add-authtoken YOUR_AUTH_TOKEN"
    echo "Get your free token at: https://dashboard.ngrok.com/get-started/your-authtoken"
    exit 1
fi

# Start n8n
echo "📦 Starting n8n..."
N8N_PROTOCOL=https \
N8N_HOST=localhost \
N8N_PORT=$N8N_PORT \
n8n start &
N8N_PID=$!
echo "✅ n8n started with PID: $N8N_PID"

# Wait for n8n to be ready
sleep 5

# Start ngrok
echo "🌐 Starting ngrok tunnel..."
ngrok http $N8N_PORT --region=$NGROK_REGION &
NGROK_PID=$!
echo "✅ ngrok started with PID: $NGROK_PID"

sleep 3

# Get ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | grep -o 'https://.*')

echo ""
echo "========================================="
echo "🎉 n8n is accessible at:"
echo "$NGROK_URL"
echo ""
echo "Use this URL in your Cloudflare Workers!"
echo "========================================="
echo ""

# Save PIDs
echo "$N8N_PID" > /tmp/n8n.pid
echo "$NGROK_PID" > /tmp/ngrok.pid

# Keep running
wait $N8N_PID