// ¿Los planos ahora nombran sujetos y acciones? Con el guion real de la pieza del dueño.
import { planosDelGuion } from '../src/services/planos.js';

const guion = `Usted ya sabe que sus activos del mundo real no se verifican igual en todas partes.
El problema no es la tokenizacion.
El problema es que no hay una forma común de verificar el grado de soberanía de cada activo.
Sin esa verificación, la trazabilidad se rompe y la custodia de activos queda en duda.`;

const planos = await planosDelGuion({
  guion, formato: 'video vertical 9:16', segundos: 30, tono: 'premium',
  queHace: 'Verificación y custodia de activos del mundo real para empresas',
});
if (!planos) { console.log('PenShot no devolvió planos'); process.exit(1); }
console.log('planos:', planos.planos.length, '· segundos:', planos.segundos_totales ?? '?');
console.log('CLAVES de un plano:', Object.keys(planos.planos[0] || {}));
console.log(JSON.stringify(planos.planos[0], null, 1).slice(0, 700));
console.log('CLAVES del resultado:', Object.keys(planos));
