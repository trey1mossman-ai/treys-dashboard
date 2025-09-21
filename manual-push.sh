#!/bin/bash

echo "🚀 MANUAL GITHUB PUSH HELPER"
echo "============================"
echo ""
echo "This will manually push your code to GitHub"
echo ""

# Ensure we're in the right directory
cd "/Volumes/Trey's Macbook TB/Trey's Dashboard" || exit 1

# Check current status
echo "📊 Current Git Status:"
git status --short
echo ""

# Check if we have commits
if ! git rev-parse HEAD >/dev/null 2>&1; then
    echo "❌ No commits found. Creating initial commit..."
    git add .
    git commit -m "Initial commit: Life OS with all fixes"
fi

# Remove any existing remote and add the correct one
echo "🔗 Setting up GitHub remote..."
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/trey1mossman-ai/treys-dashboard.git

echo "✅ Remote configured:"
git remote -v
echo ""

# Try pushing
echo "🚀 Attempting to push to GitHub..."
echo ""
echo "GitHub Credentials:"
echo "  Username: trey1mossman-ai"
echo "  Password: (your GitHub password or token)"
echo ""

# Try different push methods
echo "Method 1: Standard push"
git push -u origin main 2>&1 | tee push_result.txt

if grep -q "fatal" push_result.txt; then
    echo ""
    echo "❌ Standard push failed. Trying alternative method..."
    echo ""
    
    # Try with explicit protocol
    echo "Method 2: Push with explicit main branch"
    git push --set-upstream origin main 2>&1 | tee push_result.txt
    
    if grep -q "fatal" push_result.txt; then
        echo ""
        echo "❌ Push still failing. Checking for common issues..."
        
        # Check if main branch exists
        if ! git show-ref --quiet refs/heads/main; then
            echo "Creating main branch..."
            git checkout -b main
        fi
        
        echo ""
        echo "Method 3: Force push (overwrites remote)"
        echo "This will overwrite anything on GitHub. Continue? (y/n)"
        read -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git push -u origin main --force
        fi
    fi
fi

# Check result
if git ls-remote origin >/dev/null 2>&1; then
    echo ""
    echo "============================"
    echo "✅ SUCCESS! Code is on GitHub!"
    echo ""
    echo "📍 Repository: https://github.com/trey1mossman-ai/treys-dashboard"
    echo "🚀 Vercel should start building automatically!"
    echo ""
    echo "Check deployment at: https://vercel.com/dashboard"
    echo "============================"
else
    echo ""
    echo "============================"
    echo "⚠️  Push may have failed. Please check:"
    echo ""
    echo "1. GitHub credentials are correct"
    echo "2. Repository exists: https://github.com/trey1mossman-ai/treys-dashboard"
    echo "3. You have permission to push"
    echo ""
    echo "Manual fix:"
    echo "1. Create a Personal Access Token:"
    echo "   https://github.com/settings/tokens/new"
    echo "   - Name: 'Dashboard Push'"
    echo "   - Scope: 'repo'"
    echo "   - Generate and copy token"
    echo ""
    echo "2. Run this command:"
    echo "   git push https://trey1mossman-ai:YOUR_TOKEN@github.com/trey1mossman-ai/treys-dashboard.git main"
    echo "============================"
fi

# Clean up
rm -f push_result.txt
