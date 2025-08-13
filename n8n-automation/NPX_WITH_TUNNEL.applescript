-- NPX + CLOUDFLARE TUNNEL VERSION
-- This starts n8n with npx AND creates a tunnel for internet access

on run
    -- Kill any existing processes
    do shell script "pkill -f n8n 2>/dev/null || true"
    do shell script "pkill -f cloudflared 2>/dev/null || true"
    delay 2
    
    -- Start everything in Terminal
    tell application "Terminal"
        activate
        
        -- Run n8n with npx and tunnel
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
    
    -- Wait then open browser
    delay 12
    open location "http://localhost:5678"
    
    -- Notification
    display notification "Check Terminal for your public URL!" with title "n8n + Tunnel Ready"
end run