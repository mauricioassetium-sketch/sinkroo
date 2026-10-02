// =====================================================================================================
// LOS PAÍSES — el nombre y el código de dos letras, en un solo lugar.
//
// POR QUÉ EXISTE
//
// El cliente declara su país en Primeros pasos de dos maneras: escribiendo el código («AE») o el nombre
// («Emiratos Árabes Unidos»), y a veces el motor lo deduce del material. El estudio del mapa
// (`leerMapaReal`) y la lectura de anuncios necesitan el nombre para ubicar el lugar, y las tablas
// guardan el código. Sin una sola tabla, cada parte traduce a su manera y «Emiratos Árabes Unidos»
// termina buscándose distinto en cada lado.
//
// La lista es corta a propósito: los países donde el producto ya tiene negocios y los que el asistente
// sugiere. Un país que no esté acá no se inventa: se devuelve el código tal cual, que Nominatim entiende.
// =====================================================================================================

/** Código ISO de dos letras → nombre como se dice en español. */
export const PAISES: Record<string, string> = {
  AR: 'Argentina', AU: 'Australia', BO: 'Bolivia', BR: 'Brasil', CA: 'Canadá', CL: 'Chile',
  CN: 'China', CO: 'Colombia', CR: 'Costa Rica', DE: 'Alemania', DO: 'República Dominicana',
  EC: 'Ecuador', EG: 'Egipto', ES: 'España', FR: 'Francia', GB: 'Reino Unido', GT: 'Guatemala',
  HN: 'Honduras', IN: 'India', IT: 'Italia', JP: 'Japón', MA: 'Marruecos', MX: 'México',
  NI: 'Nicaragua', NL: 'Países Bajos', PA: 'Panamá', PE: 'Perú', PR: 'Puerto Rico', PT: 'Portugal',
  PY: 'Paraguay', QA: 'Catar', SA: 'Arabia Saudita', SE: 'Suecia', SG: 'Singapur', SV: 'El Salvador',
  TR: 'Turquía', US: 'Estados Unidos', UY: 'Uruguay', VE: 'Venezuela', AE: 'Emiratos Árabes Unidos',
};

/** Cómo se escribe cada nombre en el material del negocio → su código. */
const CODIGO_DE: Record<string, string> = Object.fromEntries(
  Object.entries(PAISES).map(([c, n]) => [n.toLowerCase(), c]),
);

/** Varios nombres como se escriben de verdad (sin tilde, en corto, en inglés). */
const ALIAS: Record<string, string> = {
  'estados unidos': 'US', usa: 'US', 'ee uu': 'US', 'eeuu': 'US', 'united states': 'US',
  'reino unido': 'GB', uk: 'GB', 'united kingdom': 'GB', inglaterra: 'GB',
  'emiratos arabes unidos': 'AE', 'emiratos arabes': 'AE', uae: 'AE', dubai: 'AE', emiratos: 'AE',
  espana: 'ES', mexico: 'MX', brasil: 'BR', panama: 'PA', peru: 'PE', japon: 'JP',
  'arabia saudi': 'SA', catar: 'QA', qatar: 'QA', turquia: 'TR', canada: 'CA',
};

const sinTildes = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/**
 * El nombre del país a partir de su código de dos letras. Si no está en la lista, devuelve el código:
 * Nominatim entiende «XK» o lo que sea mejor que un nombre inventado.
 */
export function nombreDePais(codigo: unknown): string {
  const c = String(codigo ?? '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return '';
  return PAISES[c] || c;
}

/**
 * El código de dos letras a partir de lo que escribió el cliente: «Colombia», «colombia», «CO», «Dubai».
 * Devuelve '' si no se reconoce — el asistente guarda entonces lo que escribió, tal cual.
 */
export function codigoDePais(texto: unknown): string {
  const t = sinTildes(String(texto ?? ''));
  if (!t) return '';
  if (/^[a-z]{2}$/.test(t)) return t.toUpperCase();
  return CODIGO_DE[t] || ALIAS[t] || '';
}

/** El país tal como lo escribió el cliente, para mostrarlo en pantalla sin traicionar lo que dijo. */
export function comoLoEscribio(texto: unknown): string {
  return String(texto ?? '').trim().slice(0, 60);
}

/**
 * LA ZONA A PARTIR DE LOS LUGARES QUE NOMBRA EL MATERIAL — para cuando el negocio no la declaró.
 *
 * El motor lee el material del negocio (su web, sus archivos) y de ahí saca los lugares que nombra. Eso ya
 * se usaba para elegir en qué países buscar los anuncios, pero NO escribía la zona del negocio, y la zona es
 * justo lo que el estudio del mapa geocodifica: con la web diciendo «Dubai» y la zona vacía, el negocio se
 * quedaba sin estudio de su mercado y el programador ni lo miraba (sólo corre para negocios con zona).
 *
 * «Dubai» resuelve al país por su alias, y se guardan los dos («Dubai, Emiratos Árabes Unidos») porque el
 * mapa ubica mejor el lugar con su país que el país solo. Un lugar que no se reconoce se guarda tal cual: el
 * mapa lo intenta y, si no lo ubica, lo dice en vez de inventar.
 */
export function zonaDeLugares(lugares: unknown): string {
  const lista = (Array.isArray(lugares) ? lugares : []).map(l => String(l ?? '').trim()).filter(Boolean);
  for (const lugar of lista.slice(0, 4)) {
    const codigo = codigoDePais(lugar);
    if (!codigo) continue;
    const pais = nombreDePais(codigo);
    return sinTildes(lugar) === sinTildes(pais) ? pais : `${lugar}, ${pais}`;
  }
  return lista[0] ? lista[0].slice(0, 80) : '';
}
