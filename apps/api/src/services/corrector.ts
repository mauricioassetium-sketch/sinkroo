// =============================================================================================
// CORREGIR LO EVIDENTE, Y DECIRLO
//
// El material del negocio trae errores de tipeo —«geelos digitales» donde quería decir «gemelos
// digitales»— y la pieza se arma con SUS palabras: si se copia el error, el error sale publicado.
//
// Acá se corrigen solo las palabras que están a uno o dos cambios de una palabra que el motor YA
// midió: las del propio negocio (lo que ofrece, sus productos) y las de su categoría y su mercado, en
// todas sus lenguas. Cada corrección queda anotada y se muestra: el dueño ve qué se le cambió.
//
// NO es un corrector de ortografía general. Una palabra que no se parece a nada del vocabulario se
// deja como está —no se inventa una palabra que el negocio no dijo— y las diferencias de tilde solas
// no se tocan: quien escribe la pieza con tildes es el dueño, o el escritor cuando se conecte.
// =============================================================================================

export type Correccion = { de: string; a: string };

/** Las letras, sin tildes y en minúscula: para comparar sin que la tilde cuente como un cambio. */
const llano = (w: string): string =>
  w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Cuántos cambios hacen falta para pasar de una palabra a la otra (Levenshtein, cortado). */
function distancia(a: string, b: string, tope: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > tope) return tope + 1;
  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const actual = [i];
    let filaMin = i;
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(anterior[j] + 1, actual[j - 1] + 1, anterior[j - 1] + costo);
      actual.push(v);
      if (v < filaMin) filaMin = v;
    }
    if (filaMin > tope) return tope + 1;
    anterior = actual;
  }
  return anterior[b.length];
}

/** El vocabulario, armado con todo lo que el motor ya midió: palabras sueltas y frases. */
export function vocabularioDe(fuentes: (string | string[] | null | undefined)[]): string[] {
  const palabras = new Set<string>();
  for (const f of fuentes) {
    const lista = Array.isArray(f) ? f : [f];
    for (const t of lista) {
      const texto = String(t ?? '');
      for (const p of texto.split(/[^\p{L}\p{N}]+/u)) {
        const limpia = p.trim();
        if (limpia.length >= 4 && /\p{L}/u.test(limpia)) palabras.add(limpia);
      }
    }
  }
  return [...palabras];
}

/**
 * Corrige en el texto las palabras que están a uno o dos cambios de una del vocabulario medido.
 * Devuelve el texto corregido y la lista de cambios (una vez cada uno), para poder decirlos.
 */
export function corregirConVocabulario(texto: string, vocabulario: string[]): { texto: string; correcciones: Correccion[] } {
  const conocidas = new Set(vocabulario.map(llano));
  // Para buscar el parecido se compara contra las palabras del vocabulario sin tildes, guardando la
  // forma tal como se escribió (así «gemelos» sale como está en el vocabulario, no deformada).
  const porLlano = new Map<string, string>();
  for (const v of vocabulario) {
    const k = llano(v);
    if (!porLlano.has(k)) porLlano.set(k, v);
  }

  const correcciones: Correccion[] = [];
  const vistos = new Set<string>();
  const corregido = String(texto ?? '').replace(/[\p{L}\p{N}]+/gu, (palabra) => {
    if (palabra.length < 4 || !/\p{L}/u.test(palabra)) return palabra;
    const base = llano(palabra);
    // Si la palabra existe en el vocabulario, no se toca: el negocio la escribió bien.
    if (conocidas.has(base)) return palabra;
    const tope = palabra.length <= 4 ? 1 : 2;
    let mejor: { forma: string; d: number } | null = null;
    for (const [k, forma] of porLlano) {
      if (Math.abs(k.length - base.length) > tope) continue;
      // Y se exige que empiecen igual: sin eso, «geelos» podía terminar en cualquier palabra parecida.
      if (k[0] !== base[0]) continue;
      const d = distancia(base, k, tope);
      if (d >= 1 && d <= tope && (!mejor || d < mejor.d)) mejor = { forma, d };
      if (d === 1) break;
    }
    if (!mejor) return palabra;
    // Se conserva la forma en que estaba escrita en el texto: si iba en minúscula, queda en minúscula;
    // si empezaba con mayúscula, sale con mayúscula. La palabra corregida no cambia cómo se lee.
    const enMayuscula = /^[A-ZÁÉÍÓÚÑ]/.test(palabra);
    const enMinuscula = /^[a-záéíóúñ]/.test(palabra);
    const base2 = mejor.forma;
    const nueva = enMayuscula
      ? base2.charAt(0).toUpperCase() + base2.slice(1).toLowerCase()
      : enMinuscula ? base2.charAt(0).toLowerCase() + base2.slice(1) : base2;
    if (!vistos.has(`${base}|${llano(nueva)}`)) {
      vistos.add(`${base}|${llano(nueva)}`);
      correcciones.push({ de: palabra, a: nueva });
    }
    return nueva;
  });

  return { texto: corregido, correcciones };
}
