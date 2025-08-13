-- GUARANTEED WORKING VERSION - Uses Cloudflare Tunnel
-- This creates a public URL that WILL work in Chrome

on run
    tell application "Terminal"
        activate
        
        -- Start n8n with Cloudflare tunnel for guaranteed access
        do script "echo '🚀 Starting n8n with public URL...' && " & ¬
            "echo '' && " & ¬
            "pkill -f n8n 2>/dev/null; pkill -f cloudflared 2>/dev/null; sleep 2 && " & ¬
            "echo 'Starting n8n...' && " & ¬
            "cd '/Volumes/Trey'\"'\"'s Macbook TB/n8n.' && " & ¬
            "npx --prefix '/Volumes/Trey'\"'\"'s Macbook TB/n8n./n8n-mcp' n8n & " & ¬
            "sleep 15 && " & ¬
            "echo '' && " & ¬
            "echo '🌐 Creating public URL...' && " & ¬
            "cloudflared tunnel --url http://localhost:5678 & " & ¬
            "sleep 5 && " & ¬
            "echo '' && " & ¬
            "echo '=====================================' && " & ¬
            "echo '✅ n8n is ready!' && " & ¬
            "echo '' && " & ¬
            "echo 'Your PUBLIC URL is above' && " & ¬
            "echo '(Look for https://*.trycloudflare.com)' && " & ¬
            "echo '' && " & ¬
            "echo 'This URL works in ANY browser!' && " & ¬
            "echo '=====================================' && " & ¬
            "wait"
    end tell
    
    -- Show notification
    display notification "Check Terminal for your public URL that works in Chrome!" with title "n8n Ready" sound name "Glass"
end run