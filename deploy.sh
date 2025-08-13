#!/bin/bash

# Cloudflare Pages Deployment Script for Agenda App
# This script builds and deploys your app to Cloudflare Pages

set -e  # Exit on error

echo "🚀 Deploying Agenda App to Cloudflare Pages"
echo "============================================"
echo ""

# Check if logged in to Cloudflare
echo "📋 Checking Cloudflare authentication..."
if ! wrangler whoami &>/dev/null; then
    echo "⚠️  Not logged in to Cloudflare"
    echo "👉 Running: wrangler login"
    wrangler login
fi

echo "✅ Authenticated with Cloudflare"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the application
echo "🔨 Building application for production..."
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not created"
    exit 1
fi

echo "✅ Build successful"
echo ""

# Run D1 migrations if needed
echo "🗄️  Checking D1 database migrations..."
if [ -d "migrations" ] && [ "$(ls -A migrations/*.sql 2>/dev/null)" ]; then
    echo "📝 Found migration files. Running migrations..."
    
    # Apply agent_control.sql migration if it exists
    if [ -f "migrations/agent_control.sql" ]; then
        echo "   Applying agent_control.sql..."
        wrangler d1 execute agenda-dashboard --file=migrations/agent_control.sql --remote
    fi
    
    echo "✅ Migrations complete"
else
    echo "ℹ️  No migrations to run"
fi
echo ""

# Deploy to Cloudflare Pages
echo "☁️  Deploying to Cloudflare Pages..."
echo ""

# Use wrangler pages deploy for Pages projects
wrangler pages deploy dist \
    --project-name=agenda-dashboard \
    --branch=main

echo ""
echo "✅ Deployment complete!"
echo ""

# Get deployment URL
echo "🌐 Your app is deployed at:"
echo "   https://agenda-dashboard.pages.dev"
echo ""

# List secrets that need to be configured
echo "🔐 Required secrets (configure via Cloudflare Dashboard or CLI):"
echo ""
echo "   Essential for production:"
echo "   - AGENT_SERVICE_TOKEN    (for Agent API)"
echo "   - AGENT_HMAC_SECRET      (for Agent API)"
echo ""
echo "   Optional integrations:"
echo "   - N8N_BASE_URL          (for n8n workflows)"
echo "   - N8N_TOKEN             (for n8n auth)"
echo "   - OPENAI_API_KEY        (for OpenAI integration)"
echo "   - ANTHROPIC_API_KEY     (for Claude integration)"
echo "   - SENDGRID_API_KEY      (for email)"
echo "   - TWILIO_ACCOUNT_SID    (for SMS)"
echo "   - TWILIO_AUTH_TOKEN     (for SMS)"
echo ""

echo "📝 To add secrets, use:"
echo "   wrangler pages secret put <SECRET_NAME> --project-name=agenda-dashboard"
echo ""
echo "   Example:"
echo "   wrangler pages secret put AGENT_SERVICE_TOKEN --project-name=agenda-dashboard"
echo ""

echo "🎉 Deployment script complete!"