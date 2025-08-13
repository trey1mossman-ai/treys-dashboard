-- WORKING AUTOMATOR - Exact Claude Code Method with Browser Fix
-- This uses the EXACT same command as Claude Code

on run
    -- Start n8n exactly like Claude Code
    tell application "Terminal"
        activate
        
        -- Kill any existing and start fresh
        do script "pkill -f n8n 2>/dev/null; sleep 2; " & ¬
            "chmod 600 ~/.n8n/config 2>/dev/null; " & ¬
            "cd '/Volumes/Trey'\"'\"'s Macbook TB/n8n.' && " & ¬
            "npx --prefix '/Volumes/Trey'\"'\"'s Macbook TB/n8n./n8n-mcp' n8n"
    end tell
    
    -- Wait for n8n to start (matching Claude Code timing)
    delay 20
    
    -- Try multiple ways to open it
    try
        -- Try IPv4 first
        do shell script "open 'http://127.0.0.1:5678'"
    end try
    
    delay 2
    
    try
        -- Try localhost
        do shell script "open 'http://localhost:5678'"
    end try
    
    delay 2
    
    try
        -- Try Safari as backup
        tell application "Safari"
            open location "http://localhost:5678"
        end tell
    end try
    
    -- Show notification
    display notification "n8n started! Try http://127.0.0.1:5678 if browser doesn't open" with title "n8n Ready"
end run