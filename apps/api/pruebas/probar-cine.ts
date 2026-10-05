import { cineDeLaPieza } from '../src/services/prompts-por-motor.js';
for (const n of [1,2,3,4,5,6]) {
  const c = cineDeLaPieza({ tono: 'Profesional y formal', n, total: 6 });
  console.log(`plano ${n}: ${c.plano} · ${c.optica.split(',')[0]} · ${c.luz.split(',')[0]} · ${c.movimiento.split(',')[0]}`);
}
console.log('--- con total 14 (lo que ve el preview) ---');
for (const n of [1,2,3]) {
  const c = cineDeLaPieza({ tono: 'Profesional y formal', n, total: 14 });
  console.log(`plano ${n} de 14: ${c.plano} · ${c.luz.split(',')[0]}`);
}
