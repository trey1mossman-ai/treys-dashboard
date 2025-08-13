-- Agent Control API Database Schema
-- This migration adds tables for audit logging and idempotency management

-- Audit log for all agent commands
CREATE TABLE IF NOT EXISTS agent_audit (
    id TEXT PRIMARY KEY,
    ts INTEGER NOT NULL, -- Unix timestamp
    actor TEXT NOT NULL, -- 'agent' or specific agent identifier
    tool TEXT NOT NULL, -- Tool name like 'agenda.create'
    args TEXT NOT NULL, -- JSON serialized arguments
    result TEXT, -- JSON serialized result
    status TEXT NOT NULL, -- 'ok', 'fail', 'retry'
    ip TEXT, -- IP address of request origin
    duration_ms INTEGER, -- Execution time in milliseconds
    error_code TEXT, -- Error code if failed
    error_message TEXT, -- Error message if failed
    idempotency_key TEXT, -- Associated idempotency key if provided
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for querying recent agent activity
CREATE INDEX IF NOT EXISTS idx_agent_audit_ts ON agent_audit(ts DESC);
CREATE INDEX IF NOT EXISTS idx_agent_audit_tool ON agent_audit(tool);
CREATE INDEX IF NOT EXISTS idx_agent_audit_status ON agent_audit(status);
CREATE INDEX IF NOT EXISTS idx_agent_audit_actor ON agent_audit(actor);

-- Idempotency keys to prevent duplicate operations
CREATE TABLE IF NOT EXISTS idempotency_keys (
    key TEXT PRIMARY KEY,
    ts INTEGER NOT NULL, -- Unix timestamp when created
    tool TEXT NOT NULL, -- Tool that was executed
    args_hash TEXT NOT NULL, -- Hash of arguments for validation
    result TEXT NOT NULL, -- Cached result to return on duplicate
    status_code INTEGER DEFAULT 200, -- HTTP status code
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for cleaning up old idempotency keys
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_ts ON idempotency_keys(ts);

-- Replay protection table (alternative to KV, stores signature+timestamp pairs)
CREATE TABLE IF NOT EXISTS replay_protection (
    signature_hash TEXT PRIMARY KEY,
    ts INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for cleaning up old replay entries
CREATE INDEX IF NOT EXISTS idx_replay_protection_ts ON replay_protection(ts);

-- Rate limiting table (if not using KV)
CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY, -- token:window or ip:window
    count INTEGER DEFAULT 0,
    window_start INTEGER NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for rate limit cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);