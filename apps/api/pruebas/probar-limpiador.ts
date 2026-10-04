
import { soloVariablesDuras, promptDeImagen } from '../src/services/prompts-por-motor.js';
const casos = [
  'A concierge hands over a key card in a commercial photograph style, cinematic lighting, 35mm',
  'Man signing a contract, Commercial Photograph, natural overcast, speaking: you already tokenized',
  'A concierge opens a door in a luxury hotel lobby, medium shot, golden hour, Kodak Portra emulation',
];
for (const c of casos) console.log('·', JSON.stringify(soloVariablesDuras(c)));
// y el prompt final: ¿sobrevive la decisión de cine al corte de 900?
const largo = 'A concierge walks through a very long lobby with marble floors and mirrors and plants and many windows and doors and lamps and sofas and rugs and paintings and flowers and people passing by, '.repeat(6);
const r = promptDeImagen('flux-dev', { queHace: 'x', queHaceEn: largo, formato: 'video vertical 9:16', lugar: 'Dubai, Emiratos Árabes Unidos', tono: 'Premium y sobrio', n: 2, total: 6 });
console.log('\nprompt largo:', r.prompt.length, 'caracteres');
console.log('  ¿tiene tamaño de plano?:', /wide establishing shot|medium close-up|medium shot|close-up|wide shot/i.test(r.prompt));
console.log('  ¿tiene óptica?:', /\d+mm (?:wide )?lens/i.test(r.prompt));
console.log('  ¿tiene luz?:', /golden hour|flat overcast daylight|late blue hour/i.test(r.prompt));
console.log('  ¿tiene etalonaje?:', /Kodak \d+ print emulation|Fujifilm ETERNA emulation|Kodak Portra emulation/i.test(r.prompt));
console.log('  final del prompt:', r.prompt.slice(-200));
process.exit(0);
