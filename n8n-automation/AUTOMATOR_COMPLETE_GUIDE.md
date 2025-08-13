# Complete Automator Setup Guide for n8n

## 🎯 Option 1: Simple Desktop App

### Steps:
1. Open **Automator**
2. Choose **"Application"**
3. Search for **"Run Shell Script"** in the actions
4. Drag it to the workflow area
5. **Important Settings:**
   - Shell: `/bin/bash`
   - Pass input: `as arguments`
6. **Paste this code:**

```bash
cd "/Volumes/Trey's Macbook TB/Agenda for the day/n8n-automation"
osascript -e 'tell app "Terminal" to do script "cd \"/Volumes/Trey'"'"'s Macbook TB/Agenda for the day/n8n-automation\" && ./start-n8n-tunnel.sh"'
sleep 3
open "http://localhost:5678"
```

7. Save as: **"Start n8n"** to your Desktop or Applications

---

## 🚀 Option 2: Advanced App with Error Handling

### Steps:
1. Open **Automator**
2. Choose **"Application"**
3. Search for **"Run AppleScript"**
4. Drag it to the workflow area
5. **Copy the entire contents** of `automator-applescript-advanced.txt`
6. Save as: **"n8n Manager"** to Applications

### Features:
- ✅ Checks if n8n is already running
- ✅ Option to restart or just open
- ✅ Error handling
- ✅ Notifications
- ✅ Auto-minimizes Terminal

---

## 🎛️ Option 3: Menu Bar Quick Action

### Create a Service for Right-Click Menu:
1. Open **Automator**
2. Choose **"Quick Action"** (or "Service" on older macOS)
3. Configure at the top:
   - Workflow receives: `no input`
   - in: `any application`
4. Add **"Run Shell Script"** action
5. Paste the shell script code
6. Save as: **"Start n8n Tunnel"**

Now you can:
- Right-click anywhere → Services → Start n8n Tunnel
- Or access from menu bar → Application Name → Services

---

## 🗂️ Option 4: Dock Stack with Multiple Actions

### Create Multiple Mini Apps:
1. Create folder: `~/Applications/n8n Tools/`
2. Create these Automator apps:
   - **Start n8n.app** - Starts everything
   - **Stop n8n.app** - Stops everything
   - **Test Webhooks.app** - Tests connections
   - **Open n8n.app** - Just opens browser

### Stop n8n App Code:
```bash
cd "/Volumes/Trey's Macbook TB/Agenda for the day/n8n-automation"
./stop-n8n-tunnel.sh
osascript -e 'display notification "n8n stopped" with title "n8n Automation"'
```

### Test Webhooks App Code:
```bash
cd "/Volumes/Trey's Macbook TB/Agenda for the day/n8n-automation"
osascript -e 'tell app "Terminal" to do script "cd \"/Volumes/Trey'"'"'s Macbook TB/Agenda for the day/n8n-automation\" && ./test-webhooks.sh"'
```

3. Drag the folder to your Dock (right side, near Trash)
4. Right-click → View as "Fan" or "Grid"
5. Now you have a dropdown menu of n8n tools!

---

## 🎨 Customizing Your App

### Add Custom Icon:
1. Find a nice n8n icon (or any image)
2. Open the image in Preview
3. Select all (Cmd+A) and Copy (Cmd+C)
4. Right-click your Automator app → Get Info
5. Click the icon in the top-left
6. Paste (Cmd+V)

### Recommended Icons:
- n8n logo: Download from n8n.io
- Or use SF Symbols (built-in Mac icons)
- Or create one at icons8.com

### Add to Dock:
1. Drag your app to the Dock
2. Right-click → Options → Keep in Dock

---

## 📍 Option 5: Spotlight Launch

After creating your app:
1. Name it uniquely like "n8n Starter"
2. Now just press `Cmd+Space`
3. Type "n8n" and hit Enter
4. Instant launch!

---

## ⚡ Power User: Keyboard Shortcut

### Assign Global Hotkey:
1. Open **System Settings** → **Keyboard** → **Shortcuts**
2. Click **App Shortcuts** → **+**
3. Application: Your Automator app
4. Add shortcut like `Cmd+Shift+N`

### Or use Shortcuts app (newer method):
1. Open **Shortcuts** app
2. Click **+** to create new shortcut
3. Add action: "Run Shell Script"
4. Paste your script
5. Click settings icon → Add Keyboard Shortcut
6. Set to something like `Cmd+Shift+N`

---

## 🔄 Auto-Start on Login

### Make n8n start when Mac boots:
1. Open **System Settings** → **General** → **Login Items**
2. Click **+** under "Open at Login"
3. Select your Automator app
4. Enable "Hide" if you don't want to see it

---

## 📱 iPhone/iPad Shortcut

### Control from iOS using Shortcuts:
1. On Mac: System Settings → Sharing → Remote Login (enable)
2. On iPhone: Open Shortcuts app
3. Create shortcut with "Run Script Over SSH"
4. Server: Your Mac's IP
5. Script: `/path/to/start-n8n-tunnel.sh`
6. Add to Home Screen

---

## 🛠️ Troubleshooting

### "Operation not permitted" error:
- System Settings → Privacy & Security → Automation
- Allow Automator to control Terminal

### Terminal doesn't open:
- First run: Terminal may ask for permission
- Grant access when prompted

### Can't save to Applications:
- Save to Desktop first
- Then drag to Applications

### Script not executable:
Run this once in Terminal:
```bash
chmod +x "/Volumes/Trey's Macbook TB/Agenda for the day/n8n-automation/"*.sh
```

---

## 💡 Pro Tips

1. **Test First**: Run the shell script manually in Terminal before Automator
2. **View Logs**: Add "View Results" action in Automator for debugging
3. **Multiple Versions**: Create different apps for different tunnels (Cloudflare vs ngrok)
4. **Status Check**: Create another app that just checks if n8n is running
5. **URL Display**: Modify script to copy tunnel URL to clipboard automatically

---

## 🎯 Recommended Setup

For your use case, I recommend:
1. Create the **Advanced App** (Option 2)
2. Add custom n8n icon
3. Place in Dock
4. Set up Spotlight launch
5. Optionally add keyboard shortcut

This gives you maximum flexibility with one-click access!