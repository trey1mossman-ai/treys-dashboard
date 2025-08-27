-- Fix agenda_items table to support AI assistant and match API expectations
-- This migration transforms the existing table structure to match the API

-- Create new table with correct structure
CREATE TABLE IF NOT EXISTS agenda_items_new (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN (
    'calendar', 
    'supplements', 
    'workout', 
    'tasks', 
    'meals',
    'ai-assistant',
    'google-calendar',
    'outlook',
    'manual'
  )) DEFAULT 'manual',
  start_time TEXT NOT NULL,
  end_time TEXT,
  status TEXT NOT NULL CHECK (status IN (
    'pending', 
    'done', 
    'skipped',
    'in-progress',
    'completed',
    'cancelled'
  )) DEFAULT 'pending',
  metadata TEXT, -- JSON
  display_notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Migrate existing data if any exists
INSERT INTO agenda_items_new (id, title, source, start_time, end_time, status, display_notes, created_at, updated_at)
SELECT 
  id,
  title,
  CASE 
    WHEN tag = 'calendar' THEN 'google-calendar'
    WHEN tag IN ('supplements', 'workout', 'tasks', 'meals') THEN tag
    ELSE 'manual'
  END as source,
  datetime(start_ts, 'unixepoch') as start_time,
  CASE WHEN end_ts > 0 THEN datetime(end_ts, 'unixepoch') ELSE NULL END as end_time,
  CASE 
    WHEN status = 'done' THEN 'completed'
    WHEN status = 'skipped' THEN 'cancelled'
    ELSE 'pending'
  END as status,
  notes as display_notes,
  datetime(created_at, 'unixepoch') as created_at,
  datetime(updated_at, 'unixepoch') as updated_at
FROM agenda_items
WHERE deleted_at IS NULL;

-- Drop old table and rename new one
DROP TABLE IF EXISTS agenda_items;
ALTER TABLE agenda_items_new RENAME TO agenda_items;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agenda_items_source_date ON agenda_items(source, DATE(start_time));
CREATE INDEX IF NOT EXISTS idx_agenda_items_status ON agenda_items(status);
CREATE INDEX IF NOT EXISTS idx_agenda_items_start_time ON agenda_items(start_time);

-- Create trigger for updated_at
CREATE TRIGGER IF NOT EXISTS trigger_agenda_items_updated_at
  AFTER UPDATE ON agenda_items
  FOR EACH ROW
  BEGIN
    UPDATE agenda_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- Insert sample data for today's testing
INSERT OR IGNORE INTO agenda_items (id, title, source, start_time, end_time, status, display_notes) VALUES
  ('sample-ai-1', 'AI Generated Meeting', 'ai-assistant', '2025-08-25 14:00:00', '2025-08-25 15:00:00', 'pending', 'Sample AI-generated agenda item'),
  ('sample-cal-1', 'Calendar Sync Meeting', 'google-calendar', '2025-08-25 16:00:00', '2025-08-25 17:00:00', 'pending', 'Sample calendar event'),
  ('sample-task-1', 'Review Dashboard Implementation', 'manual', '2025-08-25 10:00:00', NULL, 'in-progress', 'Important document review task');