# ✅ CORRECTED: n8n Webhook URLs & Tunnel Verification

## The Correct URL Structure

### For Test Webhooks (during development):
```
http://localhost:5678/webhook-test/agenda-test
```
⚠️ Note: Test webhooks use `/webhook-test/` NOT `/webhook/`

### For Production Webhooks (when workflow is published):
```
http://localhost:5678/webhook/agenda-test
```

## Test Your Setup Now

I've opened a **new test page** in Chrome with the correct URL. 

### Step 1: Test Local Connection
Click **"🧪 Test Local Webhook"** button in the Chrome page

You should see a success response if:
- n8n is running ✅
- The workflow is ACTIVATED ✅
- The URL is correct (`/webhook-test/`) ✅

## Verify Cloudflare Tunnel (Internet Access)

### Check if Tunnel is Running:
```bash
chmod +x check-tunnel.sh
./check-tunnel.sh
```

### Start a Tunnel (if not running):
```bash
chmod +x start-tunnel.sh
./start-tunnel.sh
```

This will show you a URL like:
```
https://abc-xyz-123.trycloudflare.com
```

### Test Internet Access:
1. Copy your tunnel URL from Terminal
2. Paste it in the test page's tunnel URL field
3. Click **"🚀 Test via Tunnel"**

## How the Tunnel Works:

```
Internet Request
    ↓
https://your-tunnel.trycloudflare.com/webhook-test/agenda-test
    ↓
Cloudflare Network
    ↓
Your Mac (via cloudflared)
    ↓
http://localhost:5678/webhook-test/agenda-test
    ↓
Your n8n Webhook
```

## Quick Commands:

```bash
# Make scripts executable
chmod +x *.sh

# Test local webhook with correct URL
./test-correct-webhook.sh

# Check tunnel status
./check-tunnel.sh

# Start tunnel (if needed)
./start-tunnel.sh
```

## Troubleshooting:

### Webhook returns 404:
- Make sure workflow is ACTIVATED in n8n
- Check webhook path is exactly "agenda-test"
- For test webhooks use `/webhook-test/` not `/webhook/`

### Tunnel not working:
- Install cloudflared: `brew install cloudflared`
- Start tunnel: `cloudflared tunnel --url http://localhost:5678`
- Copy the URL shown in Terminal
- Test with: `curl https://your-tunnel.trycloudflare.com/webhook-test/agenda-test`

## Success Indicators:

✅ **Local test works** = n8n webhook is configured correctly
✅ **Tunnel test works** = Your n8n is accessible from the internet
✅ **Both work** = Ready for production deployment!

The test page in Chrome has all the tools you need to verify everything is working!