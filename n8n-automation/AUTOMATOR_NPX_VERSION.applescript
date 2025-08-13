-- WORKING AUTOMATOR SCRIPT - Using npx like Claude Code
-- This matches exactly how your n8n instance was started successfully

on run
    try
        -- Configuration
        set n8nDir to "/Volumes/Trey's Macbook TB/n8n./n8n-mcp"
        set n8nPort to "5678"
        
        -- Check if n8n is already running
        set n8nRunning to do shell script "curl -s http://localhost:" & n8nPort & " >/dev/null 2>&1 && echo 'yes' || echo 'no'"
        
        if n8nRunning is "yes" then
            set userChoice to display dialog "n8n is already running! What would you like to do?" buttons {"Open n8n", "Restart", "Cancel"} default button "Open n8n"
            
            if button returned of userChoice is "Open n8n" then
                open location "http://localhost:" & n8nPort
                return
            else if button returned of userChoice is "Restart" then
                -- Kill existing n8n
                do shell script "pkill -f n8n 2>/dev/null || true"
                do shell script "pkill -f cloudflared 2>/dev/null || true"
                delay 2
            else
                return
            end if
        end if
        
        -- Show notification
        display notification "Starting n8n using npx..." with title "n8n Automation" subtitle "This may take a moment"
        
        -- Start n8n in Terminal using npx (same as Claude Code)
        tell application "Terminal"
            activate
            
            -- Create the command to run
            set startCommand to "echo '🚀 Starting n8n...' && " & ¬
                "echo '================================' && " & ¬
                "echo '' && " & ¬
                "echo 'Using npx to start n8n (like Claude Code does)' && " & ¬
                "echo 'This may download n8n if needed...' && " & ¬
                "echo '' && " & ¬
                "npx --prefix '" & n8nDir & "' n8n & " & ¬
                "N8N_PID=$! && " & ¬
                "echo 'n8n starting with PID: '$N8N_PID && " & ¬
                "echo '' && " & ¬
                "sleep 10 && " & ¬
                "echo '✅ n8n should be running at: http://localhost:5678' && " & ¬
                "echo '' && " & ¬
                "if command -v cloudflared >/dev/null 2>&1; then " & ¬
                "  echo '🌐 Starting Cloudflare Tunnel...' && " & ¬
                "  cloudflared tunnel --url http://localhost:5678 & " & ¬
                "  TUNNEL_PID=$! && " & ¬
                "  echo 'Tunnel PID: '$TUNNEL_PID && " & ¬
                "  sleep 5 && " & ¬
                "  echo '' && " & ¬
                "  echo '================================' && " & ¬
                "  echo '✅ Your public URL is above ☝️' && " & ¬
                "  echo '================================' && " & ¬
                "else " & ¬
                "  echo 'ℹ️  Cloudflare tunnel not installed' && " & ¬
                "  echo 'To enable internet access: brew install cloudflared' && " & ¬
                "fi && " & ¬
                "echo '' && " & ¬
                "echo 'Keep this window open!' && " & ¬
                "wait"
            
            -- Run the command
            do script startCommand
        end tell
        
        -- Wait for n8n to start
        delay 15
        
        -- Open browser
        open location "http://localhost:" & n8nPort
        
        -- Final notification
        display notification "n8n is starting! Check Terminal for status." with title "n8n Ready" sound name "Glass"
        
    on error errMsg
        display alert "Error" message errMsg as critical
    end try
end run