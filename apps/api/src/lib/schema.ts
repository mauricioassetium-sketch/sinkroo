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
    -- LA CATEGORÍA DEL NEGOCIO («luxury concierge», «asset verification»): la nombra el modelo a partir del
    -- material que sube el cliente. Se guarda como dato del negocio —no de la corrida— para que el estudio del
    -- mapa y la búsqueda de comparables la tengan siempre, aunque en una corrida el modelo no conteste.
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT '';

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

    -- LAS PREGUNTAS DEL MOTOR: lo que le falta para poder trabajar y que SÓLO EL CLIENTE puede responder.
    --
    -- POR QUÉ EXISTE: el motor no puede inventar lo que no está en el material. Antes, si le faltaba un dato
    -- —la ciudad, el mercado donde están sus clientes—, o se quedaba callado o sacaba una conclusión con lo
    -- que hubiera. El dueño lo pidió así: «si la información no es suficiente el sistema debe ser inteligente
    -- y preguntar directo algo que no tenga; el usuario debe poder responder para resolverlo».
    --
    -- Una fila por dato pedido (clave): si el motor vuelve a necesitar lo mismo y ya está contestado, se usa
    -- la respuesta; si no lo está, se actualiza la pregunta (no se acumulan copias).
    CREATE TABLE IF NOT EXISTS preguntas_del_motor (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      clave         TEXT NOT NULL,
      pregunta      TEXT NOT NULL,
      porque        TEXT NOT NULL DEFAULT '',
      ejemplo       TEXT NOT NULL DEFAULT '',
      opciones      JSONB,
      respuesta     TEXT,
      respondida_at TIMESTAMPTZ,
      corrida_id    UUID REFERENCES corridas(id) ON DELETE SET NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_preguntas_clave ON preguntas_del_motor(business_id, clave);
    CREATE INDEX IF NOT EXISTS idx_preguntas_abiertas ON preguntas_del_motor(business_id, respondida_at);

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

    -- LA RONDA: el motor no escribe una pieza suelta, escribe un lote de opciones distintas entre sí
    -- (otro ángulo, otro formato), cada una con su propia votación, y de ahí sale la que gana. La ronda
    -- guarda cuál ganó y cuánto costó, para poder volver a mirarla.
    CREATE TABLE IF NOT EXISTS rondas (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      corrida_id    UUID REFERENCES corridas(id) ON DELETE SET NULL,
      numero        INTEGER NOT NULL DEFAULT 1,
      piezas        INTEGER NOT NULL DEFAULT 0,
      evaluadas     INTEGER NOT NULL DEFAULT 0,
      ganadora_id   UUID REFERENCES piezas(id) ON DELETE SET NULL,
      ganadora_puntaje NUMERIC(6,2),
      creditos      INTEGER NOT NULL DEFAULT 0,
      detalle       JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_rondas_business ON rondas(business_id, numero DESC);

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
    -- De qué ronda salió cada pieza, y por dónde entró (su ángulo): sin esto, las 5 opciones de una ronda
    -- son indistinguibles entre sí y no se puede decir cuál ganó ni por qué.
    -- EL AVANCE EN VIVO DE UNA CORRIDA. La corrida nace con estado 'corriendo' y va latiendo mientras
    -- trabaja: el panel lee esto cada pocos segundos para mostrar la línea de carga y lo que está pasando.
    -- Sin esto, una ronda era una caja negra: la fila nacía al terminar y no había nada que mirar.
    -- OJO: acá adentro los comentarios son de SQL (--). Con // Postgres corta en el segundo carácter y la
    -- migración ENTERA falla; como está envuelta en try/catch, falla en silencio, con un solo aviso.
    ALTER TABLE corridas ADD COLUMN IF NOT EXISTS paso TEXT NOT NULL DEFAULT '';
    ALTER TABLE corridas ADD COLUMN IF NOT EXISTS detalle TEXT NOT NULL DEFAULT '';
    ALTER TABLE corridas ADD COLUMN IF NOT EXISTS paso_de INT NOT NULL DEFAULT 0;
    ALTER TABLE corridas ADD COLUMN IF NOT EXISTS pasos INT NOT NULL DEFAULT 0;
    ALTER TABLE corridas ADD COLUMN IF NOT EXISTS avance JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE corridas ADD COLUMN IF NOT EXISTS latido_at TIMESTAMPTZ;
    ALTER TABLE corridas ADD COLUMN IF NOT EXISTS ronda INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE tareas_corrida ADD COLUMN IF NOT EXISTS terminada_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE piezas ADD COLUMN IF NOT EXISTS ronda INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE piezas ADD COLUMN IF NOT EXISTS angulo TEXT NOT NULL DEFAULT '';

    ALTER TABLE publico_agentes ADD COLUMN IF NOT EXISTS segmento TEXT NOT NULL DEFAULT '';
    ALTER TABLE publico_agentes ADD COLUMN IF NOT EXISTS peso NUMERIC(6,5) NOT NULL DEFAULT 0;
    ALTER TABLE publico_agentes ADD COLUMN IF NOT EXISTS origen TEXT NOT NULL DEFAULT 'inferida';
    ALTER TABLE publico_agentes ADD COLUMN IF NOT EXISTS contexto TEXT NOT NULL DEFAULT '';
    ALTER TABLE publico_agentes ADD COLUMN IF NOT EXISTS genero TEXT NOT NULL DEFAULT '';

    CREATE INDEX IF NOT EXISTS idx_publico_business ON publico_agentes(business_id);

    -- EL INFORME COMPLETO DEL MERCADO (el patrón-modelo). Guarda lo que la investigación encontró para
    -- un negocio o para un rubro+ciudad: los jugadores, las piezas vivas que el mercado ya premió con
    -- tiempo, el patrón del rubro, los huecos y las propuestas. La columna claves son los rubros a los
    -- que aplica, para que un negocio del mismo rubro y la misma ciudad lo vea sin que se le corra de
    -- nuevo; origen dice de dónde salió ('negocio' = medido para este negocio, 'rubro' = medido para su
    -- rubro y su ciudad) y fuente de dónde salieron los datos. Sin fuente, no se muestra.
    CREATE TABLE IF NOT EXISTS mercado_informes (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
      rubro       TEXT NOT NULL DEFAULT '',
      ciudad      TEXT NOT NULL DEFAULT '',
      claves      TEXT[] NOT NULL DEFAULT '{}',
      origen      TEXT NOT NULL DEFAULT 'rubro',
      generado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      fuente      TEXT NOT NULL DEFAULT '',
      payload     JSONB NOT NULL DEFAULT '{}'::jsonb
    );

    CREATE INDEX IF NOT EXISTS idx_mercado_informes ON mercado_informes(ciudad, generado_at DESC);

    -- EL HISTÓRICO DE TENDENCIAS (Nova): qué se está hablando en cada país y en qué países aparece el
    -- mismo tema. Con esto se distingue lo local de lo regional y de lo global, y al día siguiente se ve
    -- qué tema era noticia de un día y cuál sigue: sin histórico, tendencia y ruido son lo mismo.
    CREATE TABLE IF NOT EXISTS tendencias (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id    UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      geo            TEXT NOT NULL DEFAULT '',
      tema           TEXT NOT NULL DEFAULT '',
      alcance        TEXT NOT NULL DEFAULT '',
      toca_el_rubro  BOOLEAN NOT NULL DEFAULT false,
      paises         TEXT[] NOT NULL DEFAULT '{}',
      fecha          DATE NOT NULL DEFAULT current_date,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (business_id, tema, fecha)
    );

    -- El país del negocio, en código de dos letras: con esto se prioriza lo que le sirve (lo que se habla
    -- en su país y lo regional) y se deja fuera lo que pasa en mercados que no son el suyo.
    ALTER TABLE tendencias ADD COLUMN IF NOT EXISTS pais TEXT NOT NULL DEFAULT '';

    CREATE INDEX IF NOT EXISTS idx_tendencias_business ON tendencias(business_id, fecha DESC);

    -- LAS SUSCRIPCIONES: el pedido de un plan y su activación. Nace cuando el negocio pide un plan y
    -- queda 'solicitada'; cuando el cobro se confirma (hoy a mano, mañana la pasarela) pasa a 'activa' y
    -- acredita los créditos del plan, que NO vencen (a diferencia de la bienvenida del primer mes).
    CREATE TABLE IF NOT EXISTS suscripciones (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      plan         TEXT NOT NULL DEFAULT '',
      precio       NUMERIC(10,2) NOT NULL DEFAULT 0,
      creditos     INT NOT NULL DEFAULT 0,
      estado       TEXT NOT NULL DEFAULT 'solicitada',
      nota         TEXT NOT NULL DEFAULT '',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      activada_at  TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_suscripciones_business ON suscripciones(business_id, created_at DESC);

    -- LOS ANUNCIOS LEÍDOS: lo que el trabajador de lectura saca de la Biblioteca de Anuncios de Meta,
    -- por palabra clave y por país. Es la materia prima del informe del mercado: quién anuncia, con qué
    -- copy, con qué botón y desde cuándo (los días corriendo son el filtro de calidad). Se guarda por
    -- (palabra, país, id del anuncio): si el anuncio vuelve a aparecer, se actualiza su lectura.
    CREATE TABLE IF NOT EXISTS anuncios_leidos (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
      palabra       TEXT NOT NULL DEFAULT '',
      pais          TEXT NOT NULL DEFAULT '',
      id_anuncio    TEXT NOT NULL DEFAULT '',
      anunciante    TEXT NOT NULL DEFAULT '',
      copy          TEXT NOT NULL DEFAULT '',
      cta           TEXT NOT NULL DEFAULT '',
      destino       TEXT NOT NULL DEFAULT '',
      fecha_inicio  TEXT NOT NULL DEFAULT '',
      plataformas   TEXT[] NOT NULL DEFAULT '{}',
      leido_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (palabra, pais, id_anuncio)
    );

    CREATE INDEX IF NOT EXISTS idx_anuncios_leidos ON anuncios_leidos(palabra, pais, leido_at DESC);

    -- LOS CRÉDITOS QUE VENCEN: los 5.000 de bienvenida valen el primer mes (30 días). Al vencer, lo que
    -- no se usó se retira con su propio movimiento, así el saldo y su historia siguen cuadrando. El que
    -- pagó un plan tiene créditos que no vencen: por eso la fecha va en el movimiento, no en el negocio.
    ALTER TABLE movimientos_creditos ADD COLUMN IF NOT EXISTS vence_at TIMESTAMPTZ;

    -- LOS PROMPTS DE GENERACIÓN: lo que el equipo de arte entrega para cada pieza y cada plaza. Todavía
    -- no hay generador de imagen ni de video conectado, así que esto es el CONTRATO: el día que exista,
    -- genera con esto y no con una idea suelta. Guarda el prompt (en inglés, listo para pegar), el
    -- negativo, los parámetros técnicos y el detalle completo (colores hex, tipografía, formato,
    -- escenas, estilo UGC o toma de producto).
    CREATE TABLE IF NOT EXISTS prompts_generacion (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      corrida_id      UUID REFERENCES corridas(id) ON DELETE SET NULL,
      pieza           TEXT NOT NULL DEFAULT '',
      plaza           TEXT NOT NULL DEFAULT '',
      tipo            TEXT NOT NULL DEFAULT 'imagen',
      estilo          TEXT NOT NULL DEFAULT '',
      proporcion      TEXT NOT NULL DEFAULT '',
      prompt          TEXT NOT NULL DEFAULT '',
      prompt_negativo TEXT NOT NULL DEFAULT '',
      parametros      JSONB NOT NULL DEFAULT '{}'::jsonb,
      detalle         JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_prompts_business ON prompts_generacion(business_id, created_at DESC);

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

    -- ---------------------------------- LAS REDES: lo que hacen falta para varias plataformas ----------------------------------
    -- Google y TikTok renuevan el token de acceso con un refresh_token (el de Google vence cada hora);
    -- y algunas redes guardan un dato extra que no es un secreto (el tipo de tienda, el id del canal).
    -- Van con ADD COLUMN IF NOT EXISTS para que la migración corra igual sobre una base que ya existe.
    -- Ninguna de estas columnas sale nunca en una respuesta: son del servidor.
    ALTER TABLE cuentas_conectadas ADD COLUMN IF NOT EXISTS refresh_token TEXT NOT NULL DEFAULT '';
    ALTER TABLE cuentas_conectadas ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE cuentas_conectadas ADD COLUMN IF NOT EXISTS actualizado TIMESTAMPTZ NOT NULL DEFAULT now();

    -- LAS MÉTRICAS REALES: lo que de verdad pasó en las plataformas —ventas de la tienda, vistas de los
    -- videos, clics y gasto de la pauta, conversiones del sitio—. Es la materia prima del backtest: sin
    -- esto, el modelo se compara consigo mismo. Cada fila lleva su fuente y, si la plataforma la da, la
    -- fecha en que pasó, porque una métrica sin fuente no se puede defender.
    CREATE TABLE IF NOT EXISTS metricas_reales (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      red         TEXT NOT NULL,
      pieza       TEXT NOT NULL DEFAULT '',
      metrica     TEXT NOT NULL,
      valor       NUMERIC(16,2) NOT NULL DEFAULT 0,
      fuente      TEXT NOT NULL DEFAULT '',
      cuando      TIMESTAMPTZ,
      datos       JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_metricas_business ON metricas_reales(business_id, created_at DESC);

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

    -- La métrica real de la plataforma (alcance, guardados, clics, ventas), cuando llega: es contra esto
    -- que se mide el modelo, no contra su propia estimación. Van DESPUÉS de crear la tabla: un ALTER sobre
    -- una tabla que todavía no existe corta toda la migración, y en una base nueva no se creaba nada de lo
    -- que viene más abajo.
    ALTER TABLE predicciones ADD COLUMN IF NOT EXISTS metrica_real NUMERIC(14,2);
    ALTER TABLE predicciones ADD COLUMN IF NOT EXISTS metrica_nombre TEXT NOT NULL DEFAULT '';

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

    -- ------------------- FASE 3: correo de la cuenta, verificación y PIN de seguridad -------------------
    -- POR QUÉ ESTAS CUATRO TABLAS
    --   · El correo de la cuenta es la llave de la cuenta (un correo, una cuenta). Por eso su confirmación se
    --     guarda como un hecho del negocio: «correo_verificado». Sin confirmar, el negocio no pierde nada —puede
    --     usar todo—, pero el panel lo dice en vez de dar por bueno un correo que nadie comprobó.
    --   · Cada envío queda en «correos_enviados», salió o no salió. Es la regla que no se rompe: si el correo no
    --     está configurado, NO se envía y queda escrito el intento con su motivo. Nunca se dice que se envió si
    --     no salió. En esa tabla va la plantilla y el asunto, NUNCA el cuerpo: adentro hay datos personales.
    --   · «verificaciones» guarda los enlaces de un solo uso (confirmar el correo y restablecer el PIN). El token
    --     se guarda hasheado: en la base no queda nada que sirva para abrir el enlace.
    --   · «pines» guarda el PIN hasheado con sal, con su contador de intentos fallidos y su bloqueo. Y
    --     «intentos_pin» es la auditoría: cada intento, con su hora, para poder revisar qué pasó.
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS correo_verificado BOOLEAN NOT NULL DEFAULT false;

    CREATE TABLE IF NOT EXISTS correos_enviados (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
      para        TEXT NOT NULL DEFAULT '',
      asunto      TEXT NOT NULL DEFAULT '',
      plantilla   TEXT NOT NULL DEFAULT '',
      ok          BOOLEAN NOT NULL DEFAULT false,
      motivo      TEXT NOT NULL DEFAULT '',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_correos_business ON correos_enviados(business_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS verificaciones (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      tipo        TEXT NOT NULL DEFAULT 'correo',
      token_hash  TEXT NOT NULL,
      -- El buscador: sha256 del token, para poder encontrar la fila sin recorrer la tabla. Un token de 32 bytes
      -- al azar no se puede adivinar, así que este índice no le quita seguridad a la huella con sal de al lado.
      busqueda    TEXT NOT NULL DEFAULT '',
      expira      TIMESTAMPTZ NOT NULL,
      usos        INT NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- El pin de 6 dígitos que llega en el mismo correo, para escribirlo en el panel: se guarda con huella
    -- con sal, igual que el token del enlace. En la base no queda ningún pin en claro.
    ALTER TABLE verificaciones ADD COLUMN IF NOT EXISTS codigo_hash TEXT NOT NULL DEFAULT '';

    CREATE INDEX IF NOT EXISTS idx_verificaciones_busqueda ON verificaciones(tipo, busqueda);
    CREATE INDEX IF NOT EXISTS idx_verificaciones_business ON verificaciones(business_id, tipo);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_verificaciones_token ON verificaciones(token_hash);

    CREATE TABLE IF NOT EXISTS pines (
      business_id       UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
      pin_hash          TEXT NOT NULL,
      creado            TIMESTAMPTZ NOT NULL DEFAULT now(),
      actualizado       TIMESTAMPTZ NOT NULL DEFAULT now(),
      intentos_fallidos INT NOT NULL DEFAULT 0,
      bloqueado_hasta   TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS intentos_pin (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      ok          BOOLEAN NOT NULL DEFAULT false,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_intentos_pin ON intentos_pin(business_id, created_at DESC);

    -- ------------------------------ CÓDIGOS DE ENTRADA ------------------------------
    -- Un código es la puerta de entrada al producto: lo entrega el dueño a un negocio concreto y sirve
    -- las veces que diga usos_max. La nota es cómo el dueño lo identifica («Skincare Natural · Ana») y
    -- es también lo que ve el negocio cuando el código se acepta.
    CREATE TABLE IF NOT EXISTS codigos_entrada (
      codigo      TEXT PRIMARY KEY,
      nota        TEXT NOT NULL DEFAULT '',
      usos_max    INT  NOT NULL DEFAULT 1,
      usos        INT  NOT NULL DEFAULT 0,
      business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
      usado_at    TIMESTAMPTZ,
      creado_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Un código puede servir para más de un negocio (usos_max > 1), así que codigos_entrada.business_id
    -- sólo alcanza para el ÚLTIMO que lo canjeó: con él, el primero de los dos volvería a ver el código
    -- como no reclamado y podría pedir otro. Esta tabla guarda un renglón por negocio que canjeó, y es la
    -- que responde «¿este negocio ya entró?». La columna usos sigue siendo el contador del código.
    CREATE TABLE IF NOT EXISTS codigos_entrada_usos (
      codigo      TEXT NOT NULL REFERENCES codigos_entrada(codigo) ON DELETE CASCADE,
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      usado_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (codigo, business_id)
    );

    CREATE INDEX IF NOT EXISTS idx_codigos_usos_business ON codigos_entrada_usos(business_id);
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
