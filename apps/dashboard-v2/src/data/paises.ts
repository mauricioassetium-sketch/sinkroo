// =====================================================================================================
// LOS PAÍSES — el nombre para mostrar, a partir del código que guarda el motor.
//
// POR QUÉ EXISTE
//
// El país del negocio se guarda como código de dos letras (es lo que el motor compara y lo que la lectura
// de anuncios entiende), pero nadie lee «AE» en una pantalla. Acá vive la traducción a nombre, y es la
// misma lista que la del back (`apps/api/src/lib/paises.ts`): si se agrega un país, se agrega en los dos.
// =====================================================================================================

export const NOMBRE_DE_PAIS: Record<string, string> = {
  AR: 'Argentina', AU: 'Australia', BO: 'Bolivia', BR: 'Brasil', CA: 'Canadá', CL: 'Chile',
  CN: 'China', CO: 'Colombia', CR: 'Costa Rica', DE: 'Alemania', DO: 'República Dominicana',
  EC: 'Ecuador', EG: 'Egipto', ES: 'España', FR: 'Francia', GB: 'Reino Unido', GT: 'Guatemala',
  HN: 'Honduras', IN: 'India', IT: 'Italia', JP: 'Japón', MA: 'Marruecos', MX: 'México',
  NI: 'Nicaragua', NL: 'Países Bajos', PA: 'Panamá', PE: 'Perú', PR: 'Puerto Rico', PT: 'Portugal',
  PY: 'Paraguay', QA: 'Catar', SA: 'Arabia Saudita', SE: 'Suecia', SG: 'Singapur', SV: 'El Salvador',
  TR: 'Turquía', US: 'Estados Unidos', UY: 'Uruguay', VE: 'Venezuela', AE: 'Emiratos Árabes Unidos',
};

/** El nombre del país para la pantalla: si no está en la lista, se muestra lo que haya guardado. */
export const nombreDePais = (codigo: string) =>
  NOMBRE_DE_PAIS[String(codigo || '').trim().toUpperCase()] || String(codigo || '').trim();

/** El nombre, tal como se escribe de verdad, → su código. Es la misma tabla que la del back. */
const CODIGO_DE: Record<string, string> = Object.fromEntries(
  Object.entries(NOMBRE_DE_PAIS).map(([c, n]) => [n.toLowerCase(), c]),
);

/**
 * El código de dos letras a partir de lo que escribió el cliente («Colombia», «CO», «Dubái»). Devuelve ''
 * si no se reconoce: en ese caso se guarda el texto tal cual, y el back lo resuelve igual.
 */
export const codigoDePais = (texto: string): string => {
  const t = String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if (!t) return '';
  if (/^[a-z]{2}$/.test(t)) return t.toUpperCase();
  return CODIGO_DE[t] || ALIAS[t] || '';
};

/** Nombres como se escriben de verdad (sin tilde, en corto, en inglés). */
const ALIAS: Record<string, string> = {
  'estados unidos': 'US', usa: 'US', 'ee uu': 'US', eeuu: 'US', 'united states': 'US',
  'reino unido': 'GB', uk: 'GB', 'united kingdom': 'GB', inglaterra: 'GB',
  'emiratos arabes unidos': 'AE', 'emiratos arabes': 'AE', uae: 'AE', dubai: 'AE', emiratos: 'AE',
  espana: 'ES', mexico: 'MX', brasil: 'BR', panama: 'PA', peru: 'PE', japon: 'JP',
  'arabia saudi': 'SA', catar: 'QA', qatar: 'QA', turquia: 'TR', canada: 'CA',
};
