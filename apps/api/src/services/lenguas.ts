/**
 * LAS LENGUAS: en qué lengua se busca el mercado de este negocio.
 *
 * El mismo negocio no se busca igual en cada plaza. El texto que se busca tiene que estar en la lengua del
 * que compra ahí, y hay una segunda lengua que no es la del dueño: la de la categoría. En activos digitales
 * —tokenización, rwa— la categoría está escrita en INGLÉS: los artículos existen en inglés y no tienen
 * equivalente en otras lenguas. Buscar «tokenizacion» en español trae otra cosa (en la enciclopedia en
 * español esa palabra es el análisis léxico de un texto, no la tokenización de activos), y buscar solo en
 * español en Emiratos deja afuera al que compra ahí.
 *
 * Todo lo que devuelve este módulo sale de fuentes abiertas y citables: el propio material del negocio, el
 * vocabulario de la categoría que el sistema ya conoce, la enciclopedia abierta (con el artículo de origen)
 * y los avisos que el trabajador ya leyó. Lo que no se puede verificar, no se inventa: se dice.
 */

const UA = 'Sinkroo/1.0 (+https://sinkroo.com; info@sinkroo.com)';

/**
 * Las lenguas que se reconocen, con las palabras que las DELATAN. Solo se cuentan las palabras que existen en
 * una lengua y no en las otras: «para», «con» o «como» están en español y en portugués, así que contarían
 * doble y empatarían las dos lenguas. Una lengua sin palabras propias se reconoce por su alfabeto.
 */
const LENGUAS: { codigo: string; nombre: string; marcas: string[]; script?: RegExp }[] = [
  { codigo: 'es', nombre: 'español', marcas: ['y', 'los', 'las', 'del', 'una', 'unos', 'unas', 'nuestro', 'nuestra', 'usted', 'desde', 'entre', 'tiene', 'puede', 'pero', 'porque', 'muy', 'sus', 'mas', 'tambien', 'hay', 'hace', 'hacia', 'sobre', 'segun', 'mientras', 'aunque'] },
  { codigo: 'pt', nombre: 'portugués', marcas: ['nao', 'uma', 'com', 'dos', 'das', 'seus', 'suas', 'voce', 'tambem', 'sao', 'muito', 'entao', 'porem', 'apos', 'nossa', 'nosso', 'estao', 'isso'] },
  { codigo: 'en', nombre: 'inglés', marcas: ['the', 'of', 'for', 'with', 'you', 'your', 'and', 'that', 'this', 'from', 'have', 'will', 'can', 'our', 'get', 'more', 'their', 'were'] },
  { codigo: 'fr', nombre: 'francés', marcas: ['les', 'des', 'pour', 'avec', 'vous', 'votre', 'dans', 'sur', 'plus', 'nous', 'sont', 'cette', 'leur'] },
  { codigo: 'it', nombre: 'italiano', marcas: ['che', 'gli', 'delle', 'della', 'sono', 'questo', 'nostro', 'piu', 'anche', 'molto', 'degli'] },
  { codigo: 'de', nombre: 'alemán', marcas: ['und', 'der', 'das', 'fur', 'mit', 'sie', 'ist', 'auf', 'nicht', 'wir', 'unser', 'eine', 'sich'] },
  { codigo: 'tr', nombre: 'turco', marcas: ['icin', 'ile', 'bir', 'daha', 'olarak', 've', 'bu'] },
  { codigo: 'ar', nombre: 'árabe', marcas: [], script: /[\u0600-\u06FF]/g },
  { codigo: 'zh', nombre: 'chino', marcas: [], script: /[\u4E00-\u9FFF]/g },
  { codigo: 'ja', nombre: 'japonés', marcas: [], script: /[\u3040-\u30FF]/g },
  { codigo: 'ko', nombre: 'coreano', marcas: [], script: /[\uAC00-\uD7AF]/g },
  { codigo: 'ru', nombre: 'ruso', marcas: [], script: /[\u0400-\u04FF]/g },
  { codigo: 'he', nombre: 'hebreo', marcas: [], script: /[\u0590-\u05FF]/g },
  { codigo: 'hi', nombre: 'hindi', marcas: [], script: /[\u0900-\u097F]/g },
  { codigo: 'el', nombre: 'griego', marcas: [], script: /[\u0370-\u03FF]/g },
  { codigo: 'th', nombre: 'tailandés', marcas: [], script: /[\u0E00-\u0E7F]/g },
];

/** El nombre de una lengua, en español. Una lengua que no está en la lista se muestra con su código. */
export const nombreDeLengua = (codigo: string) => LENGUAS.find(l => l.codigo === codigo)?.nombre || codigo;

export type LenguaLeida = { codigo: string; nombre: string; marcas: number; delata: string };

/**
 * EN QUÉ LENGUA ESTÁ ESCRITO UN TEXTO. No es adivinanza: se cuentan las palabras que solo existen en cada
 * lengua (y el alfabeto, cuando no es el latino) y se devuelve el ranking con la palabra que la delató.
 */
