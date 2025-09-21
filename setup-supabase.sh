#!/bin/bash

# Supabase Setup Script for Life OS
echo "🔧 SUPABASE SETUP FOR LIFE OS"
echo "=============================="
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local file..."
    touch .env.local
fi

# Prompt for Supabase credentials
echo "Please provide your Supabase credentials"
echo "(Find them at: https://supabase.com/dashboard → Settings → API)"
echo ""

read -p "Supabase URL (https://xxxxx.supabase.co): " SUPABASE_URL
read -p "Supabase Anon Key (eyJ...): " SUPABASE_KEY

# Validate inputs
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "❌ Both URL and Key are required!"
    exit 1
fi

# Update .env.local
echo ""
echo "📝 Updating .env.local..."

# Check if variables already exist and update them
if grep -q "VITE_SUPABASE_URL" .env.local; then
    # On macOS, use -i '' for in-place editing
    sed -i '' "s|VITE_SUPABASE_URL=.*|VITE_SUPABASE_URL=$SUPABASE_URL|" .env.local
else
    echo "VITE_SUPABASE_URL=$SUPABASE_URL" >> .env.local
fi

if grep -q "VITE_SUPABASE_ANON_KEY" .env.local; then
    sed -i '' "s|VITE_SUPABASE_ANON_KEY=.*|VITE_SUPABASE_ANON_KEY=$SUPABASE_KEY|" .env.local
else
    echo "VITE_SUPABASE_ANON_KEY=$SUPABASE_KEY" >> .env.local
fi

echo "✅ Environment variables updated!"
echo ""

# Test connection
echo "🔍 Testing Supabase connection..."
node test-supabase.mjs

echo ""
echo "=============================="
echo "✅ SETUP COMPLETE!"
echo ""
echo "Next steps:"
echo "1. Run the migration in Supabase SQL Editor:"
echo "   migrations/001_create_lifeos_schema.sql"
echo ""
echo "2. Add these to Vercel Dashboard:"
echo "   VITE_SUPABASE_URL=$SUPABASE_URL"
echo "   VITE_SUPABASE_ANON_KEY=[your-key]"
echo ""
echo "3. Push to GitHub to trigger deployment:"
echo "   git add ."
echo "   git commit -m 'feat: add Supabase integration'"
echo "   git push origin main"
echo ""
echo "4. Start development:"
echo "   npm run dev"
echo "=============================="
