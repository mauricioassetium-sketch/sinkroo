/**
 * Core Stage 1 schema (adapted from spec v1.2, minimal tables to exercise the
 * end-to-end flow). The rest of the model (15 tables) is added in process. All
 * tables carry created_at and typed foreign keys.
 *
 * Used by `npm run migrate` to create the database from scratch (idempotent).
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  business_name TEXT,
  industry      TEXT,
  location      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  price       NUMERIC(12,2) NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'USD',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS creatives (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  copy       TEXT NOT NULL,
  image_url  TEXT,
  channel    TEXT NOT NULL DEFAULT 'meta',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS swarm_results (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id  UUID NOT NULL REFERENCES creatives(id) ON DELETE CASCADE,
  overall_score NUMERIC(5,2) NOT NULL,
  verdict      TEXT NOT NULL,
  dimension_scores JSONB NOT NULL,
  votes        JSONB NOT NULL,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;
