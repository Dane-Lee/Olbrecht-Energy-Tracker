-- Olbrecht Energy Tracker — SQLite schema.
-- Storage strategy: each domain aggregate is persisted as a JSON document
-- (the `document` column) with a handful of extracted, indexed columns for
-- querying. The locked @/domain TypeScript types remain authoritative; this
-- avoids shredding 50+ nested interfaces into relational tables.

CREATE TABLE IF NOT EXISTS athletes (
  id                        TEXT PRIMARY KEY,
  source_app                TEXT NOT NULL,
  given_name                TEXT NOT NULL,
  family_name               TEXT NOT NULL,
  global_readiness_category TEXT,
  taper_active              INTEGER NOT NULL DEFAULT 0,
  document                  TEXT NOT NULL,
  created_at                TEXT NOT NULL,
  updated_at                TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS session_plans (
  id                     TEXT PRIMARY KEY,
  athlete_id             TEXT NOT NULL,
  intended_session_class TEXT,
  start_timestamp        TEXT,
  document               TEXT NOT NULL,
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL,
  FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_responses (
  id              TEXT PRIMARY KEY,
  athlete_id      TEXT NOT NULL,
  linked_plan_id  TEXT,
  start_timestamp TEXT,
  document        TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS readiness_snapshots (
  id                        TEXT PRIMARY KEY,
  athlete_id                TEXT NOT NULL,
  captured_at               TEXT NOT NULL,
  global_readiness_category TEXT,
  document                  TEXT NOT NULL,
  FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE
);

-- Bidirectional sync log with Swim State Pro. idempotency_key dedupes
-- envelopes; status tracks the push/pull lifecycle.
CREATE TABLE IF NOT EXISTS sync_envelopes (
  idempotency_key TEXT PRIMARY KEY,
  payload_type    TEXT NOT NULL,
  direction       TEXT NOT NULL,
  status          TEXT NOT NULL,
  envelope        TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_plans_athlete ON session_plans (athlete_id);
CREATE INDEX IF NOT EXISTS idx_session_responses_athlete ON session_responses (athlete_id);
CREATE INDEX IF NOT EXISTS idx_readiness_athlete ON readiness_snapshots (athlete_id);
CREATE INDEX IF NOT EXISTS idx_sync_envelopes_status ON sync_envelopes (status);
