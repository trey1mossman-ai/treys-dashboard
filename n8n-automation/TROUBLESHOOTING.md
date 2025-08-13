# 🔧 n8n Troubleshooting Guide

## Problem: n8n starts but Chrome can't access localhost:5678

## Quick Tests to Run:

### 1. First, check if n8n is actually running:
```bash
cd "/Volumes/Trey's Macbook TB/Agenda for the day/n8n-automation"
chmod +x *.sh
./test-access.sh
```

### 2. Try the complete diagnostic:
```bash
./complete-diagnostic.sh
```

This will:
- Clean up any existing processes
- Check all dependencies
- Start n8n with detailed output
- Test multiple URLs
- Try different browsers

### 3. If n8n is running but Chrome won't load:

#### Test in Terminal:
```bash
curl http://localhost:5678
```

If this returns HTML, n8n IS working - it's a browser issue.

#### Try different URLs in Chrome:
- http://localhost:5678
- http://127.0.0.1:5678
- http://0.0.0.0:5678
- http://[::1]:5678

#### Try Safari:
```bash
open -a Safari http://localhost:5678
```

#### Check Chrome settings:
1. **Clear cache**: Chrome → Settings → Privacy → Clear browsing data
2. **Disable extensions**: Try in Incognito mode (Cmd+Shift+N)
3. **Check proxy**: Chrome → Settings → Advanced → System → Open proxy settings
   - Make sure "Bypass proxy for" includes: localhost, 127.0.0.1
4. **Reset Chrome flags**: Go to chrome://flags → Reset all

### 4. Common Issues & Fixes:

#### Issue: "This site can't be reached"
**Fix:**
```bash
# Check if something else is using port 5678
lsof -i :5678

# Kill it if needed
kill -9 [PID]

# Restart n8n
./exact-claude-method.sh
```

#### Issue: n8n starts but immediately stops
**Fix:**
```bash
# Check for errors in n8n data
rm -rf ~/.n8n/crash.journal
rm -rf ~/.n8n/.lock

# Try again
./complete-diagnostic.sh
```

#### Issue: Permission errors
**Fix:**
```bash
# Fix permissions
chmod 600 ~/.n8n/config 2>/dev/null || true
chmod 700 ~/.n8n 2>/dev/null || true
```

### 5. Nuclear Option - Fresh Start:
```bash
# Stop everything
pkill -f n8n
pkill -f node

# Clear n8n data (WARNING: This deletes workflows!)
# mv ~/.n8n ~/.n8n.backup

# Start fresh
cd "/Volumes/Trey's Macbook TB/n8n./n8n-mcp"
npx n8n
```

### 6. Alternative Access Methods:

#### Use a different port:
```bash
N8N_PORT=8080 npx --prefix "/Volumes/Trey's Macbook TB/n8n./n8n-mcp" n8n
# Then access: http://localhost:8080
```

#### Use SSH tunnel (if remote):
```bash
ssh -L 5678:localhost:5678 your-machine
```

### 7. Check System Issues:

#### Firewall:
```bash
# Check if firewall is blocking
sudo pfctl -s info

# Temporarily disable (macOS):
sudo pfctl -d
# Test n8n
# Re-enable:
sudo pfctl -e
```

#### DNS issues:
```bash
# Add to /etc/hosts if needed
echo "127.0.0.1 localhost" | sudo tee -a /etc/hosts
```

### 8. Browser-Specific Fixes:

#### Chrome:
1. Go to: chrome://net-internals/#sockets
2. Click "Flush socket pools"
3. Go to: chrome://net-internals/#dns
4. Click "Clear host cache"

#### Force IPv4:
```bash
# Start n8n with IPv4 only
N8N_HOST=127.0.0.1 npx --prefix "/Volumes/Trey's Macbook TB/n8n./n8n-mcp" n8n
```

## If All Else Fails:

1. **Try Firefox**: `brew install firefox && open -a Firefox http://localhost:5678`
2. **Use a web proxy**: `ngrok http 5678` (requires ngrok)
3. **Check Activity Monitor**: Look for node/n8n processes using high CPU
4. **Check Console app**: Look for crash logs related to node or n8n
5. **Restart your Mac**: Sometimes it's the simplest solution

## The Automator Fix:

If the manual methods work but Automator doesn't, update your Automator app with the MINIMAL_TEST.applescript version - it's the simplest approach.

## Still Not Working?

Run this and share the output:
```bash
./complete-diagnostic.sh 2>&1 | tee n8n-debug.log
```

The log file will help identify the exact issue.