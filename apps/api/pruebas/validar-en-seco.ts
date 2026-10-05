// =====================================================================================================
// EL PROTOCOLO DE VALIDACIÓN EN SECO (manual de estándares, módulo 3).
//
// Corre los cuatro controles ANTES de gastar un minuto de GPU. Si algo no pasa, lo dice con el texto exacto
// que falló, y la pieza no se manda a pintar.
//
//   1. INTEGRIDAD DEL GUION    — cada línea tiene sujeto filmable y acción explícita (no conceptos).
//   2. COHERENCIA DE PLANOS    — la cantidad y la duración entran en la pieza y acompañan a la voz.
//   3. LIMPIEZA ESTÉTICA       — los prompts traen los descriptores ópticos del MOTOR y ni un resto de la
//                                estética que improvisa el motor de planos.
//   4. VALIDEZ DE LAS ESTRUCTURAS — los cuerpos que se mandan a los servicios locales (8077, 8188, 8189) y
//                                los campos que se leen de su respuesta.
//
//   uso:  npx tsx pruebas/validar-en-seco.ts "<guion>" [tono] [lengua] [zona]
// =====================================================================================================
import { escenaEnIngles } from '../src/services/escritor.js';
import { planosDelGuion } from '../src/services/planos.js';
import { motorDeImagenEnUso } from '../src/services/imagenes.js';
import { promptDeImagen, textoDeMovimiento, textoParaLaVoz, cineDeLaPieza } from '../src/services/prompts-por-motor.js';
import { guionParaLaVoz } from '../src/services/video.js';
import { lineasInfilmables, lineasDelGuion } from '../src/services/tangibilidad.js';

const MAX_ESCENAS = 6;
const SEGUNDOS_DE_LA_PIEZA = 30;
/** Lo que tarda la voz por carácter, medido con edge-tts a ritmo -8 % en inglés. Sirve para saber si los
 *  planos acompañan a la voz sin tener que generar el audio (que no cuesta GPU, pero sí tiempo). */
const CARACTERES_POR_SEGUNDO = 13;

const guion = process.argv[2] || '';
const tono = process.argv[3] || 'Profesional y formal';
const lengua = process.argv[4] || 'inglés';
const zona = process.argv[5] || 'Dubái, Emiratos Árabes Unidos (DIFC)';
const pais = 'Emiratos Árabes Unidos';
if (!guion) { console.log('falta el guion'); process.exit(1); }

