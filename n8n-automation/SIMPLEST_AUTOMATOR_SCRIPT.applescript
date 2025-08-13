-- SIMPLEST VERSION - Just copy and paste this into Automator!
-- No configuration needed, just works

on run
    -- Start n8n with tunnel
    tell application "Terminal"
        activate
        do script "cd '/Volumes/Trey'\"'\"'s Macbook TB/Agenda for the day/n8n-automation' && ./start-n8n-tunnel.sh"
    end tell
    
    -- Wait and open browser
    delay 5
    open location "http://localhost:5678"
    
    -- Show notification
    display notification "Check Terminal for your public URL!" with title "n8n Started"
end run