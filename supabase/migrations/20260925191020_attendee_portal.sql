BEGIN;
-- Preserve existing approvals and claims; new self-service requests start pending.
ALTER TABLE events.attendees ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE events.attendees ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected'));
ALTER TABLE events.attendees ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE events.attendees ADD COLUMN IF NOT EXISTS approval_source TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE events.attendees ADD COLUMN IF NOT EXISTS community_step INTEGER NOT NULL DEFAULT 0 CHECK (community_step BETWEEN 0 AND 2);
ALTER TABLE events.attendees ADD COLUMN IF NOT EXISTS opened_step INTEGER NOT NULL DEFAULT 0 CHECK (opened_step BETWEEN 0 AND 2);
CREATE TABLE IF NOT EXISTS events.email_aliases (
 email TEXT PRIMARY KEY CHECK (email = lower(email)),
 attendee_email TEXT NOT NULL REFERENCES events.attendees(email),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS events.audit_log (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 action TEXT NOT NULL, email TEXT, details TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS events.rate_limits (
 key TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS attendee_status_idx ON events.attendees(status, created_at);
CREATE INDEX IF NOT EXISTS aliases_attendee_idx ON events.email_aliases(attendee_email);
ALTER TABLE events.attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE events.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE events.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE events.email_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE events.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE events.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA events FROM PUBLIC;
-- Use a server-side Postgres role with BYPASSRLS, never a browser/Data API client.
INSERT INTO events.settings(key,value) VALUES
('quicksort_linkedin','https://www.linkedin.com/company/quicksort-sas'),
('cerebras_discord','https://discord.com/invite/ZqvYS2e2rY?utm_source=luma')
ON CONFLICT(key) DO NOTHING;
COMMIT;
