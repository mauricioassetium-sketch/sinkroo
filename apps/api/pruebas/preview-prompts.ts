// =====================================================================================================
// LA MESA DE PRUEBA DE PROMPTS — toda la cadena de texto, sin encender la GPU.
//
// Para qué sirve: revisar de punta a punta qué le llega a cada modelo ANTES de pagar una hora de máquina.
// Muestra, paso por paso y con los caracteres contados, dónde se pierde (o se gana) especificación:
//
//   guion → planos (PenShot) → traducción al inglés → prompt de imagen → prompt de video → voz → subtítulos
//
// No pinta, no anima, no sube nada: solo escribe texto. Lo único que gasta son centavos de DeepSeek.
//
//   uso:  npx tsx pruebas/preview-prompts.ts "<guion>" ["<tono>"] ["<lengua>"] ["<zona>"]
// =====================================================================================================
// OJO: este script se corre con el entorno del SERVICIO cargado (`sinkroo-back.env`), porque el motor de
// imagen se lee de ahí: sin eso mide el camino por defecto (SDXL) y no el que está en uso (FLUX.1-dev).
import { escenaEnIngles } from '../src/services/escritor.js';
import { planosDelGuion } from '../src/services/planos.js';
import { motorDeImagenEnUso } from '../src/services/imagenes.js';

/** El mismo tope que usa el motor (agentes.ts): los planos que entran en la pieza. */
const MAX_ESCENAS = 6;
import { promptDeImagen, textoDeMovimiento, textoParaLaVoz, cineDeLaPieza } from '../src/services/prompts-por-motor.js';
import { guionParaLaVoz, vozSegunCaso, ritmoParaEdge } from '../src/services/video.js';

const guion = process.argv[2] || '';
const tono = process.argv[3] || 'Profesional y formal';
const lengua = process.argv[4] || 'inglés';
const zona = process.argv[5] || 'Dubái, Emiratos Árabes Unidos (DIFC)';
if (!guion) { console.log('falta el guion'); process.exit(1); }

const cuenta = (t: unknown) => String(t ?? '').replace(/\s+/g, ' ').trim().length;
const regla = (t: string) => console.log(`\n${'─'.repeat(96)}\n${t}\n${'─'.repeat(96)}`);

console.log(`GUION DE ENTRADA (${cuenta(guion)} caracteres)`);
console.log(guion);

regla('1. PENSHOT — los planos (servicio local, sin GPU)');
const planos = await planosDelGuion({ guion, formato: 'video vertical 9:16', segundos: 30, tono, pais: 'Emiratos Árabes Unidos', queHace: 'Verificación continua de activos del mundo real para instituciones y estados: torres del DIFC, puertos, minas de oro, litio en Atacama, campo en la Pampa, verificación por satélite y sensores de campo.' });
if (!planos) { console.log('PenShot no respondió (¿está levantado el servicio?)'); process.exit(1); }
console.log(`motor: ${planos.motor} · planos: ${planos.planos.length} · duración: ${planos.duracion_total_s}s`);
const motor = motorDeImagenEnUso();
console.log(`motor de imagen en uso: ${motor.proveedor} · ${motor.modelo}`);
for (const p of planos.planos) {
  const en = await escenaEnIngles(p.prompt);
  const visual = promptDeImagen(motor.motor, { queHace: p.prompt, queHaceEn: en ?? undefined, formato: 'video vertical 9:16', lugar: zona, tono, n: p.n, total: Math.min(MAX_ESCENAS, planos.planos.length) });
  const mov = textoDeMovimiento(en || p.prompt, cineDeLaPieza({ tono, n: p.n, total: Math.min(MAX_ESCENAS, planos.planos.length) }).movimiento);
  console.log(`\n▌PLANO ${p.n} · ${p.duracion_s}s`);
  console.log(`  lo que escribe PenShot (${cuenta(p.prompt)} car.): ${String(p.prompt).slice(0, 400)}`);
  console.log(`  traducido (${cuenta(en)} car.): ${String(en).slice(0, 400)}`);
  console.log(`  → AL MOTOR DE IMAGEN (${cuenta(visual.prompt)} car.): ${visual.prompt.slice(0, 760)}`);
  console.log(`  → AL MOTOR DE VIDEO (${cuenta(mov.prompt)} car.): ${mov.prompt.slice(0, 240)} … ${mov.prompt.slice(-260)}`);
  console.log(`  negativo: ${String(visual.negativo || 'vacío (FLUX no usa negativo)').slice(0, 120)}`);
}

regla('2. LA VOZ Y LOS SUBTÍTULOS');
const paraVoz = textoParaLaVoz(guionParaLaVoz(guion, 'El hueco que nadie está midiendo'));
const voz = vozSegunCaso(tono, 'Emiratos Árabes Unidos', lengua);
console.log(`texto que lee la voz (${cuenta(paraVoz.texto)} car.):\n${paraVoz.texto}`);
console.log(`\nvoz: ${voz.voz} · ritmo del motor ${voz.ritmo} → ${ritmoParaEdge(voz.ritmo)} · ${voz.porque}`);
console.log(`se le quitó: ${paraVoz.quitado.join(' | ') || 'nada'} (${paraVoz.porque})`);

regla('3. RESUMEN — dónde se pierde la especificación');
console.log('(los caracteres de cada paso, para ver de un vistazo si algo se está recortando)');
for (const p of planos.planos) {
  const en = await escenaEnIngles(p.prompt);
  const visual = promptDeImagen(motor.motor, { queHace: p.prompt, queHaceEn: en ?? undefined, formato: 'video vertical 9:16', lugar: zona, tono, n: p.n, total: Math.min(MAX_ESCENAS, planos.planos.length) });
  console.log(`plano ${p.n}: PenShot ${cuenta(p.prompt)} → traducido ${cuenta(en)} → imagen ${cuenta(visual.prompt)} · video ${cuenta(textoDeMovimiento(en || p.prompt).prompt)}`);
}
console.log(`\nla GPU no se tocó: esto es solo texto. Pintar ${planos.planos.length} imágenes y animar las que correspondan es aparte.`);
