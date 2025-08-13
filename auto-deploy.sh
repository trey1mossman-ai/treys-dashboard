#!/bin/bash

echo "🔄 Auto-deployment system for Agenda App"
echo "==========================================="
echo ""

# Function to deploy
deploy() {
    echo "$(date): 🚀 Starting deployment..."
    
    # Build the application
    npm run build
    
    if [ $? -eq 0 ]; then
        echo "$(date): ✅ Build successful! App is ready in 'dist' folder"
        
        # If you're using a specific deployment service, add the command here
        # For example:
        # netlify deploy --prod --dir=dist
        # vercel --prod
        # surge dist
        
        echo "$(date): 📦 Deployment complete!"
    else
        echo "$(date): ❌ Build failed. Check errors above."
    fi
    echo ""
}

# Initial deployment
deploy

# Watch for changes in src folder
echo "👀 Watching for changes in src folder..."
echo "Press Ctrl+C to stop"
echo ""

# Use fswatch if available, otherwise fall back to a simple loop
if command -v fswatch &> /dev/null; then
    fswatch -o src/ | while read f; do
        echo "$(date): 📝 Changes detected..."
        deploy
    done
else
    echo "ℹ️  Install fswatch for better file watching: brew install fswatch"
    echo "Using basic file watching instead..."
    
    while true; do
        # Check if src folder has been modified in the last 60 seconds
        if find src -type f -mmin -1 | grep -q .; then
            echo "$(date): 📝 Changes detected..."
            deploy
            sleep 60  # Wait before checking again to avoid multiple builds
        fi
        sleep 5
    done
fi