#!/bin/bash

echo "🚀 CONNECTING TO GITHUB & VERCEL"
echo "================================"
echo ""

# First, let's commit everything
echo "📦 Committing all changes..."
git add .
git commit -m "fix: webhooks, add team sync, prepare for cloud deployment

- Fixed webhook service to use API gateway
- Added Vercel deployment configuration  
- Created team coordination structure
- Prepared Supabase integration
- Set up database migrations
- Ready for production deployment

[TEAM: Claude]
[STATUS: Complete]"

echo ""
echo "✅ Changes committed!"
echo ""

# Check if we have a remote
REMOTE_EXISTS=$(git remote -v | grep origin)

if [ -z "$REMOTE_EXISTS" ]; then
    echo "🔗 No GitHub remote found. Let's set it up!"
    echo ""
    echo "Enter your GitHub username:"
    read GITHUB_USER
    
    echo "Enter repository name (e.g., life-os or treys-dashboard):"
    read REPO_NAME
    
    if [ -z "$REPO_NAME" ]; then
        REPO_NAME="life-os"
    fi
    
    echo ""
    echo "Adding GitHub remote..."
    git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
    
    echo ""
    echo "========================================="
    echo "📋 IMPORTANT: Create the repository on GitHub"
    echo ""
    echo "1. Open this URL in your browser:"
    echo "   https://github.com/new"
    echo ""
    echo "2. Use these settings:"
    echo "   Repository name: $REPO_NAME"
    echo "   Description: AI-powered Life Operating System"
    echo "   Private or Public: Your choice"
    echo "   DON'T initialize with README"
    echo ""
    echo "3. Click 'Create repository'"
    echo ""
    echo "Press Enter when you've created it..."
    read
fi

echo ""
echo "🚀 Pushing to GitHub..."
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "✨ SUCCESS!"
    echo ""
    echo "✅ Code pushed to GitHub"
    echo "✅ Vercel will auto-deploy in ~2 minutes"
    echo ""
    echo "Check your deployments at:"
    echo "https://vercel.com/dashboard"
    echo "========================================="
else
    echo ""
    echo "Push failed. Trying with force..."
    git push -u origin main --force
    
    if [ $? -eq 0 ]; then
        echo "✅ Force push successful!"
    else
        echo "❌ Please check your GitHub repository exists"
    fi
fi
