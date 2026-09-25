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

    -- El plan y los créditos del negocio. Arranca en cero y en el plan más chico: nadie tiene créditos
    -- que no haya cargado, y ningún negocio de prueba puede gastar de más.
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'base';
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS creditos INT NOT NULL DEFAULT 0;
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS zona TEXT NOT NULL DEFAULT '';
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS rubro TEXT NOT NULL DEFAULT '';

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

    -- ------------------------------ EL MOTOR: corridas, piezas y evaluación ------------------------------
    -- Una corrida es una vuelta del equipo de agentes sobre el negocio. Cada tarea es lo que hizo uno.
    CREATE TABLE IF NOT EXISTS corridas (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      motivo      TEXT NOT NULL DEFAULT 'investigacion',
      estado      TEXT NOT NULL DEFAULT 'corriendo',
      creditos    INT NOT NULL DEFAULT 0,
      empezada_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      terminada_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS tareas_corrida (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      corrida_id  UUID NOT NULL REFERENCES corridas(id) ON DELETE CASCADE,
      agente      TEXT NOT NULL,
      que         TEXT NOT NULL,
      resultado   JSONB NOT NULL DEFAULT '{}'::jsonb,
      creditos    INT NOT NULL DEFAULT 0,
      orden       INT NOT NULL DEFAULT 0
    );

    -- Los hallazgos del mercado, con su fuente: sin fuente, un hallazgo es una opinión.
    CREATE TABLE IF NOT EXISTS hallazgos (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      tipo        TEXT NOT NULL DEFAULT 'mercado',
      titulo      TEXT NOT NULL,
      dato        TEXT NOT NULL DEFAULT '',
      porque      TEXT NOT NULL DEFAULT '',
      fuente      TEXT NOT NULL DEFAULT '',
      corrida_id  UUID REFERENCES corridas(id) ON DELETE SET NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_hallazgos_business ON hallazgos(business_id, created_at DESC);

    -- Las piezas: lo que el motor escribe. La generación de video y de imagen entra por 'generacion'.
    CREATE TABLE IF NOT EXISTS piezas (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      titulo      TEXT NOT NULL DEFAULT '',
      formato     TEXT NOT NULL DEFAULT 'imagen',
      texto       TEXT NOT NULL DEFAULT '',
      guion       TEXT NOT NULL DEFAULT '',
      estado      TEXT NOT NULL DEFAULT 'borrador',
      generacion  JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_piezas_business ON piezas(business_id, created_at DESC);

    -- EL PÚBLICO: 500 agentes por negocio, con su perfil. Es el panel que evalúa cada pieza.
    CREATE TABLE IF NOT EXISTS publico_agentes (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      numero       INT NOT NULL,
      nombre       TEXT NOT NULL,
      edad         INT NOT NULL,
      zona         TEXT NOT NULL,
      interes      TEXT NOT NULL,
      sensibilidad TEXT NOT NULL,
      estilo       TEXT NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (business_id, numero)
    );

    -- LA CALIBRACIÓN: cada agente sabe de qué segmento del público real viene y cuánto pesa. 'origen'
    -- dice de dónde salió el dato (propia = de las cuentas del negocio, inferida = del rubro,
    -- competencia = de los anuncios públicos). Sin esto, los 500 son inventados y repartidos parejo.
    ALTER TABLE publico_agentes ADD COLUMN IF NOT EXISTS segmento TEXT NOT NULL DEFAULT '';
    ALTER TABLE publico_agentes ADD COLUMN IF NOT EXISTS peso NUMERIC(6,5) NOT NULL DEFAULT 0;
    ALTER TABLE publico_agentes ADD COLUMN IF NOT EXISTS origen TEXT NOT NULL DEFAULT 'inferida';
    ALTER TABLE publico_agentes ADD COLUMN IF NOT EXISTS contexto TEXT NOT NULL DEFAULT '';
    ALTER TABLE publico_agentes ADD COLUMN IF NOT EXISTS genero TEXT NOT NULL DEFAULT '';

    CREATE INDEX IF NOT EXISTS idx_publico_business ON publico_agentes(business_id);

    -- LAS CUENTAS CONECTADAS: el token de Meta vive acá, del lado del servidor, y nunca sale en una
    -- respuesta ni viaja al navegador. Una fila por negocio y red.
    CREATE TABLE IF NOT EXISTS cuentas_conectadas (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      red          TEXT NOT NULL,
      external_id  TEXT NOT NULL DEFAULT '',
      nombre       TEXT NOT NULL DEFAULT '',
      token        TEXT NOT NULL DEFAULT '',
      token_expira TIMESTAMPTZ,
      permisos     TEXT[] NOT NULL DEFAULT '{}',
      estado       TEXT NOT NULL DEFAULT 'conectada',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (business_id, red)
    );

    -- Cada lectura de datos de la plataforma queda registrada: qué se pidió, si salió bien y qué se hizo
    -- con eso. Es la trazabilidad de la calibración automática.
    CREATE TABLE IF NOT EXISTS sincronizaciones (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      red         TEXT NOT NULL,
      que         TEXT NOT NULL DEFAULT 'insights',
      ok          BOOLEAN NOT NULL DEFAULT false,
      detalle     TEXT NOT NULL DEFAULT '',
      datos       JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_sincro_business ON sincronizaciones(business_id, created_at DESC);

    -- Cada calibración queda guardada: qué distribuciones se cargaron, de dónde salieron y cuándo. Es la
    -- trazabilidad del panel: si mañana cambia, se sabe con qué dato se armó el de hoy.
    CREATE TABLE IF NOT EXISTS calibraciones (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      origen      TEXT NOT NULL DEFAULT 'propia',
      fuente      TEXT NOT NULL DEFAULT '',
      segmentos   JSONB NOT NULL DEFAULT '[]'::jsonb,
      agentes     INT NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_calibraciones_business ON calibraciones(business_id, created_at DESC);

    -- La métrica real de la plataforma (alcance, guardados, clics, ventas), cuando llega: es contra esto
    -- que se mide el modelo, no contra su propia estimación.
    ALTER TABLE predicciones ADD COLUMN IF NOT EXISTS metrica_real NUMERIC(14,2);
    ALTER TABLE predicciones ADD COLUMN IF NOT EXISTS metrica_nombre TEXT NOT NULL DEFAULT '';

    -- Una evaluación de MiroFish: los 5 jueces y el público sobre una pieza.
    CREATE TABLE IF NOT EXISTS evaluaciones (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      pieza_id     UUID REFERENCES piezas(id) ON DELETE CASCADE,
      titulo       TEXT NOT NULL DEFAULT '',
      puntaje      NUMERIC(5,2) NOT NULL DEFAULT 0,
      orden        INT,
      total_publico INT NOT NULL DEFAULT 0,
      resumen      JSONB NOT NULL DEFAULT '{}'::jsonb,
      creditos     INT NOT NULL DEFAULT 0,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS votos_jueces (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      evaluacion_id UUID NOT NULL REFERENCES evaluaciones(id) ON DELETE CASCADE,
      juez          TEXT NOT NULL,
      criterio      TEXT NOT NULL,
      voto          INT NOT NULL,
      opinion       TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS opiniones_publico (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      evaluacion_id UUID NOT NULL REFERENCES evaluaciones(id) ON DELETE CASCADE,
      agente_numero INT NOT NULL,
      voto          INT NOT NULL,
      reaccion      TEXT NOT NULL DEFAULT 'indiferente',
      comentario    TEXT NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_opiniones_evaluacion ON opiniones_publico(evaluacion_id);

    -- LA PREDICCIÓN Y SU CORRECCIÓN: lo que el modelo dijo antes, lo que pasó después y el desvío.
    -- Es lo que permite decir «predijo 84, pasó 79: la próxima estima más cerca» con datos, no con relato.
    CREATE TABLE IF NOT EXISTS predicciones (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      evaluacion_id UUID REFERENCES evaluaciones(id) ON DELETE CASCADE,
      predicho      NUMERIC(6,2) NOT NULL,
      observado     NUMERIC(6,2),
      desvio_pct    NUMERIC(6,2),
      detalle       JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_predicciones_business ON predicciones(business_id, created_at DESC);

    -- Las campañas: lo que el negocio arma y el motor publica.
    CREATE TABLE IF NOT EXISTS campanas (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      nombre       TEXT NOT NULL DEFAULT '',
      forma        TEXT NOT NULL DEFAULT 'ventas',
      estado       TEXT NOT NULL DEFAULT 'borrador',
      presupuesto  NUMERIC(10,2) NOT NULL DEFAULT 0,
      destinos     TEXT[] NOT NULL DEFAULT '{}',
      objetivo     TEXT NOT NULL DEFAULT '',
      piezas       INT NOT NULL DEFAULT 0,
      roas         NUMERIC(6,2),
      gasto        NUMERIC(12,2) NOT NULL DEFAULT 0,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_campanas_business ON campanas(business_id, created_at DESC);

    -- El libro de créditos: cada consumo con su motivo. Nada se descuenta sin quedar escrito.
    CREATE TABLE IF NOT EXISTS movimientos_creditos (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      delta       INT NOT NULL,
      motivo      TEXT NOT NULL,
      detalle     TEXT NOT NULL DEFAULT '',
      saldo       INT NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_creditos_business ON movimientos_creditos(business_id, created_at DESC);

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
