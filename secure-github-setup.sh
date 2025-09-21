#!/bin/bash

echo "🔐 SECURE GITHUB SETUP (No Token Needed!)"
echo "========================================"
echo ""
echo "This script will help you connect to GitHub SAFELY"
echo "without sharing any tokens or passwords."
echo ""

# Check git status
echo "📊 Current Git Status:"
git status --short
echo ""

# Ensure we have commits
COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo "0")
if [ "$COMMIT_COUNT" = "0" ]; then
    echo "📦 Creating initial commit..."
    git add .
    git commit -m "Initial commit: Life OS with webhooks fixed and team sync ready"
fi

echo "🔗 Let's connect to YOUR GitHub:"
echo ""
echo "1. First, create a new repository on GitHub:"
echo "   👉 Open: https://github.com/new"
echo ""
echo "   Use these settings:"
echo "   - Repository name: life-os"
echo "   - Description: AI-powered Life Operating System"
echo "   - Private or Public: Your choice"
echo "   - DON'T initialize with README/license/gitignore"
echo ""
echo "2. After creating, GitHub will show you commands."
echo "   Come back here and press Enter..."
read

echo ""
echo "3. Now enter your GitHub username:"
read -p "GitHub username: " GITHUB_USER

echo ""
echo "4. Enter the repository name you just created:"
read -p "Repository name [life-os]: " REPO_NAME

if [ -z "$REPO_NAME" ]; then
    REPO_NAME="life-os"
fi

echo ""
echo "📝 Setting up remote..."

# Remove any existing remote
git remote remove origin 2>/dev/null || true

# Add the new remote
git remote add origin "https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

echo "✅ Remote configured!"
echo ""
echo "🚀 Now pushing your code..."
echo ""
echo "GitHub will ask for your username and password."
echo "For password, you can use:"
echo "  - Your GitHub password (if 2FA is disabled)"
echo "  - A NEW personal access token (if 2FA is enabled)"
echo ""
echo "To create a NEW token (if needed):"
echo "  1. Go to: https://github.com/settings/tokens/new"
echo "  2. Name: 'Life OS Deploy'"
echo "  3. Select 'repo' scope"
echo "  4. Click 'Generate token'"
echo "  5. Copy and use as password"
echo ""
echo "Press Enter when ready to push..."
read

# Push to GitHub
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "🎉 SUCCESS! Your code is on GitHub!"
    echo ""
    echo "✅ Repository: https://github.com/${GITHUB_USER}/${REPO_NAME}"
    echo "✅ Vercel will auto-deploy in ~2 minutes"
    echo ""
    echo "Check your deployment at:"
    echo "👉 https://vercel.com/dashboard"
    echo "========================================"
else
    echo ""
    echo "❌ Push failed. Please check:"
    echo "  1. Repository exists on GitHub"
    echo "  2. You entered credentials correctly"
    echo "  3. Try running: git push -u origin main"
fi
