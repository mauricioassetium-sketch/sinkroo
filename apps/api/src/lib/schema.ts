import type { Pool } from 'pg';

// Sinkroo schema — English tables (code convention).
// M1 design: Business -> Product -> Creative -> SwarmResult

export type Industry =
  | 'real_estate' | 'beauty' | 'health' | 'ecommerce' | 'saas'
  | 'education' | 'food' | 'local_services' | 'fintech' | 'tourism'
  | 'automotive' | 'fitness' | 'legal' | 'construction' | 'transport'
  | 'energy' | 'entertainment' | 'retail' | 'hospitality'
  | 'commercial_real_estate' | 'other';

export type Category =
  | 'property' | 'beauty_session' | 'physical_product' | 'subscription_plan'
  | 'course' | 'bundle' | 'consultation' | 'booking' | 'event'
  | 'professional_service' | 'software' | 'promotion' | 'membership'
  | 'ticket' | 'other';

export interface Business {
  id: string;
  name: string;
  industry: Industry;
  description: string;
  audience: string;
  tone: string;
  channels: string[];
  logo: string | null;
  created_at: Date;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  category: Category;
  price: number | null;
  price_unit: string | null;
  offer: string;
  usp: string;
  cta: string;
  image_url: string | null;
  is_primary: boolean;
  created_at: Date;
}

export interface Conversation {
  id: string;
  business_id: string;
  lead_phone: string;
  stage: string;
  status: string;
  lead_score: number;
  last_message_at: Date;
  created_at: Date;
}

export interface ConversationMessageRow {
  id: string;
  conversation_id: string;
  sender: string;
  text: string;
  intent: string | null;
  created_at: Date;
}

export async function migrate(db: Pool): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS businesses (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        TEXT NOT NULL,
      industry    TEXT NOT NULL DEFAULT 'other',
      description TEXT NOT NULL,
      audience    TEXT NOT NULL DEFAULT '',
      tone        TEXT NOT NULL DEFAULT 'premium',
      channels    TEXT[] NOT NULL DEFAULT '{}',
      logo        TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS products (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      category    TEXT NOT NULL DEFAULT 'other',
      price       NUMERIC(14,2),
      price_unit  TEXT,
      offer       TEXT NOT NULL DEFAULT '',
      usp         TEXT NOT NULL DEFAULT '',
      cta         TEXT NOT NULL DEFAULT '',
      image_url   TEXT,
      is_primary  BOOLEAN NOT NULL DEFAULT false,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);

    CREATE TABLE IF NOT EXISTS conversations (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
      lead_phone      TEXT NOT NULL,
      stage           TEXT NOT NULL DEFAULT 'greeting',
      status          TEXT NOT NULL DEFAULT 'active',
      lead_score      INT  NOT NULL DEFAULT 0,
      last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS conversation_messages (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender          TEXT NOT NULL,
      text            TEXT NOT NULL,
      intent          TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );


    -- ---------------------------------- FASE 1: cuentas y onboarding ----------------------------------
    -- Un correo es una cuenta, para siempre: lo pidió el dueño. El correo va en minúsculas y con UNIQUE.
    CREATE TABLE IF NOT EXISTS users (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email       TEXT NOT NULL UNIQUE,
      nombre      TEXT NOT NULL DEFAULT '',
      clave_hash  TEXT,
      via         TEXT NOT NULL DEFAULT 'email',
      business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      expira_at  TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    -- El onboarding vive en una sola fila por negocio y con JSONB: los campos son abiertos (el dueño los
    -- escribe con sus palabras), así que agregar una pregunta no puede costar una migración.
    CREATE TABLE IF NOT EXISTS onboarding (
      business_id  UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
      datos        JSONB NOT NULL DEFAULT '{}'::jsonb,
      hechos       INT[] NOT NULL DEFAULT '{}',
      arrancado    BOOLEAN NOT NULL DEFAULT false,
      arrancado_at TIMESTAMPTZ,
      actualizado  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Cada paso de la ingesta, con lo que el motor entendió. Se guarda el archivo como referencia.
    CREATE TABLE IF NOT EXISTS archivos (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      nombre      TEXT NOT NULL,
      tipo        TEXT NOT NULL DEFAULT 'otro',
      peso        BIGINT NOT NULL DEFAULT 0,
      ruta        TEXT,
      extracto    TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_archivos_business ON archivos(business_id);

    CREATE INDEX IF NOT EXISTS idx_conversations_lead ON conversations(lead_phone);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON conversation_messages(conversation_id, created_at);
  `);
}

// ---------------------------------- FASE 1: cuentas y onboarding ----------------------------------

export interface User {
  id: string;
  email: string;
  nombre: string;
  via: 'email' | 'google';
  business_id: string | null;
  created_at: Date;
}

export interface Session {
  token: string;
  user_id: string;
  expira_at: Date;
}

export interface Onboarding {
  business_id: string;
  /** Los campos abiertos del onboarding, tal como los escribió el negocio. */
  datos: Record<string, unknown>;
  /** Los pasos que el negocio dio por hechos (1 a 5). */
  hechos: number[];
  arrancado: boolean;
  arrancado_at: Date | null;
  actualizado: Date;
}
