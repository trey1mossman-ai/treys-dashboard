#!/bin/bash

echo "🏥 Running Agenda Dashboard Health Check..."
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0
SUCCESS=0

# Function to check if a file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} $2"
        ((SUCCESS++))
    else
        echo -e "${RED}❌${NC} $2 - File missing: $1"
        ((ERRORS++))
    fi
}

# Function to check if a directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✅${NC} $2"
        ((SUCCESS++))
    else
        echo -e "${RED}❌${NC} $2 - Directory missing: $1"
        ((ERRORS++))
    fi
}

# Function to check for pattern in file
check_pattern() {
    if grep -q "$1" "$2" 2>/dev/null; then
        echo -e "${GREEN}✅${NC} $3"
        ((SUCCESS++))
    else
        echo -e "${YELLOW}⚠️${NC} $3"
        ((WARNINGS++))
    fi
}

echo "📁 Checking project structure..."
echo "---------------------------------"
check_dir "src" "Source directory exists"
check_dir "public" "Public assets directory exists"
check_dir "src/components" "Components directory exists"
check_dir "src/features" "Features directory exists"
check_dir "src/services" "Services directory exists"
check_dir "src/hooks" "Hooks directory exists"
check_dir "src/lib" "Lib directory exists"
echo ""

echo "📄 Checking critical files..."
echo "------------------------------"
check_file "package.json" "Package.json exists"
check_file "tsconfig.json" "TypeScript config exists"
check_file "vite.config.ts" "Vite config exists"
check_file "tailwind.config.ts" "Tailwind config exists"
check_file "index.html" "Index.html exists"
check_file "src/main.tsx" "Main entry point exists"
check_file "src/App.tsx" "App component exists"
echo ""

echo "🔧 Checking PWA configuration..."
echo "---------------------------------"
check_file "public/manifest.webmanifest" "PWA manifest exists"
check_pattern "VitePWA" "vite.config.ts" "PWA plugin configured"
check_pattern "apple-mobile-web-app-capable" "index.html" "iOS PWA meta tags present"
check_file "public/offline.html" "Offline fallback page exists"
check_pattern "ErrorBoundary" "src/main.tsx" "Error boundary implemented"
echo ""

echo "⚡ Checking performance optimizations..."
echo "----------------------------------------"
check_pattern "React.memo" "src/features/agenda/AgendaItem.tsx" "React.memo used for optimization"
check_pattern "lazy" "src/routes/index.tsx" "Lazy loading implemented"
check_pattern "debounce" "src/hooks/useLocalStorage.ts" "Debounced localStorage writes"
check_pattern "cache" "src/services/apiClient.ts" "API caching implemented"
check_file "src/lib/performance.ts" "Performance monitoring exists"
echo ""

echo "📱 Checking iOS optimizations..."
echo "---------------------------------"
check_pattern "safe-area-inset" "src/styles/globals.css" "iOS safe area handling"
check_pattern "touchable" "src/styles/globals.css" "Touch target optimization"
check_pattern "-webkit-overflow-scrolling" "src/styles/globals.css" "iOS scrolling optimization"
echo ""

echo "🔒 Checking security..."
echo "------------------------"
if grep -r "VITE_.*API.*KEY" src/ 2>/dev/null | grep -v "import.meta.env"; then
    echo -e "${RED}❌${NC} API keys found in source code!"
    ((ERRORS++))
else
    echo -e "${GREEN}✅${NC} No hardcoded API keys found"
    ((SUCCESS++))
fi

if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅${NC} Environment variables file exists"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠️${NC} .env.local not found (may be intentional)"
    ((WARNINGS++))
fi
echo ""

echo "📦 Checking dependencies..."
echo "---------------------------"
REQUIRED_DEPS=("react" "react-dom" "react-router-dom" "tailwindcss" "vite" "typescript" "zod" "zustand")
for dep in "${REQUIRED_DEPS[@]}"; do
    if grep -q "\"$dep\"" package.json; then
        echo -e "${GREEN}✅${NC} $dep installed"
        ((SUCCESS++))
    else
        echo -e "${RED}❌${NC} $dep missing"
        ((ERRORS++))
    fi
done

# Check for new performance dependencies
if grep -q "react-window" package.json; then
    echo -e "${GREEN}✅${NC} Virtual scrolling library installed"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠️${NC} react-window not installed (optional optimization)"
    ((WARNINGS++))
fi
echo ""

echo "🎨 Checking UI/UX..."
echo "--------------------"
check_file "src/components/Loading.tsx" "Loading component exists"
check_file "src/components/ErrorBoundary.tsx" "Error boundary component exists"
check_file "src/components/InstallPWA.tsx" "PWA install prompt exists"
check_file "src/hooks/usePWA.ts" "PWA hook exists"
echo ""

echo "🧪 Running TypeScript check..."
echo "------------------------------"
if npx tsc --noEmit 2>/dev/null; then
    echo -e "${GREEN}✅${NC} TypeScript compilation successful"
    ((SUCCESS++))
else
    echo -e "${RED}❌${NC} TypeScript errors found (run 'npm run typecheck' for details)"
    ((ERRORS++))
fi
echo ""

echo "📊 Summary"
echo "=========="
echo -e "${GREEN}Success:${NC} $SUCCESS"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Errors:${NC} $ERRORS"
echo ""

if [ $ERRORS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}🎉 Perfect health! Your app is fully optimized.${NC}"
    else
        echo -e "${YELLOW}😊 Good health with minor suggestions for improvement.${NC}"
    fi
else
    echo -e "${RED}😰 Critical issues found. Please address the errors above.${NC}"
    echo ""
    echo "Quick fixes:"
    echo "1. Run: npm install"
    echo "2. Run: ./setup-pwa-assets.sh"
    echo "3. Check TypeScript errors: npm run typecheck"
fi

echo ""
echo "💡 Performance Tips:"
echo "--------------------"
echo "1. Test PWA installation on actual devices"
echo "2. Run Lighthouse audit in Chrome DevTools"
echo "3. Monitor bundle size with: npm run build"
echo "4. Test on slow 3G network in DevTools"
echo "5. Check iOS performance on actual iPhone"

exit $ERRORS