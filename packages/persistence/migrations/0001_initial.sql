-- CrawlPay initial schema (v0).
--
-- Tables in scope: publishers, pricing_rules, crawlers, access_rules, receipts,
-- analytics_daily. Webhooks are deferred to v1. All amounts are stored as
-- BIGINT representing atomic USDC (6 decimals), so 1_000_000 = $1.00.
--
-- Hex columns (addresses, hashes, signatures) are stored as TEXT for v0
-- simplicity. We may move to BYTEA in v1 for storage efficiency.

CREATE TABLE publishers (
  id                    TEXT PRIMARY KEY,
  domain                TEXT NOT NULL UNIQUE,
  wallet_address        TEXT NOT NULL,
  erc8004_agent_id      TEXT,
  default_price_atomic  BIGINT NOT NULL DEFAULT 100,
  network               TEXT NOT NULL,
  min_reputation_score  INTEGER DEFAULT 0,
  robots_txt_aware      BOOLEAN NOT NULL DEFAULT TRUE,
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  description           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pricing_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id  TEXT NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL DEFAULT 0,
  url_pattern   TEXT NOT NULL,
  price_atomic  BIGINT NOT NULL,
  scheme        TEXT NOT NULL DEFAULT 'per-request',
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX pricing_rules_publisher_idx ON pricing_rules(publisher_id, position);

CREATE TABLE crawlers (
  wallet_address    TEXT PRIMARY KEY,
  erc8004_agent_id  TEXT,
  user_agent        TEXT,
  max_per_request   BIGINT NOT NULL DEFAULT 10000,
  daily_budget      BIGINT,
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE access_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id    TEXT NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  crawler_wallet  TEXT,
  rule_type       TEXT NOT NULL CHECK (rule_type IN ('allow', 'block', 'discount')),
  discount_bps    INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX access_rules_publisher_idx ON access_rules(publisher_id);

-- Every paid crawl produces one receipt row. authorization_nonce is the
-- primary key — single-use per EIP-3009 + UNIQUE in our store, which is the
-- second of three replay barriers (Redis cache is first, USDC contract is third).
CREATE TABLE receipts (
  authorization_nonce  TEXT PRIMARY KEY,
  publisher_id         TEXT NOT NULL,
  publisher_wallet     TEXT NOT NULL,
  crawler_wallet       TEXT NOT NULL,
  crawler_agent_id     TEXT,
  url                  TEXT NOT NULL,
  url_hash             TEXT NOT NULL,
  amount_atomic        BIGINT NOT NULL,
  network              TEXT NOT NULL,
  timestamp            BIGINT NOT NULL,
  facilitator_pubkey   TEXT NOT NULL,
  signature            TEXT NOT NULL,
  -- Backfilled by a worker once Gateway batches and Arc settles:
  batch_id             TEXT,
  onchain_tx_hash      TEXT,
  settled_at           TIMESTAMPTZ,
  inserted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX receipts_publisher_ts_idx ON receipts(publisher_id, timestamp DESC);
CREATE INDEX receipts_crawler_ts_idx   ON receipts(crawler_wallet, timestamp DESC);
CREATE INDEX receipts_ts_idx           ON receipts(timestamp DESC);

CREATE TABLE analytics_daily (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type           TEXT NOT NULL CHECK (entity_type IN ('publisher', 'crawler')),
  entity_id             TEXT NOT NULL,
  date                  DATE NOT NULL,
  total_revenue_atomic  BIGINT,
  total_spend_atomic    BIGINT,
  request_count         INTEGER,
  unique_counterparties INTEGER,
  UNIQUE (entity_type, entity_id, date)
);
