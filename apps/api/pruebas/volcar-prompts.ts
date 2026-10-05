// Vuelca TODO lo que se le dice a cada modelo, en orden, con el texto literal.
// Lo que sale de acá se pega en el documento que audita el dueño: no se retipea nada a mano.
import { planosDelGuion } from '../src/services/planos.js';
import { escenaEnIngles } from '../src/services/escritor.js';
import { motorDeImagenEnUso } from '../src/services/imagenes.js';
import { entradaDePlanos, promptDeImagen, textoDeMovimiento, textoParaLaVoz } from '../src/services/prompts-por-motor.js';
import { guionParaLaVoz, vozSegunCaso, ritmoParaEdge } from '../src/services/video.js';
const guion = process.argv[2] || '';
if (!guion) { console.log('falta el guion'); process.exit(1); }
const tono = 'Profesional y formal';
const zona = 'Dubái, Emiratos Árabes Unidos (DIFC)';
const pais = 'Emiratos Árabes Unidos';

const bloque = (t: string, cuerpo: string) => `\n### ${t}\n\n\`\`\`\n${cuerpo}\n\`\`\`\n`;

// 0) el material del negocio que alimenta todo
const material = 'Verificación continua de activos del mundo real (RWA) para instituciones y estados: torres del DIFC de Dubái, puertos y cadenas de custodia en Singapur, oro en Gauteng, litio y agua en Atacama, bonos de carbono en la Amazonía, plantas industriales en el Ruhr, energía offshore en Bergen, campo en la Pampa, tierras raras en el Gobi, madera en la Columbia Británica. Verificación por satélite, sensores de campo y auditoría en sitio.';
console.log('## 0. El material del negocio (lo único que el sistema sabe de él)\n');
console.log(material);

// 1) EL ENCARGO A PENSHOT (lo que escribe nuestro motor)
const entrada = entradaDePlanos({ guion, formato: 'video vertical 9:16', segundos: 30, tono, pais, queHace: material });
console.log(bloque('1. El encargo que NUESTRO motor le manda a PenShot (guion + contexto)', entrada.script));
console.log(`\n_por qué: ${entrada.porque}_\n`);

// 2) LOS PLANOS QUE DEVUELVE PENSHOT + lo que le llega a cada motor
const planos = await planosDelGuion({ guion, formato: 'video vertical 9:16', segundos: 30, tono, pais, queHace: material });
if (!planos) { console.log('PenShot no respondió'); process.exit(1); }
const motor = motorDeImagenEnUso();
console.log(`\n## 2. Los planos de PenShot (${planos.planos.length} planos · ${planos.duracion_total_s}s · el motor usa los primeros 6)\n`);
for (const p of planos.planos.slice(0, 6)) {
  const en = await escenaEnIngles(p.prompt);
  const visual = promptDeImagen(motor.motor, { queHace: p.prompt, queHaceEn: en ?? undefined, formato: 'video vertical 9:16', lugar: zona, tono });
  const mov = textoDeMovimiento(en || p.prompt);
  console.log(`### Plano ${p.n} · ${p.duracion_s}s`);
  console.log(`\n**a) lo que PenShot escribe (${String(p.prompt).length} caracteres):**\n\n\`\`\`\n${p.prompt}\n\`\`\`\n`);
  console.log(`**b) el negativo que trae el plano:**\n\n\`\`\`\n${p.prompt_negativo}\n\`\`\`\n`);
  console.log(`**c) después de la traducción al inglés (${String(en).length} caracteres):**\n\n\`\`\`\n${en}\n\`\`\`\n`);
  console.log(`**d) LO QUE RECIBE EL MOTOR DE IMAGEN (${visual.prompt.length} caracteres) — ${visual.motor}:**\n\n\`\`\`\n${visual.prompt}\n\`\`\`\n`);
  console.log(`**e) negativo que va con la imagen:** \`${visual.negativo || '(vacío: FLUX es de guía destilada y no usa negativo)'}\`\n`);
  console.log(`_por qué así: ${visual.porque}_\n`);
  console.log(`**f) LO QUE RECIBE EL MOTOR DE VIDEO (${mov.prompt.length} caracteres):**\n\n\`\`\`\n${mov.prompt}\n\`\`\`\n`);
}

// 3) LA VOZ Y LOS SUBTÍTULOS
const paraVoz = textoParaLaVoz(guionParaLaVoz(guion, 'El hueco que nadie está midiendo'));
const voz = vozSegunCaso(tono, pais, 'inglés');
console.log(bloque('3. Lo que lee la voz (voz + subtítulos salen de acá)', paraVoz.texto));
console.log(`voz elegida: **${voz.voz}** · ritmo ${voz.ritmo} → ${ritmoParaEdge(voz.ritmo)} · ${voz.porque}`);
console.log(`\nse le quitó antes de leerlo: ${paraVoz.quitado.join(' | ') || 'nada'} — ${paraVoz.porque}`);
