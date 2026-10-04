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

/**
 * LOS PAÍSES DE CADA CONTINENTE — para cuando el negocio dice «vendo en Europa» y hay que leer su mercado en
 * los países que la forman. Las claves van sin tildes y en minúsculas (es como se comparan).
 */
export const PAISES_DEL_CONTINENTE: Record<string, string[]> = {
  latinoamerica: ['CO', 'MX', 'AR', 'CL', 'PE', 'BR', 'EC', 'PA'],
  'america del norte': ['US', 'CA', 'MX'],
  europa: ['ES', 'GB', 'DE', 'FR', 'IT', 'NL'],
  'medio oriente': ['AE', 'SA', 'QA', 'KW'],
  asia: ['SG', 'JP', 'IN', 'ID'],
  africa: ['ZA', 'NG', 'KE'],
  oceania: ['AU', 'NZ'],
};

/**
 * DÓNDE CAE CADA PAÍS EN EL MAPA — el centro del país, en latitud y longitud.
 *
 * Es para el mapa del motor: cada mercado que se está verificando se enciende en su lugar. Son centros
 * aproximados (a ojo de mapa alcanza) y están los países donde el producto ya trabaja.
 */
export const COORDENADAS: Record<string, [number, number]> = {
  AE: [23.9, 54.3], SA: [24.0, 45.0], QA: [25.3, 51.2], KW: [29.3, 47.5], OM: [21.0, 57.0],
  BH: [26.0, 50.5], IL: [31.4, 35.0], TR: [39.0, 35.2], EG: [26.8, 30.8], MA: [31.8, -7.1],
  ES: [40.4, -3.7], GB: [54.0, -2.0], DE: [51.2, 10.4], FR: [46.6, 2.4], IT: [41.9, 12.6],
  NL: [52.1, 5.3], PT: [39.4, -8.2], SE: [60.1, 18.6], PL: [51.9, 19.1], GR: [39.1, 21.8],
  US: [39.8, -98.6], CA: [56.1, -106.3], MX: [23.6, -102.6], CR: [9.7, -84.1] as [number, number],
  PA: [8.5, -80.8], DO: [18.7, -70.2], CO: [4.6, -74.3], VE: [6.4, -66.6], EC: [-1.8, -78.2],
  PE: [-9.2, -75.0], BO: [-16.3, -63.6], BR: [-14.2, -51.9], PY: [-23.4, -58.4], UY: [-32.5, -55.8],
  AR: [-38.4, -63.6], CL: [-35.7, -71.5], CN: [35.9, 104.2], IN: [20.6, 79.0], JP: [36.2, 138.3],
  SG: [1.4, 103.8], ID: [-0.8, 113.9], AU: [-25.3, 133.8], NZ: [-40.9, 174.9],
  ZA: [-30.6, 22.9], NG: [9.1, 8.7], KE: [-0.0, 37.9],
};

/** Las ciudades que se usan como plaza, para que el punto caiga en la ciudad y no en el centro del país. */
export const COORDENADAS_DE_CIUDAD: Record<string, [number, number]> = {
  dubai: [25.2048, 55.2708], dubái: [25.2048, 55.2708], 'abu dabi': [24.45, 54.38], 'abu dhabi': [24.45, 54.38],
  doha: [25.29, 51.53], riad: [24.71, 46.68], yeda: [21.49, 39.19], estambul: [41.01, 28.98],
  medellin: [6.24, -75.58], medellín: [6.24, -75.58], bogota: [4.71, -74.07], bogotá: [4.71, -74.07],
  cali: [3.45, -76.53], barranquilla: [10.96, -74.80], cartagena: [10.39, -75.51],
  'ciudad de mexico': [19.43, -99.13], cdmx: [19.43, -99.13], guadalajara: [20.67, -103.35],
  monterrey: [25.69, -100.32], 'buenos aires': [-34.60, -58.38], santiago: [-33.45, -70.67],
  lima: [-12.05, -77.04], quito: [-0.18, -78.47], 'sao paulo': [-23.55, -46.63], 'rio de janeiro': [-22.91, -43.17],
  madrid: [40.42, -3.70], barcelona: [41.39, 2.17], londres: [51.51, -0.13], paris: [48.86, 2.35],
  'nueva york': [40.71, -74.01], 'new york': [40.71, -74.01], miami: [25.76, -80.19],
  'los angeles': [34.05, -118.24], singapur: [1.35, 103.82], tokio: [35.68, 139.69],
  sidney: [-33.87, 151.21], 'ciudad de panama': [8.98, -79.52],
};

