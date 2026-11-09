-- v19: citizen signup verification by one-time code (SMS or email).
-- Apply with: npm run db:migrate:v19

ALTER TABLE users ADD COLUMN otp_pending INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS signup_otps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  destination TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_signup_otps_user ON signup_otps (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_signup_otps_dest ON signup_otps (destination, created_at);
