-- n8n Automator with Safari (Avoids Chrome localhost issues)
on run
    -- Start n8n in Terminal
    tell application "Terminal"
        activate
        do script "echo 'Starting n8n...' && " & ¬
            "cd '/Volumes/Trey'\"'\"'s Macbook TB/n8n.' && " & ¬
            "npx --prefix '/Volumes/Trey'\"'\"'s Macbook TB/n8n./n8n-mcp' n8n"
    end tell
    
    -- Wait for n8n to start
    delay 15
    
    -- Open in Safari (more reliable with localhost)
    tell application "Safari"
        activate
        open location "http://localhost:5678"
    end tell
    
    -- Notification
    display notification "n8n opened in Safari" with title "n8n Ready"
end run