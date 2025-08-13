-- ENHANCED AUTOMATOR SCRIPT - Ensures n8n actually starts
-- This version checks if n8n is installed and running properly

on run
    try
        -- Configuration
        set n8nPort to "5678"
        set projectPath to "/Volumes/Trey's Macbook TB/Agenda for the day/n8n-automation"
        
        -- First, check if n8n is installed
        set n8nInstalled to do shell script "command -v n8n >/dev/null 2>&1 && echo 'yes' || echo 'no'"
        
        if n8nInstalled is "no" then
            display dialog "n8n is not installed. Would you like to install it now?" buttons {"Cancel", "Install"} default button "Install"
            
            if button returned of result is "Install" then
                -- Install n8n
                tell application "Terminal"
                    activate
                    do script "npm install -g n8n && echo 'Installation complete. Please run the app again.' && read -p 'Press Enter to close...'"
                end tell
                return
            else
                return
            end if
        end if
        
        -- Check if cloudflared is installed
        set cloudflaredInstalled to do shell script "command -v cloudflared >/dev/null 2>&1 && echo 'yes' || echo 'no'"
        
        if cloudflaredInstalled is "no" then
            display dialog "Cloudflare tunnel (cloudflared) is not installed. Please install it first:" & return & return & "brew install cloudflared" buttons {"OK"} default button "OK"
            return
        end if
        
        -- Check if n8n is already running
        set n8nRunning to do shell script "curl -s http://localhost:" & n8nPort & " >/dev/null 2>&1 && echo 'yes' || echo 'no'"
        
        if n8nRunning is "yes" then
            set userChoice to display dialog "n8n appears to be already running. What would you like to do?" buttons {"Open n8n", "Restart Everything", "Cancel"} default button "Open n8n"
            
            if button returned of userChoice is "Open n8n" then
                tell application "Safari"
                    open location "http://localhost:" & n8nPort
                    activate
                end tell
                return
            else if button returned of userChoice is "Restart Everything" then
                -- Stop existing processes
                do shell script "pkill -f 'n8n start' || true"
                do shell script "pkill -f cloudflared || true"
                delay 2
            else
                return
            end if
        end if
        
        -- Make scripts executable (in case they're not)
        do shell script "chmod +x '" & projectPath & "'/*.sh"
        
        -- Show starting notification
        display notification "Starting n8n server and tunnel..." with title "n8n Automation" subtitle "This may take a moment..."
        
        -- Start the enhanced script in Terminal
        tell application "Terminal"
            activate
            
            -- Create new window or tab
            if not (exists window 1) then
                do script ""
            end if
            
            -- Run the enhanced startup script
            set startScript to "cd '" & projectPath & "' && ./start-n8n-enhanced.sh"
            set newTab to do script startScript
            
            -- Set window title
            do script "printf '\\033]0;n8n Server & Tunnel\\007'" in newTab
        end tell
        
        -- Wait a bit longer for n8n to start
        delay 8
        
        -- Check if n8n actually started
        set maxAttempts to 15
        set attemptCount to 0
        set n8nStarted to false
        
        repeat maxAttempts times
            set attemptCount to attemptCount + 1
            try
                do shell script "curl -s http://localhost:" & n8nPort & " >/dev/null 2>&1"
                set n8nStarted to true
                exit repeat
            on error
                if attemptCount is maxAttempts then
                    display alert "n8n Failed to Start" message "n8n server didn't start properly. Check the Terminal window for errors." as critical
                    
                    -- Show Terminal to see what went wrong
                    tell application "Terminal"
                        activate
                    end tell
                    return
                end if
                delay 2
            end try
        end repeat
        
        if n8nStarted then
            -- Open n8n in browser
            tell application "Safari"
                if not (exists window 1) then
                    make new document
                end if
                
                open location "http://localhost:" & n8nPort
                activate
            end tell
            
            -- Success notification
            display notification "n8n is running! Check Terminal for your public URL." with title "n8n Ready" subtitle "✅ Server started successfully" sound name "Glass"
            
            -- Bring Terminal forward briefly to show the URL
            tell application "Terminal"
                activate
            end tell
            delay 2
            
            -- Then bring Safari back
            tell application "Safari"
                activate
            end tell
        end if
        
    on error errMsg
        display alert "Error Starting n8n" message errMsg as critical
    end try
end run