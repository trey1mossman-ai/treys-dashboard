#!/bin/bash

# Pre-flight checklist for Vercel deployment
echo "✈️  VERCEL DEPLOYMENT PRE-FLIGHT CHECK"
echo "======================================"
echo ""

# Check Node version
echo "1. Checking Node.js version..."
node_version=$(node -v)
echo "   ✅ Node version: $node_version"
echo ""

# Check npm
echo "2. Checking npm..."
npm_version=$(npm -v)
echo "   ✅ npm version: $npm_version"
echo ""

# Check if build works
echo "3. Testing build..."
if npm run build > /dev/null 2>&1; then
    echo "   ✅ Build successful!"
    # Check bundle size
    if [ -d "dist" ]; then
        size=$(du -sh dist | cut -f1)
        echo "   📦 Bundle size: $size"
    fi
else
    echo "   ❌ Build failed - please fix errors first"
    exit 1
fi
echo ""

# Check for vercel.json
echo "4. Checking Vercel configuration..."
if [ -f "vercel.json" ]; then
    echo "   ✅ vercel.json found"
else
    echo "   ❌ vercel.json missing"
    exit 1
fi
echo ""

# Check for sensitive files
echo "5. Security check..."
sensitive_found=false
if [ -f ".env" ]; then
    echo "   ⚠️  Warning: .env file found - make sure it's in .gitignore"
    sensitive_found=true
fi
if [ -f ".env.local" ]; then
    echo "   ⚠️  Warning: .env.local file found - make sure it's in .gitignore"
    sensitive_found=true
fi
if [ "$sensitive_found" = false ]; then
    echo "   ✅ No exposed sensitive files"
fi
echo ""

# Check critical files exist
echo "6. Checking critical files..."
missing_files=false
[ -f "package.json" ] && echo "   ✅ package.json" || { echo "   ❌ package.json missing"; missing_files=true; }
[ -f "vite.config.ts" ] && echo "   ✅ vite.config.ts" || { echo "   ❌ vite.config.ts missing"; missing_files=true; }
[ -f "index.html" ] && echo "   ✅ index.html" || { echo "   ❌ index.html missing"; missing_files=true; }
[ -d "src" ] && echo "   ✅ src directory" || { echo "   ❌ src directory missing"; missing_files=true; }

if [ "$missing_files" = true ]; then
    echo ""
    echo "   ❌ Some critical files are missing!"
    exit 1
fi
echo ""

# Check Git status (optional)
echo "7. Git status..."
if [ -d ".git" ]; then
    uncommitted=$(git status --porcelain | wc -l)
    if [ "$uncommitted" -gt 0 ]; then
        echo "   ⚠️  You have $uncommitted uncommitted changes"
        echo "   (This won't affect Vercel deployment, just FYI)"
    else
        echo "   ✅ Git working directory clean"
    fi
else
    echo "   ℹ️  Not a Git repository (that's okay)"
fi
echo ""

# Final status
echo "======================================"
echo "✅ PRE-FLIGHT CHECK COMPLETE!"
echo ""
echo "Ready to deploy to Vercel!"
echo "Run: ./deploy-to-vercel.sh"
echo ""
echo "Or deploy manually with: npx vercel --prod"
echo "======================================"
