// =====================================================================================================
// LAS PREGUNTAS DEL MOTOR — lo que le falta para trabajar y que sólo el cliente puede responder.
//
// POR QUÉ EXISTE
//
// El motor no puede inventar lo que no está en el material del cliente. Antes, si le faltaba un dato, se
// quedaba callado o sacaba una conclusión con lo que hubiera: un negocio sin ciudad nunca se investigaba, y
// uno de lujo en Dubái terminaba con el estudio de su mercado armado sobre una palabra que no era.
//
// El dueño lo pidió con estas palabras: «si la información no es suficiente el sistema debe ser inteligente y
// sacar un pop up y preguntar directo algo que no tenga; el usuario debe tener la capacidad de poder responder
// para resolver».
//
// CÓMO FUNCIONA
//
//   1. El motor, cuando necesita un dato y no lo tiene, llama a `pedirDato`: queda una pregunta abierta.
//   2. El panel la muestra (el pop up) y el cliente la contesta.
//   3. La respuesta se guarda DONDE EL MOTOR LA LEE (la columna o el campo del asistente que corresponde), así
//      que la próxima corrida ya trabaja con ella. No hay que volver a preguntar lo mismo.
//
// Una fila por dato (`clave`): si ya está contestado, `pedirDato` no molesta de nuevo.
// =====================================================================================================
import type { Pool } from 'pg';

export type DatoPedido = {
  businessId: string;
  clave: string;
  pregunta: string;
  porque: string;
  ejemplo?: string;
  opciones?: string[];
  corridaId?: string | null;
};

/**
 * El motor pide un dato. Si ya está contestado, no se toca nada; si la pregunta ya existía sin contestar, se
 * actualiza (el texto puede haber mejorado) en vez de acumular copias.
 */
export async function pedirDato(db: Pool, d: DatoPedido): Promise<void> {
  try {
    await db.query(
      `INSERT INTO preguntas_del_motor (business_id, clave, pregunta, porque, ejemplo, opciones, corrida_id)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
       ON CONFLICT (business_id, clave) DO UPDATE
          SET pregunta = EXCLUDED.pregunta, porque = EXCLUDED.porque, ejemplo = EXCLUDED.ejemplo,
              opciones = EXCLUDED.opciones, corrida_id = EXCLUDED.corrida_id
        WHERE preguntas_del_motor.respondida_at IS NULL`,
      [d.businessId, d.clave, d.pregunta, d.porque, d.ejemplo ?? '',
        d.opciones ? JSON.stringify(d.opciones) : null, d.corridaId ?? null],
    );
  } catch { /* si no se puede anotar la pregunta, la corrida sigue: nunca se cae por pedir un dato */ }
}

/** Las preguntas abiertas de un negocio, para el pop up del panel. */
export async function preguntasAbiertas(db: Pool, businessId: string) {
  const r = await db.query(
    `SELECT id, clave, pregunta, porque, ejemplo, opciones, created_at
       FROM preguntas_del_motor WHERE business_id = $1 AND respondida_at IS NULL
      ORDER BY created_at`, [businessId]);
  return r.rows;
}

/** Lo que el cliente ya contestó: el motor lo lee para no volver a preguntar lo mismo. */
export async function respuestasDelMotor(db: Pool, businessId: string): Promise<Record<string, string>> {
  try {
    const r = await db.query<{ clave: string; respuesta: string }>(
      `SELECT clave, respuesta FROM preguntas_del_motor
        WHERE business_id = $1 AND respondida_at IS NOT NULL AND coalesce(respuesta,'') <> ''`, [businessId]);
    return Object.fromEntries(r.rows.map(f => [f.clave, f.respuesta]));
  } catch { return {}; }
}

/**
 * Guarda la respuesta DONDE EL MOTOR LA LEE, según el dato que se pidió. Es lo que hace que responder sirva:
 * si la ciudad contestada no termina en la columna `zona`, la próxima corrida vuelve a no encontrarla.
 *
 * Devuelve una frase corta de qué quedó escrito, para que el panel lo muestre tal cual.
 */
export async function guardarRespuesta(db: Pool, businessId: string, clave: string, respuesta: string): Promise<string> {
  const limpio = String(respuesta || '').trim().slice(0, 300);

  if (clave === 'ciudad') {
    // La ciudad es lo que el mapa geocodifica: va al asistente (como la carga el cliente) y a la columna del
    // negocio, que es de donde la lee el estudio del mercado.
    await db.query(
      `INSERT INTO onboarding (business_id, datos) VALUES ($1, jsonb_build_object('ciudad', $2::text))
       ON CONFLICT (business_id) DO UPDATE SET datos = onboarding.datos || jsonb_build_object('ciudad', $2::text), actualizado = now()`,
      [businessId, limpio]);
    const pais = (await db.query<{ zona: string }>('SELECT coalesce(zona,\'\') AS zona FROM businesses WHERE id = $1', [businessId])).rows[0]?.zona || '';
    await db.query('UPDATE businesses SET zona = $2 WHERE id = $1', [businessId, pais.includes(',') ? `${limpio}, ${pais.split(',').pop()?.trim()}` : limpio]);
    return `su ciudad quedó como «${limpio}»: el motor ya puede ubicar su mercado`;
  }

  if (clave === 'pais' || clave === 'paises' || clave === 'mercados') {
    const lista = limpio.split(/[,·|]/).map(p => p.trim()).filter(Boolean);
    await db.query(
      `INSERT INTO onboarding (business_id, datos) VALUES ($1, jsonb_build_object('paises', $2::jsonb))
       ON CONFLICT (business_id) DO UPDATE SET datos = onboarding.datos || jsonb_build_object('paises', $2::jsonb), actualizado = now()`,
      [businessId, JSON.stringify(lista)]);
    return `los mercados de sus clientes quedaron como «${lista.join(', ')}»: es donde el motor sale a leer su rubro`;
  }

  // Cualquier otro dato va al asistente con su nombre: así queda guardado, visible y reutilizable.
  await db.query(
    `INSERT INTO onboarding (business_id, datos) VALUES ($1, jsonb_build_object($2::text, $3::text))
     ON CONFLICT (business_id) DO UPDATE SET datos = onboarding.datos || jsonb_build_object($2::text, $3::text), actualizado = now()`,
    [businessId, clave, limpio]);
  return `${clave} quedó como «${limpio}»`;
}
