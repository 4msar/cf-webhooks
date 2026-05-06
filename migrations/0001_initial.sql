-- Migration: 0001_initial
-- Creates core tables for the webhook dashboard

CREATE TABLE IF NOT EXISTS webhook_apps (
  id         INTEGER  PRIMARY KEY AUTOINCREMENT,
  name       TEXT     NOT NULL,
  slug       TEXT     NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id         INTEGER  PRIMARY KEY AUTOINCREMENT,
  app_id     INTEGER  NOT NULL,
  event_type TEXT,
  payload    TEXT     NOT NULL DEFAULT '{}',
  headers    TEXT     NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (app_id) REFERENCES webhook_apps(id) ON DELETE CASCADE
);

-- Index for fast per-app event lookups ordered by time
CREATE INDEX IF NOT EXISTS idx_events_app_created
  ON webhook_events(app_id, created_at DESC);
