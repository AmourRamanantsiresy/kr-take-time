-- Cybera initial schema. Time-only accounting: balances and consumption
-- are seconds; there is intentionally no data/byte column anywhere.

CREATE TABLE users (
  id                BIGSERIAL PRIMARY KEY,
  username          TEXT NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  role              TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  remaining_seconds BIGINT NOT NULL DEFAULT 0,
  device_limit      INT NOT NULL DEFAULT 1 CHECK (device_limit >= 1),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE plans (
  id               BIGSERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  price            NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  device_limit     INT NOT NULL DEFAULT 1 CHECK (device_limit >= 1),
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE plan_requests (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  plan_id    BIGINT NOT NULL REFERENCES plans (id),
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by BIGINT REFERENCES users (id),
  decided_at TIMESTAMPTZ
);
CREATE INDEX idx_plan_requests_status ON plan_requests (status);
CREATE INDEX idx_plan_requests_user ON plan_requests (user_id);

CREATE TABLE vouchers (
  id               BIGSERIAL PRIMARY KEY,
  code             TEXT NOT NULL UNIQUE,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  device_limit     INT NOT NULL DEFAULT 1 CHECK (device_limit >= 1),
  status           TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'redeemed', 'expired')),
  created_by       BIGINT NOT NULL REFERENCES users (id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ,
  redeemed_by      BIGINT REFERENCES users (id),
  redeemed_at      TIMESTAMPTZ
);
CREATE INDEX idx_vouchers_status ON vouchers (status);

CREATE TABLE devices (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  mac        TEXT NOT NULL,
  label      TEXT,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, mac)
);
CREATE INDEX idx_devices_mac ON devices (mac);

CREATE TABLE sessions (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  device_mac       TEXT NOT NULL,
  ip               TEXT NOT NULL,
  opennds_token    TEXT,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at         TIMESTAMPTZ,
  seconds_consumed BIGINT NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'kicked')),
  -- reconciler bookkeeping: last time this session's consumption was settled
  last_tick        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_status ON sessions (status);
CREATE INDEX idx_sessions_user ON sessions (user_id);
CREATE INDEX idx_sessions_mac ON sessions (device_mac);
CREATE UNIQUE INDEX idx_sessions_active_mac ON sessions (device_mac) WHERE status = 'active';

CREATE TABLE audit_log (
  id            BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT REFERENCES users (id),
  action        TEXT NOT NULL,
  target        TEXT,
  meta          JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_created ON audit_log (created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log (action);
