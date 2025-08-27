-- Final integration database schema for mission control system
-- Ensures all required tables exist with proper structure

-- Agenda items table (enhanced)
CREATE TABLE IF NOT EXISTS agenda_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('calendar', 'supplements', 'workout', 'tasks', 'meals')),
  start_time TEXT NOT NULL,
  end_time TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'done', 'skipped')) DEFAULT 'pending',
  metadata TEXT, -- JSON
  display_notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Workout plans table
CREATE TABLE IF NOT EXISTS workout_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_name TEXT NOT NULL,
  blocks TEXT NOT NULL, -- JSON array of workout blocks
  intensity_flag TEXT NOT NULL CHECK (intensity_flag IN ('low', 'moderate', 'high')),
  adjustments TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(plan_name, created_at)
);

-- Inventory items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  current_qty REAL NOT NULL,
  min_qty REAL NOT NULL,
  reorder_link TEXT,
  last_updated TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Status snapshots table
CREATE TABLE IF NOT EXISTS status_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  captured_at TEXT NOT NULL UNIQUE,
  sleep_hours REAL,
  recovery_proxy REAL,
  training_load_today TEXT CHECK (training_load_today IN ('low', 'moderate', 'high')),
  nutrition_compliance_7d REAL,
  stress_flag TEXT CHECK (stress_flag IN ('green', 'yellow', 'red')),
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('error', 'info', 'schedule_change', 'agent_result')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warn', 'critical')),
  message TEXT NOT NULL,
  related_ids TEXT, -- JSON array of related item IDs
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Today ready signals table
CREATE TABLE IF NOT EXISTS today_ready_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_at TEXT NOT NULL,
  sources TEXT NOT NULL, -- JSON array of data sources
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(run_at)
);

-- Agent tasks table
CREATE TABLE IF NOT EXISTS agent_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT UNIQUE NOT NULL,
  intent TEXT NOT NULL,
  parameters TEXT NOT NULL, -- JSON
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')) DEFAULT 'queued',
  result TEXT, -- JSON result when completed
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Reorder queue table
CREATE TABLE IF NOT EXISTS reorder_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  queued_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed')) DEFAULT 'queued',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES agenda_items (id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agenda_items_source_date ON agenda_items(source, DATE(start_time));
CREATE INDEX IF NOT EXISTS idx_agenda_items_status ON agenda_items(status);
CREATE INDEX IF NOT EXISTS idx_agenda_items_start_time ON agenda_items(start_time);

CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_low_stock ON inventory_items(current_qty, min_qty) WHERE current_qty <= min_qty;

CREATE INDEX IF NOT EXISTS idx_status_snapshots_captured_at ON status_snapshots(captured_at);

CREATE INDEX IF NOT EXISTS idx_notifications_severity ON notifications(severity);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_created_at ON agent_tasks(created_at);

CREATE INDEX IF NOT EXISTS idx_reorder_queue_status ON reorder_queue(status);

-- Create triggers to automatically update 'updated_at' timestamps
CREATE TRIGGER IF NOT EXISTS trigger_agenda_items_updated_at
  AFTER UPDATE ON agenda_items
  FOR EACH ROW
  BEGIN
    UPDATE agenda_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS trigger_workout_plans_updated_at
  AFTER UPDATE ON workout_plans
  FOR EACH ROW
  BEGIN
    UPDATE workout_plans SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS trigger_inventory_items_updated_at
  AFTER UPDATE ON inventory_items
  FOR EACH ROW
  BEGIN
    UPDATE inventory_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS trigger_status_snapshots_updated_at
  AFTER UPDATE ON status_snapshots
  FOR EACH ROW
  BEGIN
    UPDATE status_snapshots SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS trigger_notifications_updated_at
  AFTER UPDATE ON notifications
  FOR EACH ROW
  BEGIN
    UPDATE notifications SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS trigger_agent_tasks_updated_at
  AFTER UPDATE ON agent_tasks
  FOR EACH ROW
  BEGIN
    UPDATE agent_tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS trigger_reorder_queue_updated_at
  AFTER UPDATE ON reorder_queue
  FOR EACH ROW
  BEGIN
    UPDATE reorder_queue SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;