/**
 * EL PUNTO DEL MAPA: primero la ciudad si se conoce, si no el país. Devuelve null cuando no hay con qué
 * ubicarlo (mejor no pintar nada que pintarlo en el lugar equivocado).
 */
export function coordenadasDe(codigoPais: unknown, ciudad?: unknown): [number, number] | null {
  const ciudadClave = String(ciudad ?? '').split(',')[0].trim().toLowerCase();
  if (ciudadClave && COORDENADAS_DE_CIUDAD[ciudadClave]) return COORDENADAS_DE_CIUDAD[ciudadClave];
  const codigo = String(codigoPais ?? '').trim().toUpperCase();
  return COORDENADAS[codigo] ?? null;
}

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
  // LAS CIUDADES TAMBIÉN DICEN EL PAÍS. Un negocio escribe su ciudad sin el país («Medellín») y sin esto se
  // quedaba sin país: sin país no hay lectura de anuncios ni mercados donde buscar. Son las ciudades donde el
  // producto ya tiene negocios y las capitales del mundo hispano y del Golfo.
  medellin: 'CO', bogota: 'CO', cali: 'CO', barranquilla: 'CO', cartagena: 'CO', 'ciudad de mexico': 'MX',
  cdmx: 'MX', guadalajara: 'MX', monterrey: 'MX', 'buenos aires': 'AR', 'sao paulo': 'BR', 'sao pablo': 'BR',
  'rio de janeiro': 'BR', santiago: 'CL', lima: 'PE', quito: 'EC', guayaquil: 'EC', 'panama city': 'PA',
  'ciudad de panama': 'PA', montevideo: 'UY', asuncion: 'PY', 'la paz': 'BO', 'santa cruz': 'BO',
  caracas: 'VE', 'san jose': 'CR', madrid: 'ES', barcelona: 'ES', valencia: 'ES', sevilla: 'ES',
  'miami': 'US', 'nueva york': 'US', 'new york': 'US', 'los angeles': 'US', houston: 'US', chicago: 'US',
  'mexico df': 'MX', 'abu dabi': 'AE', 'abu dhabi': 'AE', sharjah: 'AE', doha: 'QA', riad: 'SA',
  yeda: 'SA', 'jeddah': 'SA', 'kuwait': 'KW', manama: 'BH', mascate: 'OM', muscat: 'OM', estambul: 'TR',
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
 * LOS PAÍSES QUE SE DEDUCEN DE LA ZONA. Sirve para cuando el negocio no declaró países: si su zona dice
 * «Dubai, Emiratos Árabes Unidos», el mercado que le importa es AE. Sin esto, la lectura de anuncios no se
 * lanzaba («sin nada por defecto»), así que un negocio con su ciudad cargada y sin países declarados se
 * quedaba sin lectura —en silencio— aunque su mercado estuviera a la vista.
 */
export function paisesDeLaZona(zona: unknown): string[] {
  const partes = String(zona ?? '').split(/[,·|]/).map(p => p.trim()).filter(Boolean);
  const codigos = partes.map(p => codigoDePais(p)).filter(Boolean);
  if (codigos.length) return [...new Set(codigos)];
  // Si el último tramo no se reconoce, se prueba con el todo («Dubai Emiratos Arabes Unidos»).
  const todo = codigoDePais(zona);
  return todo ? [todo] : [];
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
