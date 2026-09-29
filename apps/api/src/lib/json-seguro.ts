// =============================================================================================
// UN DATO RARO NO PUEDE TUMBAR UNA CORRIDA
//
// Los anuncios que se leen traen caracteres cortados: emojis partidos por la mitad (pares surrogados
// sueltos) y caracteres de control. Al guardar, JSON.stringify deja esos sueltos como \ud835 y Postgres
// rechaza el JSON completo —«Unicode low surrogate must follow a high surrogate»—: un solo anuncio raro
// tiraba abajo la corrida entera o el informe del mercado. Se limpia acá, en un solo lugar y antes de
// guardar, para que ningún agente dependa de que el dato venga sano.
// =============================================================================================

/** Saca de un texto los caracteres de control y los pares surrogados sueltos (emojis cortados al medio). */
export const sinSueltos = (s: string): string =>
  s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, ' ')
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');

/** Lo mismo, sobre cualquier estructura (objetos, listas, textos). */
export const limpiar = <T,>(v: T): T => {
  if (typeof v === 'string') return sinSueltos(v) as unknown as T;
  if (Array.isArray(v)) return v.map(x => limpiar(x)) as unknown as T;
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) o[k] = limpiar(x);
    return o as T;
  }
  return v;
};

/** El JSON listo para guardar en Postgres: limpio de caracteres que rompen el guardado. */
export const aJson = (v: unknown): string => JSON.stringify(limpiar(v));
