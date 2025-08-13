# 🎯 UPDATED: n8n Automator Setup Using NPX

## What Changed?
Your n8n instance runs from `/Volumes/Trey's Macbook TB/n8n./n8n-mcp` using `npx` instead of a global installation. This is exactly how Claude Code started it successfully.

## Quick Setup (30 seconds)

### Step 1: Open Automator
- Press `Cmd + Space`
- Type "Automator" → Enter

### Step 2: Create Application
- Click "New Document"
- Select "Application"
- Click "Choose"

### Step 3: Add AppleScript
- Search for "applescript"
- Double-click "Run AppleScript"

### Step 4: Choose Your Version

#### Option A: Simple (Just n8n)
```applescript
on run
    do shell script "pkill -f n8n 2>/dev/null || true"
    delay 1
    tell application "Terminal"
        activate
        do script "cd '/Volumes/Trey'\"'\"'s Macbook TB/n8n./n8n-mcp' && npx n8n"
    end tell
    delay 10
    open location "http://localhost:5678"
    display notification "n8n is starting at localhost:5678" with title "n8n Started"
end run
```

#### Option B: With Internet Access (n8n + Tunnel)
```applescript
on run
    do shell script "pkill -f n8n 2>/dev/null || true"
    do shell script "pkill -f cloudflared 2>/dev/null || true"
    delay 2
    
    tell application "Terminal"
        activate
        do script "echo '🚀 Starting n8n with internet access...' && " & ¬
            "echo '' && " & ¬
            "cd '/Volumes/Trey'\"'\"'s Macbook TB/n8n./n8n-mcp' && " & ¬
            "npx n8n & " & ¬
            "sleep 10 && " & ¬
            "echo '' && " & ¬
            "echo '🌐 Starting tunnel...' && " & ¬
            "cloudflared tunnel --url http://localhost:5678 & " & ¬
            "sleep 5 && " & ¬
            "echo '' && " & ¬
            "echo '✅ READY! Your public URL is above ☝️' && " & ¬
            "echo 'Keep this window open!' && " & ¬
            "wait"
    end tell
    
    delay 12
    open location "http://localhost:5678"
    display notification "Check Terminal for your public URL!" with title "n8n + Tunnel Ready"
end run
```

### Step 5: Save Your App
- Press `Cmd + S`
- Name: "Start n8n"
- Location: Desktop or Applications
- Click "Save"

## ✅ Done!
Double-click your new "Start n8n" app to run everything!

## What Happens:
1. **Kills any existing n8n** (prevents conflicts)
2. **Opens Terminal** and starts n8n using npx
3. **Starts Cloudflare tunnel** (if you chose Option B)
4. **Opens browser** at localhost:5678
5. **Shows notification** when ready

## The Key Difference:
Instead of `n8n start`, we use:
```bash
cd '/Volumes/Trey's Macbook TB/n8n./n8n-mcp' && npx n8n
```

This matches exactly how Claude Code successfully started your instance.

## Troubleshooting:

**Terminal asks for permission:**
- System Settings → Privacy & Security → Automation
- Allow Automator to control Terminal

**Cloudflare tunnel not working:**
```bash
brew install cloudflared
```

**Want to stop n8n:**
- Press `Ctrl+C` in Terminal
- Or close Terminal window

## Advanced Scripts Available:
- `AUTOMATOR_NPX_VERSION.applescript` - Full featured with error checking
- `start-n8n-npx.sh` - Bash script version
- `NPX_WITH_TUNNEL.applescript` - Includes tunnel setup

## Your n8n Locations:
- Main n8n-mcp: `/Volumes/Trey's Macbook TB/n8n./n8n-mcp`
- n8n data: `~/.n8n/`
- Port: 5678

That's it! Your Automator app now uses the same method as Claude Code! 🎉