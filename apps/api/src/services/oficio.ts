// =============================================================================================
// LA CAPA DE OFICIO — el vocabulario técnico de un motor de prompts profesional
//
// El dueño instaló un motor de prompts de código abierto (`random-ai-prompt`) y pidió que nuestros
// agentes lo usen: el prompt que escribíamos era básico y con esto tiene que quedar profesional.
//
// QUÉ SE TOMA Y QUÉ NO, que es lo importante: ese motor es de prompts ARTÍSTICOS —su catálogo de
// estilos son movimientos de arte («al estilo de la arquitectura románica 1050-1100», «Rasquache
// Assemblage»)— y meter eso en el aviso de una empresa sería un disparate. Lo que SÍ aporta, y es lo
// que se toma, es su VOCABULARIO TÉCNICO: luz, exposición, lente, profundidad de campo, composición.
// Todo lo que no sea técnica fotográfica se descarta, y se dice que se descartó.
//
// Si el motor no está instalado o tarda demasiado, la capa vuelve vacía: el prompt se arma como antes
// y el sistema no se rompe. Lo que no se hace nunca es inventar el vocabulario.
// =============================================================================================

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

/** Dónde vive el motor: se puede mover con esta variable, y si no está, no se usa. */
const RAIZ_MOTOR = process.env.MOTOR_DE_PROMPTS || '/root/agentes/random-ai-prompt';

/** La plantilla: SOLO los bloques de vocabulario técnico del motor (estilos y efectos). */
const PLANTILLA = '{#prompt/styles} {#prompt/fx}';

/**
 * Lo que sí es técnica fotográfica o de encuadre. Lo demás —movimientos de arte, personajes, escenas
 * aleatorias— se descarta: no tiene nada que hacer en el aviso de una empresa.
 */
const ES_TECNICA = new RegExp([
  'light', 'lighting', 'lit', 'exposure', 'shadow', 'shadows', 'highlight', 'highlights',
  'lens', 'shutter', 'aperture', 'bokeh', 'depth of field', 'focus', 'focal', 'macro',
  'composition', 'balance', 'framing', 'perspective', 'angle', 'close-up', 'closeup', 'portrait',
  'contrast', 'saturation', 'grading', 'colour', 'color', 'monochrome', 'grain', 'film',
  'natural', 'window', 'soft', 'hard', 'rim', 'backlit', 'backlight', 'volumetric', 'rays',
  'realistic', 'photorealistic', 'photo', 'cinematic', 'documentary', 'candid', 'shot on',
  'rule of thirds', 'negative space', 'symmetry', 'asymmetrical', 'minimal', 'clean',
].join('|'), 'i');

/** Lo que hay que evitar en una pieza publicitaria, aunque el motor lo tenga en su catálogo. */
const NO_ES_DE_AVISO = /romanesque|gothic|baroque|renaissance|impressionis|surrealis|assemblage|kawaii|chibi|anime|manga|sticker|wallpaper|pokemon|kancolle|cyberpunk|steampunk/i;

export type CapaDeOficio = {
  /** Los términos técnicos que sí se usan, en el idioma del prompt (inglés). */
  terminos: string[];
  /** El vocabulario que se tomó del motor y el que se descartó, para poder decirlo. */
  motor: string;
  version: string;
  descartado: string[];
  fuente: string;
};

/** Corre el motor una vez, con semilla: la misma pieza recibe siempre la misma capa (reproducible). */
function pedirleAlMotor(semilla: string, timeoutMs = 25_000): Promise<string | null> {
  return new Promise((resolve) => {
    if (!existsSync(path.join(RAIZ_MOTOR, 'targets/cli/bin/prompt.js'))) return resolve(null);
    execFile('node',
      ['targets/cli/bin/prompt.js', 'generate', PLANTILLA, '--no-images', '--json', '--seed', semilla],
      { cwd: RAIZ_MOTOR, timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout) => {
        if (err) return resolve(null);
        try {
          const j = JSON.parse(String(stdout)) as { results?: { prompt?: string }[] };
          resolve(j.results?.[0]?.prompt ?? null);
        } catch { resolve(null); }
      });
  });
}

/**
 * La capa de oficio para una pieza: devuelve el vocabulario técnico listo para el prompt, o null si
 * el motor no está. Nunca lanza: si algo falla, el prompt se arma como antes.
 */
export async function capaDeOficio(semilla: string): Promise<CapaDeOficio | null> {
  const crudo = await pedirleAlMotor(String(semilla).replace(/[^a-z0-9]/gi, '').slice(0, 10) || '1');
  if (!crudo) return null;
  const partes = crudo.split(/[|,]/).map(t => t.trim()).filter(Boolean);
  const terminos = partes.filter(t => ES_TECNICA.test(t) && !NO_ES_DE_AVISO.test(t));
  const descartado = partes.filter(t => !ES_TECNICA.test(t) || NO_ES_DE_AVISO.test(t));
  if (!terminos.length) return null;
  return {
    terminos: [...new Set(terminos)].slice(0, 6),
    motor: `random-ai-prompt (${RAIZ_MOTOR})`,
    version: 'v2.60.3',
    descartado: [...new Set(descartado)].slice(0, 6),
    fuente: 'el vocabulario técnico del motor de prompts instalado (luz, lente, encuadre): se toma lo fotográfico y se descarta lo artístico',
  };
}
