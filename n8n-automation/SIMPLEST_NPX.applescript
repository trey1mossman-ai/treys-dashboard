-- SIMPLEST NPX VERSION - Copy this into Automator!
-- This uses npx just like Claude Code does

on run
    -- Kill any existing n8n
    do shell script "pkill -f n8n 2>/dev/null || true"
    delay 1
    
    -- Start n8n using npx in Terminal
    tell application "Terminal"
        activate
        do script "cd '/Volumes/Trey'\"'\"'s Macbook TB/n8n./n8n-mcp' && npx n8n"
    end tell
    
    -- Wait and open browser
    delay 10
    open location "http://localhost:5678"
    
    -- Notification
    display notification "n8n is starting at localhost:5678" with title "n8n Started"
end run