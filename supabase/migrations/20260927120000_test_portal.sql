-- Run this once in Supabase SQL Editor. It creates the private event schema.
CREATE SCHEMA IF NOT EXISTS events_test;

CREATE TABLE IF NOT EXISTS events_test.attendees (
  email TEXT PRIMARY KEY CHECK (email = lower(email)),
  coupon TEXT UNIQUE,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events_test.credits (
  code TEXT PRIMARY KEY,
  assigned_to TEXT UNIQUE REFERENCES events_test.attendees(email) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS credits_available_idx ON events_test.credits (created_at, code) WHERE assigned_to IS NULL;

CREATE TABLE IF NOT EXISTS events_test.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

BEGIN;
-- Preserve existing approvals and claims; new self-service requests start pending.
ALTER TABLE events_test.attendees ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE events_test.attendees ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected'));
ALTER TABLE events_test.attendees ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE events_test.attendees ADD COLUMN IF NOT EXISTS approval_source TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE events_test.attendees ADD COLUMN IF NOT EXISTS community_step INTEGER NOT NULL DEFAULT 0 CHECK (community_step BETWEEN 0 AND 2);
ALTER TABLE events_test.attendees ADD COLUMN IF NOT EXISTS opened_step INTEGER NOT NULL DEFAULT 0 CHECK (opened_step BETWEEN 0 AND 2);
CREATE TABLE IF NOT EXISTS events_test.email_aliases (
 email TEXT PRIMARY KEY CHECK (email = lower(email)),
 attendee_email TEXT NOT NULL REFERENCES events_test.attendees(email),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS events_test.audit_log (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 action TEXT NOT NULL, email TEXT, details TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS events_test.rate_limits (
 key TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS attendee_status_idx ON events_test.attendees(status, created_at);
CREATE INDEX IF NOT EXISTS aliases_attendee_idx ON events_test.email_aliases(attendee_email);
ALTER TABLE events_test.attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE events_test.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE events_test.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE events_test.email_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE events_test.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE events_test.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA events_test FROM PUBLIC;
-- Use a server-side Postgres role with BYPASSRLS, never a browser/Data API client.
INSERT INTO events_test.settings(key,value) VALUES
('quicksort_linkedin','https://www.linkedin.com/company/quicksort-sas'),
('cerebras_discord','https://discord.com/invite/ZqvYS2e2rY?utm_source=luma')
ON CONFLICT(key) DO NOTHING;
COMMIT;

BEGIN;
ALTER TABLE events_test.credits ADD COLUMN IF NOT EXISTS api_link TEXT UNIQUE;
ALTER TABLE events_test.attendees ADD COLUMN IF NOT EXISTS api_link TEXT UNIQUE;
COMMIT;