export function detectarLengua(texto: string, limite = 3): LenguaLeida[] {
  const t = String(texto || '');
  if (!t.trim()) return [];
  const bajo = ` ${t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  const leidas: LenguaLeida[] = [];
  for (const l of LENGUAS) {
    if (l.script) {
      const marcas = (t.match(l.script) || []).length;
      if (marcas >= 20) leidas.push({ codigo: l.codigo, nombre: l.nombre, marcas, delata: 'está escrito con ese alfabeto' });
      continue;
    }
    let marcas = 0;
    let delata = '';
    for (const marca of l.marcas) {
      const cuantas = bajo.split(` ${marca} `).length - 1;
      if (cuantas && !delata) delata = marca;
      marcas += cuantas;
    }
    if (marcas) leidas.push({ codigo: l.codigo, nombre: l.nombre, marcas, delata: `aparece «${delata}»` });
  }
  return leidas.sort((a, b) => b.marcas - a.marcas).slice(0, limite);
}

/** La lengua con la que lee el que compra en cada plaza. Es la lengua local, no la del dueño. */
const LENGUA_DE_PLAZA: Record<string, string> = {
  AR: 'es', CL: 'es', CO: 'es', MX: 'es', PE: 'es', EC: 'es', UY: 'es', PY: 'es', BO: 'es', VE: 'es',
  CR: 'es', PA: 'es', DO: 'es', GT: 'es', SV: 'es', HN: 'es', NI: 'es', CU: 'es', PR: 'es', ES: 'es',
  BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt',
  US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en', IE: 'en', SG: 'en', IN: 'en', NG: 'en', KE: 'en',
  ZA: 'en', PH: 'en', HK: 'en', AE: 'ar', SA: 'ar', QA: 'ar', KW: 'ar', BH: 'ar', OM: 'ar', JO: 'ar',
  EG: 'ar', MA: 'fr', DZ: 'ar', TN: 'ar', LB: 'ar', IQ: 'ar', FR: 'fr', BE: 'fr', SN: 'fr', CI: 'fr',
  DE: 'de', AT: 'de', CH: 'de', NL: 'nl', IT: 'it', TR: 'tr', RU: 'ru', CN: 'zh', JP: 'ja', KR: 'ko',
  IL: 'he', IR: 'ar', PK: 'en', ID: 'id', MY: 'ms', TH: 'th', VN: 'vi', PL: 'pl', SE: 'sv', NO: 'no',
  DK: 'da', FI: 'fi', GR: 'el', CZ: 'cs', RO: 'ro', HU: 'hu', UA: 'uk',
};

/** La lengua de una plaza, por su código de país. Vacío si no se conoce: entonces se dice, no se supone. */
export const lenguaDePais = (pais: string) => LENGUA_DE_PLAZA[String(pais || '').toUpperCase()] || '';

/**
 * EL VOCABULARIO DE LA CATEGORÍA EN CADA LENGUA. No es traducción de diccionario: son los términos con los
 * que esa categoría se busca de verdad en cada mercado, y son los que el propio sistema ya reconoce en el
 * material del negocio (VOCABULARIO de vera.ts), ordenados por lengua.
 */
export const VOCABULARIO_POR_LENGUA: Record<string, string[]> = {
  es: ['tokenizacion', 'activos del mundo real', 'gemelos digitales', 'contratos inteligentes', 'activos digitales', 'trazabilidad', 'verificacion de activos', 'custodia de activos'],
  en: ['asset tokenization', 'real world assets', 'digital twin', 'smart contracts', 'asset verification', 'asset custody', 'tokenized assets', 'blockchain'],
  pt: ['tokenizacao', 'ativos do mundo real', 'gemeos digitais', 'contratos inteligentes', 'ativos digitais', 'rastreabilidade'],
};

/**
 * EL TÉRMINO DE LA CATEGORÍA, EN LA LENGUA QUE SEA. Se pide a la enciclopedia abierta el artículo del
 * término y sus equivalentes en otras lenguas (los enlaces entre idiomas). Cuando el equivalente NO existe,
 * se devuelve vacío y quien llama lo dice: en activos digitales lo normal es que no exista, porque la
 * categoría está escrita en inglés.
 */
export async function terminoEnOtrasLenguas(termino: string, idiomas: string[]): Promise<{ idioma: string; titulo: string; url: string }[]> {
  const limpio = String(termino || '').trim().replace(/\s+/g, '_');
  if (!limpio || !idiomas.length) return [];
  for (const desde of ['en', 'es']) {
    try {
      const r = await fetch(`https://${desde}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(limpio)}&prop=langlinks&lllimit=500&format=json&origin=*&redirects=1`, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) continue;
      const j = await r.json() as { query?: { pages?: Record<string, { langlinks?: { lang: string; '*': string }[] }> } };
      const pagina = Object.values(j?.query?.pages ?? {})[0];
      const enlaces = pagina?.langlinks ?? [];
      if (!enlaces.length) continue;
      return enlaces.filter(l => idiomas.includes(l.lang)).map(l => ({
        idioma: l.lang,
        titulo: String(l['*']),
        url: `https://${l.lang}.wikipedia.org/wiki/${encodeURIComponent(String(l['*']).replace(/\s+/g, '_'))}`,
      }));
    } catch { /* se prueba la otra lengua */ }
  }
  return [];
}
