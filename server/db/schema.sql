-- ---------------------------------------------------------------------------
-- schema.sql
-- ---------------------------------------------------------------------------
-- EERoom database schema (PostgreSQL / Supabase).
--
-- Run this once in the Supabase SQL Editor when setting up a new project.
-- It creates the two application tables EERoom uses:
--
--   users     - application-level profile row, one per registered account.
--               The real password hash lives in Supabase Auth's own
--               auth.users table; this table mirrors the same UUID so that
--               projects can reference a user with a normal foreign key.
--   projects  - one saved tool state per row. The tool-specific state
--               (resistance values, waveform settings, gate layout) is kept
--               as JSONB so all three tools share one table.
--
-- gen_random_uuid() needs no extension: it has been part of core PostgreSQL
-- since version 13, and Supabase runs 15. (Older PostgreSQL installs would
-- need CREATE EXTENSION pgcrypto first.) Verified against PostgreSQL 16.
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  user_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            VARCHAR(255) UNIQUE NOT NULL,
  password_hash    VARCHAR(255) NOT NULL,
  full_name        VARCHAR(100),
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE projects (
  project_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  tool_type     VARCHAR(20) NOT NULL CHECK (tool_type IN ('ohm','logic','wave')),
  project_data  JSONB NOT NULL,
  share_token   VARCHAR(64) UNIQUE,
  is_shared     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GET /projects lists every project belonging to one user, so user_id is the
-- column that gets filtered on most often. share_token does not need an
-- explicit index: its UNIQUE constraint already creates one, which is what
-- GET /share/:token looks up against.
CREATE INDEX idx_projects_user_id ON projects(user_id);
