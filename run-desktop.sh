#!/bin/bash

echo "🖥️ Launching Agenda Dashboard Desktop App..."

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust is required for the desktop app."
    echo "Please install Rust manually from: https://rustup.rs"
    echo "Then run this script again."
    exit 1
fi

# Check if Tauri app exists
if [ ! -f "tauri/tauri.conf.json" ]; then
    echo "❌ Tauri configuration not found"
    echo "The desktop app components may not be properly configured."
    exit 1
fi

# Build the frontend first if needed
if [ ! -d "dist" ]; then
    echo "🔨 Building frontend..."
    npm run build
fi

# Start backend first
echo "🔧 Starting backend services..."
npx wrangler pages dev dist --local --persist-to=.wrangler/state --port 8788 --compatibility-date=2024-01-01 &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 3

# Launch desktop app
echo "🚀 Launching desktop app..."
npm run tauri:dev

# Cleanup
kill $BACKEND_PID 2>/dev/null