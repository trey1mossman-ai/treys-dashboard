-- Supabase Schema for Life OS
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- EMAILS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  from_email TEXT NOT NULL,
  from_name TEXT,
  subject TEXT,
  body TEXT,
  body_plain TEXT,
  snippet TEXT,
  labels TEXT[],
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_emails_timestamp ON emails(timestamp DESC);
CREATE INDEX idx_emails_from ON emails(from_email);
CREATE INDEX idx_emails_is_read ON emails(is_read);

-- ============================================
-- CALENDAR EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  summary TEXT NOT NULL,
  description TEXT,
  start TIMESTAMPTZ NOT NULL,
  "end" TIMESTAMPTZ NOT NULL,
  location TEXT,
  attendees JSONB DEFAULT '[]'::jsonb,
  video_link TEXT,
  all_day BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_calendar_start ON calendar_events(start);
CREATE INDEX idx_calendar_end ON calendar_events("end");
CREATE INDEX idx_calendar_status ON calendar_events(status);

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  due_date TIMESTAMPTZ,
  project_id TEXT,
  labels TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_tasks_completed ON tasks(completed);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- ============================================
-- PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  completion_percent INTEGER DEFAULT 0 CHECK (completion_percent >= 0 AND completion_percent <= 100),
  revenue DECIMAL(10,2),
  cost DECIMAL(10,2),
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_priority ON projects(priority);

-- ============================================
-- PROJECT FILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_files (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_project_files_project ON project_files(project_id);

-- ============================================
-- AI CONVERSATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_ai_conversations_session ON ai_conversations(session_id);
CREATE INDEX idx_ai_conversations_created ON ai_conversations(created_at DESC);

-- ============================================
-- WEBHOOK LOGS TABLE (for debugging)
-- ============================================
CREATE TABLE IF NOT EXISTS webhook_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  webhook_type TEXT NOT NULL,
  request_url TEXT,
  request_method TEXT,
  request_body JSONB,
  response_status INTEGER,
  response_body JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_webhook_logs_type ON webhook_logs(webhook_type);
CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (for n8n webhooks)
-- In production, you'd want more restrictive policies

-- Allow anonymous read/write for emails (for n8n webhook)
CREATE POLICY "Allow anonymous access to emails" ON emails
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Allow anonymous read/write for calendar_events (for n8n webhook)
CREATE POLICY "Allow anonymous access to calendar_events" ON calendar_events
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Allow anonymous read/write for tasks
CREATE POLICY "Allow anonymous access to tasks" ON tasks
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Allow anonymous read/write for projects
CREATE POLICY "Allow anonymous access to projects" ON projects
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Allow anonymous read/write for project_files
CREATE POLICY "Allow anonymous access to project_files" ON project_files
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Allow anonymous read/write for ai_conversations
CREATE POLICY "Allow anonymous access to ai_conversations" ON ai_conversations
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Allow anonymous write for webhook_logs (read restricted)
CREATE POLICY "Allow anonymous write to webhook_logs" ON webhook_logs
  FOR INSERT TO anon WITH CHECK (true);

-- ============================================
-- FUNCTIONS FOR UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_emails_updated_at BEFORE UPDATE ON emails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();