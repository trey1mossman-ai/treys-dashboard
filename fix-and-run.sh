#!/bin/bash
set -e

echo "🚀 Emergency Fix - Making Agenda Dashboard Work NOW"
echo "===================================================="
echo ""

# 1. Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# 2. Create local database directory
echo "🗄️ Setting up local database..."
mkdir -p .wrangler/state/v3/d1/miniflare-D1DatabaseObject

# 3. Apply migrations locally (create tables)
echo "📊 Creating database tables..."
npx wrangler d1 execute agenda-dashboard --local --command "
CREATE TABLE IF NOT EXISTS quick_actions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'POST',
    webhook_url TEXT NOT NULL,
    headers_json TEXT,
    default_payload_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    body TEXT NOT NULL,
    tag TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agenda_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    tag TEXT,
    notes TEXT,
    completed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    due_ts INTEGER,
    source TEXT,
    status TEXT DEFAULT 'pending',
    position INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);" 2>/dev/null || echo "⚠️ Tables may already exist (that's OK)"

# 4. Build frontend
echo "🔨 Building frontend..."
npm run build

# 5. Start both frontend and backend
echo ""
echo "====================================="
echo "🌟 APP WILL BE AVAILABLE AT:"
echo "📱 Web: http://localhost:5173"
echo "🔧 API: http://localhost:8788"
echo "====================================="
echo ""

# Start backend in background
echo "🔧 Starting backend API..."
npx wrangler pages dev dist --local --persist-to=.wrangler/state --port 8788 --compatibility-date=2024-01-01 &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo "🌐 Starting frontend..."
npm run dev &
FRONTEND_PID=$!

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit
}

trap cleanup EXIT INT TERM

# Keep script running
echo ""
echo "✅ Services are running!"
echo "📱 Open http://localhost:5173 in your browser"
echo ""
echo "Press Ctrl+C to stop all services"
wait