#!/bin/bash

# Agenda App Development Setup Script
# This script sets up the development environment for the Agenda app

echo "🚀 Setting up Agenda App development environment..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ npm version: $(npm -v)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "✅ Dependencies installed successfully"
echo ""

# Initialize mock data in localStorage
echo "🗂️ Setting up initial mock data..."
cat > init-mock-data.js << 'EOF'
// This script initializes mock data for development
console.log('Initializing mock data...');

const mockQuickActions = [
  {
    id: '1',
    name: 'Daily Standup',
    method: 'POST',
    webhook_url: 'https://hooks.slack.com/services/example',
    headers: { 'Content-Type': 'application/json' },
    default_payload: { text: 'Daily standup starting!' },
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Send Report',
    method: 'POST',
    webhook_url: 'https://example.com/webhook',
    headers: { 'Content-Type': 'application/json' },
    default_payload: { type: 'daily_report' },
    created_at: new Date().toISOString()
  }
];

const mockNotes = [
  {
    id: '1',
    body: 'Welcome to your Agenda app! This is a sample note.',
    tag: 'info',
    status: 'active',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    body: 'Remember to review the daily tasks and update progress.',
    tag: 'reminder',
    status: 'active',
    created_at: new Date().toISOString()
  }
];

const mockTasks = [
  {
    id: '1',
    title: 'Review pull requests',
    source: 'manual',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Update documentation',
    source: 'manual',
    createdAt: new Date().toISOString()
  }
];

console.log('Mock data ready. You can now start the development server.');
console.log('Quick Actions:', mockQuickActions.length);
console.log('Notes:', mockNotes.length);
console.log('Tasks:', mockTasks.length);
EOF

node init-mock-data.js
rm init-mock-data.js

echo ""
echo "✅ Mock data initialized"
echo ""

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << 'EOF'
# Local development environment variables
VITE_API_URL=http://localhost:8788
VITE_APP_ENV=development

# Mock API Settings (for offline development)
VITE_USE_MOCK_API=true

# Optional: Add your API keys here for testing
# VITE_OPENAI_API_KEY=your_key_here
# VITE_ANTHROPIC_API_KEY=your_key_here
EOF
    echo "✅ .env.local created"
else
    echo "ℹ️  .env.local already exists"
fi

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "📋 Available commands:"
echo "   npm run dev       - Start development server"
echo "   npm run build     - Build for production"
echo "   npm run preview   - Preview production build"
echo "   npm run lint      - Run linter"
echo "   npm run typecheck - Run TypeScript type checking"
echo ""
echo "🌐 Starting development server..."
echo ""

# Start the development server
npm run dev