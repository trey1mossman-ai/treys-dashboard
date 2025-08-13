-- FINAL WORKING VERSION FOR AUTOMATOR
-- This ensures n8n starts and shows clear feedback

on run
    -- Step 1: Kill any existing n8n first
    do shell script "pkill -f 'n8n start' 2>/dev/null || true"
    do shell script "pkill -f cloudflared 2>/dev/null || true"
    delay 2
    
    -- Step 2: Open Terminal and start everything
    tell application "Terminal"
        activate
        
        -- Run commands in sequence
        set commands to "cd '/Volumes/Trey'\"'\"'s Macbook TB/Agenda for the day/n8n-automation' && " & ¬
            "echo '🚀 Starting n8n Server...' && " & ¬
            "echo '================================' && " & ¬
            "echo '' && " & ¬
            "n8n start & " & ¬
            "N8N_PID=$! && " & ¬
            "echo 'n8n starting with PID: '$N8N_PID && " & ¬
            "sleep 5 && " & ¬
            "echo '' && " & ¬
            "echo '🌐 Starting Cloudflare Tunnel...' && " & ¬
            "cloudflared tunnel --url http://localhost:5678 & " & ¬
            "TUNNEL_PID=$! && " & ¬
            "echo 'Tunnel starting with PID: '$TUNNEL_PID && " & ¬
            "sleep 5 && " & ¬
            "echo '' && " & ¬
            "echo '================================' && " & ¬
            "echo '✅ READY! Your public URL is above ☝️' && " & ¬
            "echo '================================' && " & ¬
            "echo '' && " & ¬
            "echo 'Keep this window open!' && " & ¬
            "wait"
        
        do script commands
    end tell
    
    -- Step 3: Wait then open browser
    delay 8
    open location "http://localhost:5678"
    
    -- Step 4: Show notification
    display notification "n8n is starting! Check Terminal for your public URL." with title "n8n Automation" sound name "Glass"
end run