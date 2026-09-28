import { existsSync, readFileSync } from 'node:fs';

// =============================================================================================
// EL ENTORNO DEL SERVIDOR — carga las claves que viven fuera del repositorio.
//
// El back lee sus claves de process.env, y en este servidor viven en un solo archivo que solo root
// puede leer (/root/work/sinkroo-a/.env.local): el correo (RESEND_API_KEY y EMAIL_FROM), el conector
// de redes (BUNDLE_API_KEY), la clave con la que se cifran los tokens de las cuentas conectadas
// (DATOS_CLAVE) y la URL pública (APP_URL).
//
// Se importa PRIMERO en index.ts: así ningún otro módulo ve el entorno a medias. Lo que ya venga puesto
// en el proceso manda —si alguien exporta una variable, esa gana— y este archivo solo rellena lo que
// falte. Si el archivo no está, se dice en el arranque y el servidor sigue: lo que necesite esa clave
// avisa por su cuenta qué le falta.
// =============================================================================================

const RUTA_POR_DEFECTO = process.env.ENTORNO_ARCHIVO || '/root/work/sinkroo-a/.env.local';

export type ResultadoEntorno = {
  archivo: string;
  leido: boolean;
  /** Las variables que se cargaron desde el archivo (solo los nombres). */
  puestas: string[];
  /** Las que quedaron sin valor: el nombre de la variable, sin su contenido. */
  vacias: string[];
  /** Si el archivo no se pudo leer, por qué (en una línea). */
  problema: string;
};

/** Lee el archivo de entorno y pone en el proceso lo que falte. Nunca lanza: el arranque no depende de él. */
export function cargarEntorno(ruta: string = RUTA_POR_DEFECTO): ResultadoEntorno {
  const puestas: string[] = [];
  const vacias: string[] = [];
  if (!existsSync(ruta)) {
    return { archivo: ruta, leido: false, puestas, vacias, problema: `no existe ${ruta}` };
  }
  try {
    for (const linea of readFileSync(ruta, 'utf8').split('\n')) {
      const t = linea.trim();
      if (!t || t.startsWith('#')) continue;
      const corte = t.indexOf('=');
      if (corte < 1) continue;
      const nombre = t.slice(0, corte).trim();
      // El valor puede venir entre comillas: se quitan las de afuera.
      const valor = t.slice(corte + 1).trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
      if (!valor) { vacias.push(nombre); continue; }
      // Lo que ya esté en el proceso no se pisa: la variable exportada manda sobre el archivo.
      if (!process.env[nombre]) { process.env[nombre] = valor; puestas.push(nombre); }
    }
    return { archivo: ruta, leido: true, puestas, vacias, problema: '' };
  } catch (e) {
    return { archivo: ruta, leido: false, puestas, vacias, problema: `no se pudo leer: ${String((e as Error).message).slice(0, 100)}` };
  }
}

/** El resultado de leerlo al arrancar (para poder decirlo en el log sin mostrar ningún valor). */
export const entorno = cargarEntorno();
