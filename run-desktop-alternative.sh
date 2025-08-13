#!/bin/bash

echo "🖥️ Launching Agenda Dashboard Desktop Mode..."
echo ""
echo "Since Rust is not installed, we'll open the app in a dedicated browser window."
echo ""

# Make sure the web app is running
if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "📱 Starting the web app first..."
    ./fix-and-run.sh &
    sleep 5
fi

# Open in app mode (Chrome/Edge) or new window (Safari)
echo "🚀 Opening desktop-like experience..."

# Try Chrome first
if command -v "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" &> /dev/null; then
    echo "Using Chrome in app mode..."
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
        --app="http://localhost:5173" \
        --window-size=1200,800 \
        --window-position=center \
        --user-data-dir="/tmp/agenda-dashboard-chrome" \
        2>/dev/null &
    
elif command -v "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" &> /dev/null; then
    echo "Using Edge in app mode..."
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
        --app="http://localhost:5173" \
        --window-size=1200,800 \
        --window-position=center \
        --user-data-dir="/tmp/agenda-dashboard-edge" \
        2>/dev/null &
        
else
    echo "Using default browser..."
    open http://localhost:5173
fi

echo ""
echo "✅ Desktop mode launched!"
echo ""
echo "💡 For a full native desktop app, install Rust from https://rustup.rs"
echo "   Then run: ./run-desktop.sh"