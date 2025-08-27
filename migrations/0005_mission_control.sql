-- Mission Control Database Schema

-- Agenda items table
CREATE TABLE IF NOT EXISTS agenda_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('supplements', 'workout', 'task', 'calendar')),
  start_time TEXT NOT NULL,
  end_time TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'done', 'skipped')),
  metadata TEXT NOT NULL, -- JSON
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE INDEX idx_agenda_start_time ON agenda_items(start_time);
CREATE INDEX idx_agenda_status ON agenda_items(status);
CREATE INDEX idx_agenda_source ON agenda_items(source);

-- Status snapshots table
CREATE TABLE IF NOT EXISTS status_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  captured_at TEXT NOT NULL,
  sleep_hours REAL,
  recovery_proxy INTEGER CHECK (recovery_proxy >= 0 AND recovery_proxy <= 100),
  training_load_today TEXT CHECK (training_load_today IN ('low', 'moderate', 'high')),
  nutrition_compliance_7d INTEGER CHECK (nutrition_compliance_7d >= 0 AND nutrition_compliance_7d <= 100),
  stress_flag TEXT NOT NULL,
  stress_reason TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_status_captured ON status_snapshots(captured_at);

-- Inventory items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('food', 'supplement', 'other')),
  unit TEXT NOT NULL,
  current_qty REAL NOT NULL,
  min_qty REAL NOT NULL,
  reorder_link TEXT,
  last_updated TEXT NOT NULL
);

CREATE INDEX idx_inventory_category ON inventory_items(category);
CREATE INDEX idx_inventory_low ON inventory_items(current_qty, min_qty);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('low_stock', 'schedule_change', 'agent_result')),
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warn', 'critical')),
  related_ids TEXT, -- JSON array
  created_at TEXT NOT NULL,
  dismissed_at TEXT
);

CREATE INDEX idx_notifications_created ON notifications(created_at);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Webhook logs for idempotency
CREATE TABLE IF NOT EXISTS webhook_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotency_key TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,
  processed_at TEXT NOT NULL
);

CREATE INDEX idx_webhook_idempotency ON webhook_logs(idempotency_key);

-- Supplement routines (reference data)
CREATE TABLE IF NOT EXISTS supplement_routines (
  date TEXT PRIMARY KEY,
  data TEXT NOT NULL, -- JSON
  updated_at TEXT NOT NULL
);

-- Workout plans (reference data)
CREATE TABLE IF NOT EXISTS workout_plans (
  date TEXT PRIMARY KEY,
  data TEXT NOT NULL, -- JSON
  updated_at TEXT NOT NULL
);

-- Command logs for outbound commands
CREATE TABLE IF NOT EXISTS command_logs (
  id TEXT PRIMARY KEY,
  command_type TEXT NOT NULL,
  payload TEXT NOT NULL, -- JSON
  correlation_id TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  response TEXT -- JSON
);

CREATE INDEX idx_command_correlation ON command_logs(correlation_id);
CREATE INDEX idx_command_type ON command_logs(command_type);

-- Settings table
CREATE TABLE IF NOT EXISTS mission_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL, -- JSON
  updated_at TEXT NOT NULL
);