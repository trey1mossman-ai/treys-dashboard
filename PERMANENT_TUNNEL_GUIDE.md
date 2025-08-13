# 🚀 Permanent Cloudflare Tunnel Setup Guide

## What's Different: Permanent vs Temporary Tunnels

### Temporary Tunnel (Quick Tunnel)
```bash
cloudflared tunnel --url http://localhost:5678
```
- ❌ URL changes every time
- ❌ Stops when you close Terminal
- ❌ Can't run 24/7
- ✅ Good for testing

### Permanent Tunnel (What you're creating)
```
https://n8n.yourdomain.com
```
- ✅ **Same URL forever**
- ✅ **Can run 24/7**
- ✅ **Survives restarts**
- ✅ **Production ready**

## Step-by-Step Setup

### 1️⃣ Create Tunnel in Cloudflare Dashboard

1. Go to: **Zero Trust** → **Access** → **Tunnels**
2. Click **"Create a tunnel"**
3. **Name**: `n8n-tunnel`
4. Click **"Save tunnel"**

### 2️⃣ Get Your Token

After creating, Cloudflare shows:
```bash
cloudflared service install eyJhIjoiNDNj... (long token)
```

**COPY THIS ENTIRE TOKEN!**

### 3️⃣ Configure Public Hostname

In the tunnel settings:

**Public hostname:**
- Subdomain: `n8n` (or whatever you want)
- Domain: `yourdomain.com`
- Path: (leave empty)

**Service:**
- Type: `HTTP`
- URL: `localhost:5678`

Click **"Save hostname"**

### 4️⃣ Save Your Token Locally

Run this script:
```bash
chmod +x setup-permanent-tunnel.sh
./setup-permanent-tunnel.sh
```

Paste your token when prompted.

## Running Your Tunnel

### Option A: Run Manually (Terminal stays open)
```bash
./run-permanent-tunnel.sh
```
- Runs while Terminal is open
- Stop with Ctrl+C
- Good for testing

### Option B: Run 24/7 as Service (Recommended)
```bash
chmod +x setup-24-7-tunnel.sh
./setup-24-7-tunnel.sh
```
- Runs in background
- Starts automatically on login
- Survives system restarts
- **This is what you want for production!**

## Your URLs After Setup

### Local Access (unchanged):
```
http://localhost:5678
```

### Internet Access (your permanent URL):
```
https://n8n.yourdomain.com
```

### Webhook URLs:
- Local: `http://localhost:5678/webhook-test/agenda-test`
- Internet: `https://n8n.yourdomain.com/webhook-test/agenda-test`

## Managing the 24/7 Service

### Check if running:
```bash
launchctl list | grep cloudflare
```

### View logs:
```bash
tail -f ~/.cloudflared/tunnel.log
```

### Stop service:
```bash
launchctl unload ~/Library/LaunchAgents/com.cloudflare.n8n-tunnel.plist
```

### Start service:
```bash
launchctl load ~/Library/LaunchAgents/com.cloudflare.n8n-tunnel.plist
```

### Remove service completely:
```bash
launchctl unload ~/Library/LaunchAgents/com.cloudflare.n8n-tunnel.plist
rm ~/Library/LaunchAgents/com.cloudflare.n8n-tunnel.plist
```

## Testing Your Permanent Tunnel

Once running, test it:

```bash
# Test from internet
curl https://n8n.yourdomain.com/webhook-test/agenda-test \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## For Your Agenda App

Update your `.env.local`:
```env
# Use your permanent tunnel URL
VITE_API_BASE_URL=https://n8n.yourdomain.com/webhook
```

Or for Cloudflare Workers:
```javascript
// In wrangler.toml or secrets
N8N_BASE_URL = "https://n8n.yourdomain.com"
```

## Troubleshooting

### Tunnel not connecting:
- Check token is correct
- Verify n8n is running on port 5678
- Check firewall settings

### Can't access from internet:
- Verify hostname configuration in Cloudflare
- Check DNS is propagated (can take a few minutes)
- Ensure tunnel is running: `launchctl list | grep cloudflare`

### Service won't start:
- Check logs: `tail -f ~/.cloudflared/tunnel.error.log`
- Verify cloudflared path: `which cloudflared`
- Update path in plist file if needed

## Security Notes

- ✅ Traffic is encrypted via Cloudflare
- ✅ No need to open firewall ports
- ✅ Can add Cloudflare Access policies for authentication
- ⚠️ Anyone with the URL can access (add auth in n8n or Cloudflare)

## Next Steps

1. **Set up the tunnel** using the scripts
2. **Test webhook access** from the internet
3. **Update your app** to use the permanent URL
4. **Deploy to production** knowing your n8n is always accessible!

## Your Tunnel Details

Once set up, save these:
- **Tunnel Name**: n8n-tunnel
- **Public URL**: https://n8n.yourdomain.com
- **Token Location**: ~/.cloudflared/n8n-tunnel-token.txt
- **Service Name**: com.cloudflare.n8n-tunnel

That's it! Your n8n will be accessible 24/7 from anywhere! 🎉