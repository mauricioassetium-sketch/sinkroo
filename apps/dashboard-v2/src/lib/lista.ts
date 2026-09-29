// =============================================================================================
// UNA LISTA, SIEMPRE.
//
// El back promete listas, pero un campo puede venir como texto —o no venir— y el panel no puede
// quedarse en blanco por eso: un .join sobre un texto tira abajo TODA la pantalla, porque el error
// sube hasta la raíz y React desmonta lo que había pintado. Pasó: «Contenido en sus redes» llegaba
// como texto cuando el mercado todavía no tenía formatos medidos, y Campañas quedó en blanco.
//
// Todo lo que el back manda para pintar como lista pasa por acá.
// =============================================================================================

/** El valor como lista de textos: si es lista se usa tal cual; si es un texto o un número, va solo. */
export const lista = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map(x => String(x))
    : (v === null || v === undefined || v === '' ? [] : [String(v)]);
