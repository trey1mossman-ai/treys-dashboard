# 🚀 QUICK START: Create n8n Automator App in 60 Seconds

## The Simplest Method (5 Steps)

### Step 1: Open Automator
- Press `Cmd + Space`
- Type "Automator"
- Press Enter

### Step 2: Create New Application
- Click "New Document"
- Select "Application" 📦
- Click "Choose"

### Step 3: Add AppleScript Action
- In the search box, type: **applescript**
- Double-click: **"Run AppleScript"**

### Step 4: Copy & Paste Code
Delete the default text and paste this EXACTLY:

```applescript
on run
    tell application "Terminal"
        activate
        do script "cd '/Volumes/Trey'\"'\"'s Macbook TB/Agenda for the day/n8n-automation' && ./start-n8n-tunnel.sh"
    end tell
    delay 5
    open location "http://localhost:5678"
    display notification "Check Terminal for your public URL!" with title "n8n Started"
end run
```

### Step 5: Save Your App
- Press `Cmd + S`
- Name: **Start n8n**
- Where: **Desktop** (or Applications)
- Click "Save"

## ✅ DONE! 

**Double-click your new "Start n8n" app on the Desktop to run everything!**

---

## What Happens When You Click:
1. ✨ Terminal opens and starts n8n
2. 🌐 Creates secure internet tunnel  
3. 🔗 Shows you the public URL in Terminal
4. 🌏 Opens n8n in your browser
5. 📱 Shows notification when ready

---

## First Time Setup (One Time Only):

Before using the app, run this ONCE in Terminal:
```bash
cd "/Volumes/Trey's Macbook TB/Agenda for the day/n8n-automation"
chmod +x *.sh
```

Also install requirements if you haven't:
```bash
# Install n8n
npm install -g n8n

# Install Cloudflare tunnel
brew install cloudflared
```

---

## 🎨 Optional: Add Custom Icon

1. Download n8n logo from: https://n8n.io/press/
2. Open the PNG in Preview
3. Select all (Cmd+A) → Copy (Cmd+C)
4. Right-click your "Start n8n" app → Get Info
5. Click the icon (top-left) → Paste (Cmd+V)

---

## 🚨 Troubleshooting

**"Terminal cannot be opened" error:**
- System Settings → Privacy & Security → Automation
- Allow Automator to control Terminal ✅

**Scripts not running:**
- Make sure you ran the chmod command above
- Check that n8n is installed: `which n8n`

**Want to stop n8n:**
- Press `Ctrl+C` in the Terminal window
- Or close the Terminal window

---

## 💡 Pro Version

Want more features? Use the advanced script instead:
- Check if n8n already running
- Restart option
- Better error handling
- Auto-minimize Terminal

Find it in: `automator-applescript-advanced.txt`

---

## 📱 Add to Dock

Drag your "Start n8n" app to the Dock for even quicker access!

That's it! You now have a one-click n8n starter! 🎉