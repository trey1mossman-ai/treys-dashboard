#!/bin/bash

echo "🚀 GITHUB + VERCEL + SUPABASE INTEGRATION"
echo "=========================================="
echo ""

# Check if we're in a git repo
if [ ! -d ".git" ]; then
    echo "❌ No git repository found. Initializing..."
    git init
fi

# Check current remotes
echo "📍 Checking current Git remotes..."
REMOTES=$(git remote -v)

if [ -z "$REMOTES" ]; then
    echo "   No remotes configured yet."
    echo ""
    
    # Get GitHub username
    echo "📝 Setting up GitHub repository..."
    echo ""
    echo "What's your GitHub username?"
    read -p "GitHub username: " GITHUB_USERNAME
    
    if [ -z "$GITHUB_USERNAME" ]; then
        echo "❌ GitHub username is required!"
        exit 1
    fi
    
    echo ""
    echo "What should we name the repository?"
    echo "(Suggested: life-os or treys-dashboard)"
    read -p "Repository name: " REPO_NAME
    
    if [ -z "$REPO_NAME" ]; then
        REPO_NAME="life-os"
        echo "Using default: $REPO_NAME"
    fi
    
    echo ""
    echo "Make the repository private? (y/n)"
    read -p "Private [y/n]: " IS_PRIVATE
    
    VISIBILITY="public"
    if [ "$IS_PRIVATE" = "y" ] || [ "$IS_PRIVATE" = "Y" ]; then
        VISIBILITY="private"
    fi
    
    echo ""
    echo "📦 Creating GitHub repository..."
    echo "   Name: $REPO_NAME"
    echo "   Visibility: $VISIBILITY"
    echo "   Owner: $GITHUB_USERNAME"
    echo ""
    
    # Create repo using GitHub CLI if available
    if command -v gh &> /dev/null; then
        echo "Using GitHub CLI to create repository..."
        gh repo create "$REPO_NAME" --$VISIBILITY --source=. --remote=origin --push
        echo "✅ Repository created and code pushed!"
    else
        echo "GitHub CLI not found. Setting up remote manually..."
        echo ""
        echo "👉 Please create a new repository on GitHub:"
        echo "   1. Go to: https://github.com/new"
        echo "   2. Repository name: $REPO_NAME"
        echo "   3. Set as $VISIBILITY"
        echo "   4. DON'T initialize with README/license/gitignore"
        echo "   5. Click 'Create repository'"
        echo ""
        echo "Then come back here and press Enter to continue..."
        read
        
        # Add remote
        echo "Adding GitHub remote..."
        git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
        echo "✅ Remote added!"
    fi
else
    echo "✅ Git remotes already configured:"
    echo "$REMOTES"
fi

echo ""
echo "📋 Current Git status:"
git status --short

echo ""
echo "🔄 Preparing to push to GitHub..."

# Make sure we have commits
COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo "0")
if [ "$COMMIT_COUNT" = "0" ]; then
    echo "No commits yet. Creating initial commit..."
    git add .
    git commit -m "Initial commit: Life OS with working webhooks and team sync"
fi

# Set the branch name
git branch -M main

echo ""
echo "🚀 Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ SUCCESS! Your code is on GitHub!"
    echo ""
    
    # Get the remote URL
    REMOTE_URL=$(git remote get-url origin)
    
    # Convert to HTTPS URL if it's a git URL
    if [[ $REMOTE_URL == git@github.com:* ]]; then
        REMOTE_URL="https://github.com/${REMOTE_URL#git@github.com:}"
        REMOTE_URL="${REMOTE_URL%.git}"
    else
        REMOTE_URL="${REMOTE_URL%.git}"
    fi
    
    echo "📍 Repository URL: $REMOTE_URL"
    echo ""
    echo "🔗 VERCEL INTEGRATION:"
    echo "   Since Vercel is connected to your GitHub,"
    echo "   it should automatically detect this push!"
    echo ""
    echo "   Check your Vercel dashboard:"
    echo "   https://vercel.com/dashboard"
    echo ""
    echo "🔑 SUPABASE INTEGRATION:"
    echo "   Supabase doesn't need GitHub."
    echo "   Just add your credentials to:"
    echo "   1. .env.local (for local dev)"
    echo "   2. Vercel Dashboard (for production)"
    echo ""
    echo "📊 NEXT STEPS:"
    echo "   1. Check Vercel for deployment status"
    echo "   2. Add Supabase credentials"
    echo "   3. Run database migration"
    echo "   4. Test live site!"
    echo "=========================================="
else
    echo ""
    echo "❌ Push failed. Please check:"
    echo "   1. GitHub repository exists"
    echo "   2. You have permission to push"
    echo "   3. Remote URL is correct"
    echo ""
    echo "Current remote: $(git remote get-url origin)"
fi
