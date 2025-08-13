#!/usr/bin/osascript

# macOS Automation App - Save as "Start n8n.app" using Automator
# This creates a clickable app in your Applications folder

on run
    set projectPath to "/Volumes/Trey's Macbook TB/Agenda for the day"
    
    -- Show notification
    display notification "Starting n8n with internet tunnel..." with title "n8n Automation"
    
    -- Open Terminal and run the script
    tell application "Terminal"
        activate
        set newWindow to do script "cd '" & projectPath & "/n8n-automation' && ./start-n8n-tunnel.sh"
        
        -- Keep Terminal window open
        delay 2
        
        -- Optional: Minimize Terminal after startup
        -- set miniaturized of window 1 to true
    end tell
    
    -- Wait a moment for services to start
    delay 5
    
    -- Open n8n in browser
    tell application "Safari"
        open location "http://localhost:5678"
    end tell
    
    display notification "n8n is ready! Check Terminal for the public URL." with title "n8n Automation" sound name "Glass"
end run