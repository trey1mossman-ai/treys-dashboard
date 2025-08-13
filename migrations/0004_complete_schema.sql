-- Complete schema for missing tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    timezone TEXT DEFAULT 'America/Chicago',
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

-- Tasks with sort order
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    due_ts INTEGER,
    source TEXT, -- 'manual', 'email', 'sms', 'whatsapp', 'agent'
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'cancelled')),
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_sort ON tasks(sort_order);

-- Action logs for tracking all activities
CREATE TABLE IF NOT EXISTS action_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    action_type TEXT NOT NULL, -- 'agenda', 'task', 'workout', 'note', 'quick_action'
    action_detail TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'completed', 'executed'
    entity_id TEXT,
    metadata TEXT, -- JSON with additional context
    created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_action_logs_type ON action_logs(action_type);
CREATE INDEX idx_action_logs_created ON action_logs(created_at DESC);

-- Messages for communication tracking
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
    direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
    from_addr TEXT,
    to_addr TEXT,
    subject TEXT,
    body TEXT,
    metadata TEXT, -- JSON with additional data
    created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_messages_channel ON messages(channel);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Trainer plans for workout management
CREATE TABLE IF NOT EXISTS trainer_plans (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    date TEXT NOT NULL, -- YYYY-MM-DD
    title TEXT,
    blocks_json TEXT NOT NULL, -- JSON array of workout blocks
    source TEXT DEFAULT 'manual', -- 'manual', 'n8n', 'imported'
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_trainer_plans_date ON trainer_plans(date);

-- Workout logs for tracking completed exercises
CREATE TABLE IF NOT EXISTS workout_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    date TEXT NOT NULL, -- YYYY-MM-DD
    exercise TEXT NOT NULL,
    set_number INTEGER,
    reps INTEGER,
    load REAL,
    rpe REAL, -- Rate of Perceived Exertion (1-10)
    notes TEXT,
    created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_workout_logs_date ON workout_logs(date);
CREATE INDEX idx_workout_logs_exercise ON workout_logs(exercise);

-- Update quick_actions to track execution status
ALTER TABLE quick_actions ADD COLUMN last_status INTEGER;
ALTER TABLE quick_actions ADD COLUMN last_run_ts INTEGER;

-- Update notes to add positioning for sticky board
ALTER TABLE notes ADD COLUMN x REAL DEFAULT 0;
ALTER TABLE notes ADD COLUMN y REAL DEFAULT 0;
ALTER TABLE notes ADD COLUMN w REAL DEFAULT 320;
ALTER TABLE notes ADD COLUMN h REAL DEFAULT 180;