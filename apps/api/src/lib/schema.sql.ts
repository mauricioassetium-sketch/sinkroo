/**
 * Esquema núcleo de Etapa 1 (adaptado del spec v1.2, tablas mínimas para
 * ejercitar el flujo end-to-end). El resto del modelo (15 tablas) se añade en
 * proceso. Todas las tablas con created_at y claves foráneas tipadas.
 *
 * Usado por `npm run migrate` para crear la base desde cero (idempotente).
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
