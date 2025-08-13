-- Calendar sync support
ALTER TABLE agenda_items ADD COLUMN cal_sync_status TEXT DEFAULT 'pending';
ALTER TABLE agenda_items ADD COLUMN cal_event_id TEXT;
ALTER TABLE agenda_items ADD COLUMN tz TEXT DEFAULT 'America/Chicago';

-- Calendar sync outbox for retries
CREATE TABLE IF NOT EXISTS cal_outbox (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    agenda_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    payload TEXT NOT NULL, -- JSON payload
    attempts INTEGER DEFAULT 0,
    next_attempt_at INTEGER DEFAULT (unixepoch()),
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (agenda_id) REFERENCES agenda_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_cal_outbox_next_attempt ON cal_outbox(next_attempt_at);
CREATE INDEX idx_cal_outbox_agenda ON cal_outbox(agenda_id);

-- Daily metrics for completion tracking
CREATE TABLE IF NOT EXISTS daily_metrics (
    date TEXT PRIMARY KEY, -- YYYY-MM-DD
    work_target REAL DEFAULT 1.0,
    work_actual REAL DEFAULT 0,
    gym_target REAL DEFAULT 1.0,
    gym_actual REAL DEFAULT 0,
    nutrition_target REAL DEFAULT 1.0,
    nutrition_actual REAL DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

-- Agent personas for assistant
CREATE TABLE IF NOT EXISTS agent_personas (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    tools_json TEXT NOT NULL, -- JSON array of available tools
    created_at INTEGER DEFAULT (unixepoch())
);

-- Insert default personas
INSERT OR IGNORE INTO agent_personas (name, tools_json) VALUES 
    ('Ultimate', '["agenda.*","actions.*","notes.*","trainer.*","comms.*","summarize.*","analyze.*"]'),
    ('Ops', '["agenda.*","actions.*","notes.*","summarize.day","analyze.trends"]'),
    ('Comms', '["comms.*","notes.create","agenda.create"]'),
    ('Trainer', '["trainer.*","agenda.create","notes.create"]'),
    ('Research', '["summarize.*","analyze.*","notes.create"]');