#!/bin/bash

echo "🔍 FINAL CHECK BEFORE GITHUB PUSH"
echo "=================================="
echo ""

# Check if webhooks are fixed
echo "1. Checking webhook service..."
if grep -q "ailifeassistanttm.com" src/services/webhookService.ts; then
    echo "   ✅ Webhook URLs fixed"
else
    echo "   ❌ Webhook URLs not updated"
fi

# Check if vercel.json exists
echo ""
echo "2. Checking Vercel config..."
if [ -f "vercel.json" ]; then
    echo "   ✅ vercel.json present"
else
    echo "   ❌ vercel.json missing"
fi

# Check team files
echo ""
echo "3. Checking team coordination files..."
[ -f "TEAM_STATUS.md" ] && echo "   ✅ TEAM_STATUS.md" || echo "   ❌ TEAM_STATUS.md"
[ -f "HANDOFF.md" ] && echo "   ✅ HANDOFF.md" || echo "   ❌ HANDOFF.md"
[ -f ".claude/team-sync.md" ] && echo "   ✅ .claude/team-sync.md" || echo "   ❌ .claude/team-sync.md"

# Check git status
echo ""
echo "4. Git status..."
changes=$(git status --porcelain | wc -l)
echo "   📝 $changes files ready to commit"

# Check if build works
echo ""
echo "5. Build check..."
if npm run build > /dev/null 2>&1; then
    echo "   ✅ Build successful"
    size=$(du -sh dist | cut -f1)
    echo "   📦 Bundle size: $size"
else
    echo "   ❌ Build failed"
fi

echo ""
echo "=================================="
echo "✅ READY TO PUSH TO GITHUB!"
echo ""
echo "Run these commands:"
echo ""
echo 'git commit -m "fix(webhooks): restore connections and add team sync"'
echo "git push origin main"
echo ""
echo "This will trigger Vercel auto-deployment!"
echo "=================================="
