-- Run this once in Supabase SQL Editor. It creates the private event schema.
CREATE SCHEMA IF NOT EXISTS events;

CREATE TABLE IF NOT EXISTS events.attendees (
  email TEXT PRIMARY KEY CHECK (email = lower(email)),
  coupon TEXT UNIQUE,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events.credits (
  code TEXT PRIMARY KEY,
  assigned_to TEXT UNIQUE REFERENCES events.attendees(email) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS credits_available_idx ON events.credits (created_at, code) WHERE assigned_to IS NULL;

CREATE TABLE IF NOT EXISTS events.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO events.attendees (email)
VALUES ('thisisshresth@gmail.com')
ON CONFLICT (email) DO NOTHING;
