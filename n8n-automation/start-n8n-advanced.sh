#!/bin/bash

# Advanced n8n launcher with persistent URL using Cloudflare Tunnel
# This creates a permanent subdomain for your n8n instance

echo "🚀 Advanced n8n Setup with Persistent URL"

# Configuration
N8N_PORT=5678
N8N_DATA_PATH="$HOME/.n8n"
TUNNEL_CONFIG="$HOME/.cloudflared"

# Create n8n data directory if it doesn't exist
mkdir -p "$N8N_DATA_PATH"

# Function to setup persistent Cloudflare tunnel
setup_persistent_tunnel() {
    echo "📝 Setting up persistent Cloudflare tunnel..."
    echo ""
    echo "This will create a permanent URL for your n8n instance."
    echo "You'll need to:"
    echo "1. Login to Cloudflare"
    echo "2. Create a tunnel"
    echo "3. Get a permanent subdomain"
    echo ""
    
    # Login to Cloudflare
    cloudflared tunnel login
    
    # Create a named tunnel
    read -p "Enter a name for your tunnel (e.g., n8n-agenda): " TUNNEL_NAME
    cloudflared tunnel create $TUNNEL_NAME
    
    # Get tunnel ID
    TUNNEL_ID=$(cloudflared tunnel list | grep $TUNNEL_NAME | awk '{print $1}')
    
    # Create config file
    cat > "$TUNNEL_CONFIG/config.yml" << EOF
url: http://localhost:$N8N_PORT
tunnel: $TUNNEL_ID
credentials-file: $TUNNEL_CONFIG/$TUNNEL_ID.json
EOF
    
    echo "✅ Tunnel created! Your tunnel ID is: $TUNNEL_ID"
    echo ""
    echo "Now, go to Cloudflare Dashboard > Zero Trust > Access > Tunnels"
    echo "You'll see your tunnel there. Add a public hostname:"
    echo "Example: n8n.yourdomain.com"
    echo ""
    read -p "Press Enter after you've added the hostname..."
    
    # Save the hostname
    read -p "Enter the hostname you configured (e.g., n8n.yourdomain.com): " N8N_HOSTNAME
    echo "export N8N_WEBHOOK_BASE_URL=https://$N8N_HOSTNAME" >> "$HOME/.n8n_env"
    
    echo "✅ Setup complete! Your n8n will be available at: https://$N8N_HOSTNAME"
}

# Check if persistent tunnel is configured
if [ ! -f "$TUNNEL_CONFIG/config.yml" ]; then
    echo "No persistent tunnel found."
    read -p "Would you like to set up a persistent tunnel? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_persistent_tunnel
    fi
fi

# Load environment if exists
if [ -f "$HOME/.n8n_env" ]; then
    source "$HOME/.n8n_env"
fi

# Start n8n with proper configuration
echo "📦 Starting n8n..."
N8N_PROTOCOL=https \
N8N_HOST=0.0.0.0 \
N8N_PORT=$N8N_PORT \
N8N_WEBHOOK_BASE_URL=${N8N_WEBHOOK_BASE_URL:-https://localhost:$N8N_PORT} \
N8N_EDITOR_BASE_URL=${N8N_WEBHOOK_BASE_URL:-https://localhost:$N8N_PORT} \
N8N_DATA_FOLDER="$N8N_DATA_PATH" \
n8n start &
N8N_PID=$!

echo "✅ n8n started with PID: $N8N_PID"

# Start Cloudflare tunnel
if [ -f "$TUNNEL_CONFIG/config.yml" ]; then
    echo "🌐 Starting Cloudflare tunnel with persistent configuration..."
    cloudflared tunnel run &
    TUNNEL_PID=$!
    echo "✅ Tunnel started with PID: $TUNNEL_PID"
    echo ""
    echo "========================================="
    echo "🎉 n8n is available at: $N8N_WEBHOOK_BASE_URL"
    echo "========================================="
else
    echo "🌐 Starting temporary Cloudflare tunnel..."
    cloudflared tunnel --url http://localhost:$N8N_PORT &
    TUNNEL_PID=$!
    echo "✅ Temporary tunnel started"
    echo "⚠️  The URL will change each time. Check output above for URL."
fi

# Save PIDs
echo "$N8N_PID" > /tmp/n8n.pid
echo "$TUNNEL_PID" > /tmp/tunnel.pid

# Open n8n in browser
sleep 3
open "http://localhost:$N8N_PORT"

# Keep running
echo ""
echo "Press Ctrl+C to stop all services"
wait $N8N_PID