# 🎯 Quick Reference: Your Permanent Tunnel Setup

## What You're Creating
A permanent URL like: **`https://n8n.yourdomain.com`**
- Never changes ✅
- Runs 24/7 ✅  
- Survives restarts ✅

## Quick Setup Steps

### 1. In Cloudflare Dashboard
```
Zero Trust → Access → Tunnels → Create tunnel
Name: n8n-tunnel
```

### 2. Configure Route
```
Subdomain: n8n
Domain: yourdomain.com
Service: HTTP → localhost:5678
```

### 3. Copy Token
Get the long token from the install command

### 4. Run Setup Script
```bash
./setup-permanent-tunnel.sh
# Paste token when asked
```

### 5. Make it 24/7
```bash
./setup-24-7-tunnel.sh
```

## Your URLs

**n8n Interface:**
- Local: `http://localhost:5678`
- Internet: `https://n8n.yourdomain.com`

**Webhook:**
- Local: `http://localhost:5678/webhook-test/agenda-test`
- Internet: `https://n8n.yourdomain.com/webhook-test/agenda-test`

## Test It
```bash
./test-permanent-tunnel.sh
```

## Manage Service
```bash
# Check status
launchctl list | grep cloudflare

# View logs
tail -f ~/.cloudflared/tunnel.log

# Stop
launchctl unload ~/Library/LaunchAgents/com.cloudflare.n8n-tunnel.plist

# Start
launchctl load ~/Library/LaunchAgents/com.cloudflare.n8n-tunnel.plist
```

That's it! Your n8n is now accessible 24/7 from anywhere! 🚀