// ¿La escena sale en inglés? (una llamada real al modelo, sin GPU)
import { escenaEnIngles } from '../src/services/escritor.js';
import { promptDeImagen } from '../src/services/prompts-por-motor.js';

const escenas = [
  'una peluquera baña a un perro pequeño en una tina de acero',
  'Peluquería canina en Medellín. Bañamos y cortamos perros de todas las razas',
];

async function main() {
  for (const es of escenas) {
    const en = await escenaEnIngles(es);
    console.log('ES:', es);
    console.log('EN:', en ?? '(el modelo no respondió: se usaría el español y el prompt lo diría)');
    const p = promptDeImagen('flux', { queHace: es, queHaceEn: en ?? undefined, formato: 'video vertical 9:16', colores: ['#1f6f6b'], lugar: 'el norte de Medellín', tono: 'Cercano y cálido' });
    console.log('PROMPT QUE RECIBIRÍA FLUX:', p.prompt.slice(0, 330));
    console.log('porqué:', p.porque.slice(-120));
    console.log('---');
  }
}
void main().catch(e => { console.error('falló:', e); process.exit(1); });
