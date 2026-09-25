import type { Pool } from 'pg';

/**
 * Creative generation service (M4).
 *
 * Takes a productId, loads the product + its business from the DB (M1),
 * builds the brief and delegates generation to GaiaBroker. Returns the copy
 * variants. The API only translates data and acts as a bridge.
 *
 * SEGURIDAD: la consulta pide el `businessId` y lo filtra. Antes se buscaba sólo por `id`: con un
 * `productId` ajeno, el generador leía el nombre, la propuesta y el negocio de OTRO cliente y escribía
 * a partir de ellos. Sin negocio, no hay producto.
 */

export interface GeneratedCreative {
  copy: string;
}

export interface GenerateInput {
  productId: string;
  count?: number;
  /** El negocio de la sesión: el producto tiene que ser suyo. */
  businessId?: string;
}

export interface GenerateResult {
  productId: string;
  variants: string[];
  brain: string;
  count: number;
}

const BROKER_URL = process.env.BROKER_URL ?? 'http://127.0.0.1:3100';

export async function generateForProduct(db: Pool, input: GenerateInput): Promise<GenerateResult> {
  const { productId, count = 5, businessId } = input;

  // 1) Load product + business (M1), acotado al negocio que pide
  const prod = await db.query(
    `SELECT p.*, b.description AS business_description, b.audience AS business_audience,
            b.tone AS business_tone, b.name AS business_name
       FROM products p JOIN businesses b ON b.id = p.business_id
      WHERE p.id = $1 AND ($2::uuid IS NULL OR p.business_id = $2::uuid)`,
    [productId, businessId ?? null],
  );
  if (prod.rows.length === 0) throw new Error('product not found');
  const p = prod.rows[0];

  // 2) Build the brief for the broker
  const brief = {
    productName: p.name,
    usp: p.usp || p.offer || p.business_description || '',
    offer: p.offer || undefined,
    audience: p.business_audience || undefined,
    tone: p.business_tone || undefined,
    channel: 'meta',
    cta: p.cta || undefined,
  };

  // 3) Delegate generation to the broker (HTTP)
  const res = await fetch(`${BROKER_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...brief, count }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Broker responded ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as { variants: string[]; brain: string; count: number };
  return { productId, variants: data.variants, brain: data.brain, count: data.count };
}
