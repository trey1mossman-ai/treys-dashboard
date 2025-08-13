-- Quick Actions table for storing automation configurations
CREATE TABLE IF NOT EXISTS quick_actions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('GET', 'POST')),
    webhook_url TEXT NOT NULL,
    headers_json TEXT, -- JSON string for headers object
    default_payload_json TEXT, -- JSON string for default payload
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries on quick actions
CREATE INDEX IF NOT EXISTS idx_quick_actions_created_at ON quick_actions (created_at DESC);

-- Notes table for storing quick notes
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    body TEXT NOT NULL,
    tag TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster queries on notes
CREATE INDEX IF NOT EXISTS idx_notes_status ON notes (status);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_status_created ON notes (status, created_at DESC);