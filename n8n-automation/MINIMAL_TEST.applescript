-- MINIMAL TEST VERSION - Just start n8n, nothing fancy
-- This is the absolute simplest approach

on run
    tell application "Terminal"
        activate
        -- Just run npx n8n exactly like Claude Code
        do script "pkill -f n8n; sleep 2; cd '/Volumes/Trey'\"'\"'s Macbook TB/n8n./n8n-mcp' && npx --prefix '/Volumes/Trey'\"'\"'s Macbook TB/n8n./n8n-mcp' n8n"
    end tell
    
    -- Give it time to start
    delay 15
    
    -- Try to open in default browser
    do shell script "open http://localhost:5678"
end run