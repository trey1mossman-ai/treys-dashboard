#!/bin/bash

# Database Setup Script for Agenda App
# This script creates and applies all database migrations

echo "🗄️  Setting up Cloudflare D1 Database..."
echo "========================================="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI is not installed"
    echo "Please install it with: npm install -g wrangler"
    exit 1
fi

# Create migration files if they don't exist
echo "📝 Creating migration files..."

# Migration 1: Core tables
cat > migrations/001_core_tables.sql << 'EOF'
-- Core tables for Agenda App

-- Quick Actions table
CREATE TABLE IF NOT EXISTS quick_actions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    method TEXT NOT NULL CHECK(method IN ('GET', 'POST')),
    webhook_url TEXT NOT NULL,
    headers_json TEXT,
    default_payload_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    body TEXT NOT NULL,
    tag TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'archived', 'deleted')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agenda items table
CREATE TABLE IF NOT EXISTS agenda (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    start_ts INTEGER NOT NULL,
    end_ts INTEGER NOT NULL,
    tag TEXT,
    notes TEXT,
    completed BOOLEAN DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    due_ts INTEGER,
    source TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'archived')),
    position INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quick_actions_created ON quick_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(status);
CREATE INDEX IF NOT EXISTS idx_agenda_date ON agenda(date);
CREATE INDEX IF NOT EXISTS idx_agenda_status ON agenda(status);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
EOF

# Migration 2: Additional features
cat > migrations/002_additional_features.sql << 'EOF'
-- Additional tables for extended features

-- Training/Fitness logs
CREATE TABLE IF NOT EXISTS trainer_logs (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    exercise TEXT NOT NULL,
    set_number INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    load REAL,
    rpe REAL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily metrics
CREATE TABLE IF NOT EXISTS daily_metrics (
    id TEXT PRIMARY KEY,
    date TEXT UNIQUE NOT NULL,
    work_actual REAL,
    gym_actual REAL,
    nutrition_actual REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Communications log
CREATE TABLE IF NOT EXISTS communications (
    id TEXT PRIMARY KEY,
    channel TEXT NOT NULL CHECK(channel IN ('email', 'sms', 'whatsapp')),
    sender TEXT,
    subject TEXT,
    body TEXT,
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trainer_logs_date ON trainer_logs(date);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date);
CREATE INDEX IF NOT EXISTS idx_communications_channel ON communications(channel);
EOF

echo "✅ Migration files created"
echo ""

# Function to run migrations
run_migration() {
    local env=$1
    local file=$2
    local flag=$3
    
    echo "  Applying $(basename $file) to $env..."
    if wrangler d1 execute agenda-dashboard $flag --file="$file" 2>/dev/null; then
        echo "  ✅ Success"
    else
        echo "  ⚠️  Migration may have already been applied or database doesn't exist yet"
    fi
}

# Apply migrations locally
echo "🔨 Applying migrations to LOCAL database..."
echo ""

# Create local database if it doesn't exist
wrangler d1 execute agenda-dashboard --local --command="SELECT 1" 2>/dev/null || true

for migration in migrations/*.sql; do
    if [ -f "$migration" ]; then
        run_migration "local" "$migration" "--local"
    fi
done

echo ""
echo "✅ Local database setup complete!"
echo ""

# Production deployment instructions
echo "📋 To deploy to PRODUCTION, run these commands:"
echo ""
echo "  # Apply all migrations"
echo "  for file in migrations/*.sql; do"
echo "    wrangler d1 execute agenda-dashboard --file=\"\$file\""
echo "  done"
echo ""
echo "  # Or apply individually:"
echo "  wrangler d1 execute agenda-dashboard --file=migrations/001_core_tables.sql"
echo "  wrangler d1 execute agenda-dashboard --file=migrations/002_additional_features.sql"
echo "  wrangler d1 execute agenda-dashboard --file=migrations/agent_control.sql"
echo ""

# Test the setup
echo "🧪 Testing database connection..."
echo ""

# Create a test query
cat > test-db.sql << 'EOF'
SELECT 
    'quick_actions' as table_name, 
    COUNT(*) as count 
FROM sqlite_master 
WHERE type='table' AND name='quick_actions'
UNION ALL
SELECT 
    'notes' as table_name, 
    COUNT(*) as count 
FROM sqlite_master 
WHERE type='table' AND name='notes'
UNION ALL
SELECT 
    'agenda' as table_name, 
    COUNT(*) as count 
FROM sqlite_master 
WHERE type='table' AND name='agenda'
UNION ALL
SELECT 
    'tasks' as table_name, 
    COUNT(*) as count 
FROM sqlite_master 
WHERE type='table' AND name='tasks';
EOF

echo "Tables in local database:"
wrangler d1 execute agenda-dashboard --local --file=test-db.sql 2>/dev/null || echo "  ⚠️  Could not query database"

# Cleanup
rm -f test-db.sql

echo ""
echo "🎉 Database setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start the development server: npm run dev"
echo "  2. Start Cloudflare Pages locally: wrangler pages dev dist --local --persist"
echo "  3. Test the health endpoint: curl http://localhost:8788/api/health"