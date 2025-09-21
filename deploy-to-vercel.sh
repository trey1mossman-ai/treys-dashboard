#!/bin/bash

# Vercel Deployment Script for Life OS
# This script handles the deployment to Vercel with proper environment setup

echo "🚀 Preparing Life OS for Vercel Deployment..."
echo "============================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm i -g vercel
fi

# First, let's build locally to ensure everything works
echo ""
echo "🔨 Running local build test..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix build errors before deploying."
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Create a .env.production file for Vercel (without sensitive keys)
echo "📝 Creating production environment config..."
cat > .env.production << EOF
# Production environment variables
VITE_APP_MODE=production
VITE_MONTHLY_BUDGET=100
VITE_CACHE_TTL=86400
# API keys should be added through Vercel dashboard for security
EOF

echo ""
echo "🔐 Security Notice:"
echo "   API keys will need to be added through Vercel dashboard"
echo "   DO NOT commit sensitive keys to the repository!"
echo ""

# Check if this is first deployment or update
if [ -f ".vercel/project.json" ]; then
    echo "📍 Found existing Vercel project configuration"
    echo "   Deploying update to existing project..."
    echo ""
    
    # Deploy to production
    echo "🚀 Deploying to Vercel production..."
    vercel --prod
else
    echo "🆕 First time deployment detected"
    echo "   Setting up new Vercel project..."
    echo ""
    
    # Initial deployment with setup
    echo "🚀 Starting Vercel deployment..."
    echo "   Follow the prompts to configure your project:"
    echo ""
    vercel --prod
fi

# After deployment, provide instructions for environment variables
echo ""
echo "============================================="
echo "✅ Deployment Complete!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Add environment variables in Vercel Dashboard:"
echo "   - Go to: https://vercel.com/dashboard"
echo "   - Select your project"
echo "   - Go to Settings → Environment Variables"
echo "   - Add these variables (if you have them):"
echo "     • VITE_OPENAI_API_KEY"
echo "     • VITE_SUPABASE_URL" 
echo "     • VITE_SUPABASE_ANON_KEY"
echo ""
echo "2. Custom domain (optional):"
echo "   - Go to Settings → Domains"
echo "   - Add your custom domain"
echo ""
echo "3. Test your deployment:"
echo "   - Production URL will be shown above"
echo "   - Test /lifeos route for Life OS"
echo "   - Test / route for SimpleDashboard"
echo ""
echo "4. Monitor performance:"
echo "   - Check Vercel Analytics"
echo "   - Monitor Web Vitals"
echo ""
echo "============================================="
echo "💡 Tips:"
echo "   • Use 'vercel' for preview deployments"
echo "   • Use 'vercel --prod' for production"
echo "   • Use 'vercel logs' to view logs"
echo "   • Use 'vercel env' to manage environment variables"
echo ""