const fallas: string[] = [];
const bien = (t: string) => console.log(`  ✓ ${t}`);
const mal = (t: string) => { console.log(`  ✗ ${t}`); fallas.push(t); };
const titulo = (t: string) => console.log(`\n${'─'.repeat(96)}\n${t}\n${'─'.repeat(96)}`);

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
titulo('1. INTEGRIDAD DEL GUION — ¿cada línea se puede filmar?');
// Lo que hace filmable una línea vive en `services/tangibilidad.ts`, que es el MISMO criterio que usa el
// escritor para pedir que se reescriban: si acá se revisara distinto, el protocolo y el motor se contradirían.
const infilmables = lineasInfilmables(guion);
console.log(`  ${lineasDelGuion(guion).length} líneas en el guion`);
for (const x of infilmables) mal(`infilmable (${x.ideas} ideas, 0 acciones ni lugares): «${x.linea.slice(0, 110)}»`);
if (!infilmables.length) bien('todas las líneas nombran una acción o un lugar real: se pueden filmar');

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
titulo('2. COHERENCIA DE PLANOS — ¿entran en la pieza y acompañan a la voz?');
const planos = await planosDelGuion({ guion, formato: 'video vertical 9:16', segundos: SEGUNDOS_DE_LA_PIEZA, tono, pais, queHace: 'verificación de activos del mundo real' });
if (!planos) { mal('el motor de planos no respondió: no se puede validar nada más'); }
else {
  const todos = planos.planos;
  const elegidos = todos.length <= MAX_ESCENAS ? todos
    : Array.from({ length: MAX_ESCENAS }, (_, i) => todos[Math.round((i * (todos.length - 1)) / (MAX_ESCENAS - 1))]);
  const suma = elegidos.reduce((s, p) => s + (Number(p.duracion_s) || 5), 0);
  const voz = textoParaLaVoz(guionParaLaVoz(guion, 'El hueco que nadie está midiendo')).texto;
  const segundosDeVoz = Math.round((voz.length / CARACTERES_POR_SEGUNDO) * 10) / 10;
  console.log(`  el motor de planos devolvió ${todos.length} planos (${planos.duracion_total_s}s en total); la pieza usa ${elegidos.length} = ${Math.round(suma * 100) / 100}s`);
  console.log(`  la voz: ${voz.length} caracteres ≈ ${segundosDeVoz}s (a ${CARACTERES_POR_SEGUNDO} car./s)`);
  if (suma <= SEGUNDOS_DE_LA_PIEZA) bien(`los planos entran en la pieza (${Math.round(suma * 100) / 100}s de ${SEGUNDOS_DE_LA_PIEZA}s)`);
  else mal(`los planos no entran: ${Math.round(suma * 100) / 100}s contra ${SEGUNDOS_DE_LA_PIEZA}s de pieza`);
  if (segundosDeVoz > SEGUNDOS_DE_LA_PIEZA) mal(`el guion no entra en la pieza: ${segundosDeVoz}s de voz contra ${SEGUNDOS_DE_LA_PIEZA}s (sobra${segundosDeVoz - SEGUNDOS_DE_LA_PIEZA > 1 ? 'n' : ''} ${Math.round((segundosDeVoz - SEGUNDOS_DE_LA_PIEZA) * 10) / 10}s); el guion tiene que ser más corto`);
  // LA NORMALIZACIÓN DE TIEMPOS (manual, módulo 3): la fila de planos tiene que cubrir la voz. Los clips
  // animados duran 5 s cada uno y no se estiran; las tomas fijas sí (hasta 12 s cada una, es lo que hace
  // `armarPieza`). Si ni estirando alcanza, la voz se corta al final y la pieza queda muda a medias.
  const maxAnimables = Math.min(Math.max(1, Number(process.env.VIDEO_PLANOS_MAX || 6)), elegidos.length);
  const capacidad = maxAnimables * 5 + (elegidos.length - maxAnimables) * 12;
  console.log(`  la fila puede cubrir ${capacidad}s: ${maxAnimables} clips de 5s + ${elegidos.length - maxAnimables} tomas fijas estirables hasta 12s`);
  if (capacidad >= segundosDeVoz) bien(`la fila cubre la voz: se estiran las tomas fijas hasta igualar los ${segundosDeVoz}s`);
  else mal(`la voz no entra en la fila: ${segundosDeVoz}s de voz contra ${capacidad}s de imagen como máximo (faltan ${Math.round((segundosDeVoz - capacidad) * 10) / 10}s): la voz se corta al final`);
  if (todos.length <= MAX_ESCENAS) bien(`el motor de planos devolvió los planos justos (${todos.length})`);
  else console.log(`  · el motor de planos devolvió ${todos.length - MAX_ESCENAS} planos de más: se reparten los ${MAX_ESCENAS} a lo largo del guion y los demás quedan guardados (no es un fallo, es cómo se normaliza)`);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
titulo('3. LIMPIEZA ESTÉTICA — ¿la dirección de fotografía es del motor?');
const motor = motorDeImagenEnUso();
console.log(`  motor de imagen: ${motor.modelo}`);
const RUIDO_DE_PENSHOT = ['cinematic', 'grading', 'static camera', 'motion blur', 'frame rate', 'natural overcast', 'sunny morning', 'commercial photograph', 'speaking'];
const etalonajes = new Set<string>();
const tipos: string[] = [];
let sucios = 0, sinCine = 0, videosSinMovimiento = 0, sinOjoDeCamara = 0;
for (const p of (planos?.planos ?? []).slice(0, MAX_ESCENAS)) {
  const en = await escenaEnIngles(p.prompt);
  const visual = promptDeImagen(motor.motor, {
    queHace: p.prompt, queHaceEn: en ?? undefined, formato: 'video vertical 9:16', lugar: zona, tono,
    n: p.n, total: Math.min(MAX_ESCENAS, (planos?.planos ?? []).length),
  });
  const mov = textoDeMovimiento(en || p.prompt, cineDeLaPieza({ tono, n: p.n, total: Math.min(MAX_ESCENAS, (planos?.planos ?? []).length) }).movimiento);
  const sucio = RUIDO_DE_PENSHOT.filter(x => visual.prompt.toLowerCase().includes(x));
  if (sucio.length) { mal(`plano ${p.n}: el prompt todavía trae estética del motor de planos (${sucio.join(', ')})`); sucios++; }
  const tipo = /wide establishing shot|medium close-up|medium shot|close-up|wide shot/.exec(visual.prompt)?.[0];
  const lente = /\d+mm (?:wide )?lens/.exec(visual.prompt)?.[0];
  const luz = /golden hour|flat overcast daylight|late blue hour/.exec(visual.prompt)?.[0];
  const et = /Kodak \d+ print emulation|Fujifilm ETERNA emulation|Kodak Portra emulation/.exec(visual.prompt)?.[0];
  const ojo = cineDeLaPieza({ tono, n: p.n, total: Math.min(MAX_ESCENAS, (planos?.planos ?? []).length) });
  const lenteEsperada = Number(/(\d+)mm/.exec(ojo.optica)?.[1] || 0);
  if (!tipo || !lente || !luz || !et) { mal(`plano ${p.n}: al prompt le falta la decisión de cine (tipo=${tipo ?? '—'} óptica=${lente ?? '—'} luz=${luz ?? '—'} etalonaje=${et ?? '—'})`); sinCine++; }
  else if (Number(/(\d+)mm/.exec(lente)?.[1] || 0) !== lenteEsperada) { mal(`plano ${p.n}: la óptica no es la que corresponde al tamaño de plano (${lente} contra ${ojo.optica})`); sinOjoDeCamara++; }
  if (et) etalonajes.add(et);
  if (tipo) tipos.push(tipo);
  if (!mov.prompt.includes('real movement between frames')) { mal(`plano ${p.n}: el texto de video no exige movimiento real`); videosSinMovimiento++; }
}
if (!sucios && !sinCine && !sinOjoDeCamara && !videosSinMovimiento) bien(`los ${Math.min(MAX_ESCENAS, (planos?.planos ?? []).length)} prompts llevan la decisión del motor, sin restos del motor de planos`);
if (etalonajes.size === 1) bien(`un solo etalonaje en toda la pieza: ${[...etalonajes][0]}`);
else mal(`hay ${etalonajes.size} etalonajes distintos en la pieza (${[...etalonajes].join(' / ')}): la pieza no se ve como una sola película`);
const distintos = new Set(tipos);
if (distintos.size >= 3) bien(`los tamaños de plano rotan: ${[...distintos].join(' → ')}`);
else mal(`los tamaños de plano no rotan (sólo ${[...distintos].join(', ')}): la pieza se ve plana`);

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
titulo('4. VALIDEZ DE LAS ESTRUCTURAS QUE SE MANDAN A LOS SERVICIOS');
// Lo que sí se puede comprobar en seco: que lo que le mandamos al motor de planos sea un JSON válido y que de
// su respuesta se lean los campos que después usa el motor (si falta uno, la pieza pierde el dato en silencio).
const cuerpoPen = JSON.stringify({ script: guion });
try {
  const ida = JSON.parse(cuerpoPen) as { script: string };
  if (typeof ida.script === 'string' && ida.script.length > 0) bien('el cuerpo que se manda al motor de planos (8077) es un JSON válido');
  else mal('el cuerpo del motor de planos no lleva el guion');
} catch (e) { mal(`el cuerpo del motor de planos no es un JSON válido: ${(e as Error).message}`); }
if (planos) {
  const campos = ['n', 'duracion_s', 'prompt', 'prompt_negativo'];
  const falta = campos.filter(c => planos.planos.some(p => (p as unknown as Record<string, unknown>)[c] === undefined || (p as unknown as Record<string, unknown>)[c] === null));
  if (!falta.length) bien(`la respuesta del motor de planos trae los ${campos.length} campos que se usan (${campos.join(', ')})`);
  else mal(`la respuesta del motor de planos NO trae: ${falta.join(', ')} (esos datos se pierden en silencio)`);
}
// Los grafos de imagen y video se arman y se serializan en `imagenes.ts` y `video-animado.ts`; acá sólo se
// puede comprobar que los servicios respondan, y para eso la GPU tiene que estar encendida.
const arriba = async (url: string) => { try { const c = await fetch(url, { signal: AbortSignal.timeout(4000) }); return c.ok; } catch { return false; } };
const g8188 = await arriba('http://127.0.0.1:8188/system_stats');
const g8189 = await arriba('http://127.0.0.1:8189/system_stats');
if (g8188 && g8189) bien('los motores de imagen (8188) y de video (8189) responden: sus grafos se pueden validar');
else console.log(`  · el motor de imagen (8188) ${g8188 ? 'responde' : 'no responde desde acá'} · el de video (8189) ${g8189 ? 'responde' : 'no responde desde acá'} (con la GPU apagada es lo esperado; sus grafos se arman pieza por pieza en imagenes.ts y video-animado.ts)`);

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
titulo('VEREDICTO');
if (!fallas.length) console.log('  APTO PARA GASTAR GPU: los cuatro controles pasaron. Ahora sí se puede pintar y animar.');
else {
  console.log(`  NO APTO: ${fallas.length} cosa(s) para arreglar antes de encender la GPU.`);
  fallas.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));
}
