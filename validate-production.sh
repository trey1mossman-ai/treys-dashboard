#!/bin/bash

# PWA Production Validation Script
# Run after deployment: ./validate-production.sh YOUR_VERCEL_URL

PROD_URL=$1

if [ -z "$PROD_URL" ]; then
    echo "Usage: ./validate-production.sh https://your-app.vercel.app"
    exit 1
fi

echo "🔍 Validating PWA at: $PROD_URL"
echo "================================"

# 1. Check HTTPS
echo "✓ Checking HTTPS..."
if [[ $PROD_URL == https://* ]]; then
    echo "  ✅ HTTPS enabled"
else
    echo "  ❌ HTTPS required for PWA"
fi

# 2. Check manifest
echo "✓ Checking manifest.json..."
MANIFEST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/manifest.json")
if [ $MANIFEST_STATUS -eq 200 ]; then
    echo "  ✅ Manifest accessible"
else
    echo "  ❌ Manifest not found (HTTP $MANIFEST_STATUS)"
fi

# 3. Check service worker
echo "✓ Checking service-worker.js..."
SW_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/service-worker.js")
if [ $SW_STATUS -eq 200 ]; then
    echo "  ✅ Service worker accessible"
else
    echo "  ❌ Service worker not found (HTTP $SW_STATUS)"
fi

# 4. Check offline page
echo "✓ Checking offline.html..."
OFFLINE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/offline.html")
if [ $OFFLINE_STATUS -eq 200 ]; then
    echo "  ✅ Offline page accessible"
else
    echo "  ❌ Offline page not found (HTTP $OFFLINE_STATUS)"
fi

# 5. Check main bundle
echo "✓ Checking page load..."
MAIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL")
if [ $MAIN_STATUS -eq 200 ]; then
    echo "  ✅ Main page loads"
else
    echo "  ❌ Main page error (HTTP $MAIN_STATUS)"
fi

# 6. Performance check
echo "✓ Checking load time..."
LOAD_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$PROD_URL")
if (( $(echo "$LOAD_TIME < 2.0" | bc -l) )); then
    echo "  ✅ Load time: ${LOAD_TIME}s (< 2s)"
else
    echo "  ⚠️  Load time: ${LOAD_TIME}s (target < 2s)"
fi

echo ""
echo "================================"
echo "📱 Manual Testing Required:"
echo ""
echo "Desktop Chrome:"
echo "1. Open: $PROD_URL"
echo "2. Look for install icon in address bar"
echo "3. Open DevTools > Application > Service Workers"
echo "4. Check 'Offline' and reload"
echo ""
echo "Mobile Testing:"
echo "iOS Safari:"
echo "  Share > Add to Home Screen"
echo ""
echo "Android Chrome:"
echo "  ⋮ Menu > Install app"
echo ""
echo "Run Lighthouse:"
echo "  DevTools > Lighthouse > Generate report"
echo "  Target: 90+ score"
echo ""
echo "✅ Validation script complete!"
