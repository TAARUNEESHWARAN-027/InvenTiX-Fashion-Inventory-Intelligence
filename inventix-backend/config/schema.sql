-- ============================================================
-- InvenTiX — PostgreSQL Schema
-- Run this file once to initialise the database.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. manufacturers
-- ============================================================
CREATE TABLE IF NOT EXISTS manufacturers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  city            VARCHAR(100),
  state           VARCHAR(100),
  category_focus  VARCHAR(255),
  tier            VARCHAR(50),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manufacturers_created_at ON manufacturers (created_at);

-- ============================================================
-- 2. retailers
-- ============================================================
CREATE TABLE IF NOT EXISTS retailers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  city          VARCHAR(100),
  state         VARCHAR(100),
  credit_limit  DECIMAL(14, 2) NOT NULL DEFAULT 0,
  credit_used   DECIMAL(14, 2) NOT NULL DEFAULT 0,
  risk_score    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retailers_created_at ON retailers (created_at);

-- ============================================================
-- 3. skus
-- ============================================================
CREATE TABLE IF NOT EXISTS skus (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID NOT NULL REFERENCES manufacturers (id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  category        VARCHAR(100),
  season          VARCHAR(100),
  base_price      DECIMAL(10, 2),
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skus_manufacturer_id ON skus (manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_skus_created_at      ON skus (created_at);

-- ============================================================
-- 4. sku_variants
-- ============================================================
CREATE TABLE IF NOT EXISTS sku_variants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id        UUID NOT NULL REFERENCES skus (id) ON DELETE CASCADE,
  colour        VARCHAR(100),
  size          VARCHAR(20),
  current_stock INT NOT NULL DEFAULT 0,
  last_updated  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sku_variants_sku_id ON sku_variants (sku_id);

-- ============================================================
-- 5. shipments
-- ============================================================
CREATE TABLE IF NOT EXISTS shipments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id   UUID NOT NULL REFERENCES manufacturers (id) ON DELETE CASCADE,
  retailer_id       UUID NOT NULL REFERENCES retailers (id) ON DELETE CASCADE,
  shipped_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_units       INT NOT NULL,
  credit_terms_days INT NOT NULL DEFAULT 45
);

CREATE INDEX IF NOT EXISTS idx_shipments_manufacturer_id ON shipments (manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_shipments_retailer_id     ON shipments (retailer_id);

-- ============================================================
-- 6. shipment_lines
-- ============================================================
CREATE TABLE IF NOT EXISTS shipment_lines (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id      UUID NOT NULL REFERENCES shipments (id) ON DELETE CASCADE,
  variant_id       UUID NOT NULL REFERENCES sku_variants (id) ON DELETE CASCADE,
  quantity_shipped INT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shipment_lines_shipment_id ON shipment_lines (shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_lines_variant_id  ON shipment_lines (variant_id);

-- ============================================================
-- 7. sell_through_events
-- ============================================================
CREATE TABLE IF NOT EXISTS sell_through_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id  UUID NOT NULL REFERENCES sku_variants (id) ON DELETE CASCADE,
  retailer_id UUID NOT NULL REFERENCES retailers (id) ON DELETE CASCADE,
  units_sold  INT NOT NULL,
  sold_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source      VARCHAR(50)                            -- 'POS' | 'manual'
);

CREATE INDEX IF NOT EXISTS idx_sell_through_variant_id  ON sell_through_events (variant_id);
CREATE INDEX IF NOT EXISTS idx_sell_through_retailer_id ON sell_through_events (retailer_id);
CREATE INDEX IF NOT EXISTS idx_sell_through_sold_at     ON sell_through_events (sold_at);

-- ============================================================
-- 8. stock_updates
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_updates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id     UUID NOT NULL REFERENCES sku_variants (id) ON DELETE CASCADE,
  updated_by     UUID,                                    -- references users.id (non-enforced, allows bootstrap)
  quantity_delta INT NOT NULL,
  reason_code    VARCHAR(100),
  ip_address     VARCHAR(50),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_updates_variant_id  ON stock_updates (variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_updates_created_at  ON stock_updates (created_at);

-- ============================================================
-- 9. anomaly_flags
-- ============================================================
CREATE TABLE IF NOT EXISTS anomaly_flags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   VARCHAR(50),                             -- 'manufacturer' | 'retailer' | 'sku_variant'
  entity_id     UUID,
  anomaly_type  VARCHAR(100),
  severity      VARCHAR(20),                             -- 'critical' | 'high' | 'medium' | 'low'
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected' | 'escalated'
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomaly_flags_entity_id  ON anomaly_flags (entity_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_flags_created_at ON anomaly_flags (created_at);

-- ============================================================
-- 10. credit_events
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id     UUID NOT NULL REFERENCES retailers (id) ON DELETE CASCADE,
  manufacturer_id UUID NOT NULL REFERENCES manufacturers (id) ON DELETE CASCADE,
  event_type      VARCHAR(100),                          -- 'shipment_credit' | 'payment_received' | 'default'
  amount          DECIMAL(14, 2),
  balance_after   DECIMAL(14, 2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_events_retailer_id     ON credit_events (retailer_id);
CREATE INDEX IF NOT EXISTS idx_credit_events_manufacturer_id ON credit_events (manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_credit_events_created_at      ON credit_events (created_at);

-- ============================================================
-- 11. users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('manufacturer', 'retailer', 'admin')),
  entity_id     UUID,                                    -- FK to manufacturers.id or retailers.id based on role
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at);
