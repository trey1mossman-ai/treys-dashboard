#!/bin/bash

# Stop n8n and Cloudflare Tunnel

echo "🛑 Stopping n8n and tunnel..."

# Read PIDs if saved
if [ -f /tmp/n8n.pid ]; then
    N8N_PID=$(cat /tmp/n8n.pid)
    kill $N8N_PID 2>/dev/null && echo "✅ Stopped n8n (PID: $N8N_PID)"
    rm /tmp/n8n.pid
else
    # Try to find and kill n8n process
    pkill -f n8n && echo "✅ Stopped n8n"
fi

if [ -f /tmp/tunnel.pid ]; then
    TUNNEL_PID=$(cat /tmp/tunnel.pid)
    kill $TUNNEL_PID 2>/dev/null && echo "✅ Stopped tunnel (PID: $TUNNEL_PID)"
    rm /tmp/tunnel.pid
else
    # Try to find and kill cloudflared process
    pkill -f cloudflared && echo "✅ Stopped tunnel"
fi

# Also try to kill by name as backup
pkill -f n8n 2>/dev/null
pkill -f cloudflared 2>/dev/null
pkill -f ngrok 2>/dev/null

echo "✅ All services stopped"