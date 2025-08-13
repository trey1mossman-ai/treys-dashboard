# n8n Automation Setup for Agenda Dashboard

This folder contains scripts to automatically start n8n with internet accessibility for your Agenda Dashboard app.

## 🚀 Quick Start (One-Click Solution)

### Option 1: Menu Bar App (Recommended for Mac)

1. **Install dependencies:**
   ```bash
   # Install Cloudflare Tunnel
   brew install cloudflared
   
   # Install n8n globally
   npm install -g n8n
   ```

2. **Create a clickable Mac app:**
   - Open **Automator** (in Applications)
   - Choose "Application"
   - Add "Run AppleScript" action
   - Copy the contents of `Start n8n.applescript`
   - Save as "Start n8n" in your Applications folder
   - Now you have a clickable app!

3. **Double-click the app** to start everything

### Option 2: Terminal Commands

```bash
# Make scripts executable
chmod +x *.sh

# Start n8n with tunnel (choose one):
./start-n8n-tunnel.sh      # Uses Cloudflare (free, no account needed)
./start-n8n-ngrok.sh        # Uses ngrok (requires free account)
./start-n8n-advanced.sh    # Sets up permanent URL (recommended for production)

# Stop everything
./stop-n8n-tunnel.sh
```

## 📱 Setting Up for Your Agenda App

### Temporary URL (Quick Testing)
1. Run `./start-n8n-tunnel.sh`
2. Copy the URL shown (like `https://abc-xyz.trycloudflare.com`)
3. This URL changes each time you restart

### Permanent URL (Production)
1. Run `./start-n8n-advanced.sh`
2. Follow the prompts to set up a permanent subdomain
3. You'll get a consistent URL like `n8n.yourdomain.com`

## 🔄 n8n Workflow Setup

### Required Webhooks
Create these webhooks in your n8n instance:

1. **Email Sender** (`/webhook/email-send`)
2. **SMS Sender** (`/webhook/sms-send`)  
3. **WhatsApp Sender** (`/webhook/whatsapp-send`)
4. **AI Agent** (`/webhook/ai-agent`)

### Security Token
Generate a secure token:
```bash
openssl rand -hex 32
```

Add this token to:
- n8n webhook nodes (Header Auth)
- Cloudflare Workers secrets

## 🌐 Cloudflare Workers Configuration

After starting n8n with a tunnel, update your Cloudflare Workers:

```javascript
// In your wrangler.toml or environment
N8N_BASE_URL = "https://your-tunnel-url.trycloudflare.com"
N8N_WEBHOOK_TOKEN = "your-secure-token"
```

## 🖥️ Desktop Shortcut (Mac)

Create a desktop shortcut:
1. Open Script Editor
2. Paste:
   ```applescript
   do shell script "cd '/Volumes/Trey\\'s Macbook TB/Agenda for the day/n8n-automation' && ./start-n8n-tunnel.sh"
   ```
3. Save as Application on Desktop

## 🔧 Troubleshooting

### n8n won't start
- Check if port 5678 is in use: `lsof -i :5678`
- Kill existing process: `pkill -f n8n`

### Tunnel won't connect
- Check internet connection
- Ensure cloudflared is installed: `brew install cloudflared`
- Try the alternative ngrok method

### Can't access from Cloudflare Workers
- Ensure tunnel URL is correct in Workers environment
- Check webhook token matches
- Verify n8n workflows are active

## 📊 System Integration

### LaunchAgent (Auto-start on Mac boot)
Create `~/Library/LaunchAgents/com.agenda.n8n.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.agenda.n8n</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Volumes/Trey's Macbook TB/Agenda for the day/n8n-automation/start-n8n-tunnel.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

Load it:
```bash
launchctl load ~/Library/LaunchAgents/com.agenda.n8n.plist
```

## 🔐 Security Notes

1. **Never commit tokens** to git
2. **Use webhook authentication** in n8n
3. **Restrict tunnel access** if needed (Cloudflare Access)
4. **Rotate tokens** regularly

## 📚 Resources

- [n8n Documentation](https://docs.n8n.io)
- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps)
- [ngrok Documentation](https://ngrok.com/docs)

## Need Help?

Check the logs:
- n8n logs: Check Terminal output
- Tunnel status: `cloudflared tunnel list`
- Process status: `ps aux | grep n8n`