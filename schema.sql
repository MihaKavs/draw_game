-- D1 schema for Dnevna risba
-- Run once: npx wrangler d1 execute dnevna-risba --file=./schema.sql
-- Or in dashboard: D1 → your DB → Console

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  word TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS drawings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  prompt_id TEXT NOT NULL,
  prompt_word TEXT NOT NULL,
  image_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_drawings_prompt ON drawings(prompt_id);
CREATE INDEX IF NOT EXISTS idx_drawings_user ON drawings(user_id);

CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  drawing_id TEXT NOT NULL,
  voter_id TEXT NOT NULL,
  rank INTEGER NOT NULL CHECK (rank IN (1, 2, 3)),
  prompt_id TEXT NOT NULL,
  UNIQUE (voter_id, prompt_id, rank)
);

CREATE INDEX IF NOT EXISTS idx_votes_prompt ON votes(prompt_id);
CREATE INDEX IF NOT EXISTS idx_votes_drawing ON votes(drawing_id);
