-- Create agenda items table
DROP TABLE IF EXISTS agenda_items;

CREATE TABLE agenda_items (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,           -- YYYY-MM-DD format
  title TEXT NOT NULL,
  tag TEXT,                      -- Deep, Move, Break, Gym, Web, etc.
  start_ts INTEGER NOT NULL,    -- epoch seconds
  end_ts INTEGER NOT NULL,      -- epoch seconds
  status TEXT DEFAULT 'pending', -- pending, in_progress, done, snoozed
  notes TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  deleted_at INTEGER            -- soft delete support
);

-- Indexes for common queries
CREATE INDEX idx_agenda_date ON agenda_items(date);
CREATE INDEX idx_agenda_date_start ON agenda_items(date, start_ts);
CREATE INDEX idx_agenda_deleted ON agenda_items(deleted_at);