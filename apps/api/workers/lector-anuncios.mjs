// =============================================================================================
// EL LECTOR DE ANUNCIOS — el que sale a la Biblioteca de Anuncios sin que nadie lo empuje.
//
// QUÉ RESUELVE
//   Hasta hoy, leer la Biblioteca de Anuncios de Meta lo hacía el asistente a mano: abrir la página,
//   esperar, recorrer, sacar las fichas. Eso sirve para un informe, pero no para que la investigación
//   diaria de las 6 de la mañana salga sola. Este trabajador hace ese trabajo: se le dan palabras clave
//   y países con la misma lista de rubro que usa el motor, y devuelve las fichas.
//
// CÓMO HABLA CON EL NAVEGADOR (y por qué así)
//   No usa ninguna librería de por medio: Chromium ya está instalado en el servidor y se lo maneja por
//   su puerto de depuración (CDP) con el WebSocket que trae Node. Así no hay dependencias que se rompan
//   ni versiones que se peleen.
//
// LO QUE YA APRENDÍ EN LAS CORRIDAS A MANO, Y ACÁ VA COMO REGLA
//   · Se lee por FICHA y se deduplica por `Library ID`: la biblioteca muestra lo mismo repetido.
//   · El navegador se cae en corridas largas: acá cada consulta se guarda en el archivo AL MOMENTO, no
//     al final, y una consulta que falla se anota y se sigue con la otra.
//   · Se busca por ANUNCIANTE o por palabra clave del rubro: buscar por palabras comunes trae el mundo
//     entero (Alibaba, iHerb, resultados de otro país). El que llama decide la palabra; acá no se juzga.
//   · «Días corriendo» es el dato que vale: la fecha de inicio se guarda tal cual la da la plataforma.
//
// USO
//   node workers/lector-anuncios.mjs --salida /ruta/fichas.json "tokenizacion:CO" "rwa:US" ...
//   Cada argumento es palabra:país (ISO2). El archivo de salida se reescribe y se VA COMPLETANDO.
// =============================================================================================

import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import pg from 'pg';

// LA FLOTA DE NAVEGADORES: cada lector toma su propio puesto (puertos 9222 a 9231), con un cerrojo en /run
// para que dos lecturas no se pisen. El dueño lo pidió así: «deja abierto 10 navegadores diferentes para que
// cada uno, si lo necesita, use su propio navegador».
const PUESTOS = Number(process.env.NAVEGADORES || 10);
const PUERTO_BASE = Number(process.env.CDP_PUERTO_BASE || 9222);
// Los cerrojos viven acá y NO en /run: /run es memoria y se borra, y cuando se borraba cada lector creía que
// los diez puestos estaban libres —medido: tres lectores apilados sobre el mismo negocio, todos en cero fichas—.
const CERROJOS = process.env.CERROJOS_NAVEGADOR || '/var/lib/sinkroo/puestos';
let CDP = process.env.CDP_URL || 'http://127.0.0.1:' + PUERTO_BASE;

/** Toma el primer puesto libre: devuelve su número y su puerto, o null si están todos ocupados. */
function tomarPuesto() {
  for (let n = 1; n <= PUESTOS; n++) {
    const f = `${CERROJOS}/${n}.pid`;
    let libre = true;
    try {
      const previo = readFileSync(f, 'utf8').trim();
      if (previo) {
        try { process.kill(Number(previo), 0); libre = false; }   // el dueño del cerrojo sigue vivo
        catch { libre = true; }                                   // murió: el cerrojo quedó viejo
      }
    } catch { libre = true; }
    if (!libre) continue;
    try {
      mkdirSync(CERROJOS, { recursive: true });
      writeFileSync(f, String(process.pid));
      return { n, puerto: PUERTO_BASE + n - 1, cerrojo: f };
    } catch { /* sin permiso para el cerrojo: se prueba el siguiente */ }
  }
  return null;
}

const PUESTO = tomarPuesto();
if (PUESTO) {
  CDP = `http://127.0.0.1:${PUESTO.puerto}`;
  console.log(`[lector] puesto ${PUESTO.n} de ${PUESTOS} (puerto ${PUESTO.puerto})`);
}
const soltarPuesto = () => {
  if (!PUESTO) return;
  try { unlinkSync(PUESTO.cerrojo); } catch { /* ya no está */ }
};
const ESPERA_CARGA = Number(process.env.ESPERA_CARGA || 9000);
const MAX_FICHAS = Number(process.env.MAX_FICHAS || 80);

/** Los argumentos: palabra:país. Sin argumentos, no hay nada que leer. */
const salidaIdx = process.argv.indexOf('--salida');
const SALIDA = salidaIdx > -1 ? String(process.argv[salidaIdx + 1] || '') : '/tmp/anuncios-leidos.json';
// Los objetivos son palabra:país. Se salta el valor de --salida, que no es un objetivo.
const negocioIdx = process.argv.indexOf('--negocio');
const NEGOCIO = negocioIdx > -1 ? String(process.argv[negocioIdx + 1] || '') : '';
const objetivos = process.argv.slice(2).filter((a, i) =>
  !a.startsWith('--') && i + 1 !== salidaIdx && i + 1 !== negocioIdx);
/** La base: si el trabajador corre con DATABASE_URL (lo que hace el back al encadenarlo), guarda ahí. */
const pool = process.env.DATABASE_URL ? new pg.Pool({ connectionString: process.env.DATABASE_URL }) : null;
if (!objetivos.length) {
  console.error('Falta qué buscar. Ejemplo: node workers/lector-anuncios.mjs --salida /tmp/f.json "keratina:CO"');
  process.exit(2);
}

/**
 * EL NAVEGADOR SE ASEGURA ANTES DE LEER. Esta lectura necesita un Chrome de verdad, y si no está, cada
 * consulta falla y el negocio se queda sin su mercado —en silencio y por algo que no tiene nada que ver con
 * él: el navegador se cayó y nadie lo levantó—. Acá se comprueba que responda y, si no, se levanta con el
 * mismo lanzador que usa el servicio del sistema.
 */
async function asegurarNavegador() {
  const responde = async () => {
    try { const r = await fetch(`${CDP}/json/version`, { signal: AbortSignal.timeout(3000) }); return r.ok; } catch { return false; }
  };
  if (await responde()) return true;
  try {
    const raiz = new URL('../../../', import.meta.url).pathname;
    // Se levanta EL NAVEGADOR DE ESTE PUESTO (no el primero): si hay varios lectores, cada uno tiene el suyo.
    execSync(`bash ${raiz}scripts/navegador-del-motor.sh arrancar ${PUESTO?.n ?? 1}`, { stdio: 'ignore', timeout: 70000 });
  } catch { /* si no se puede levantar, se intenta leer igual: el fallo se dice en cada consulta */ }
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    if (await responde()) return true;
  }
  return false;
}

/** La pestaña del navegador que ya está abierta. */
async function pestaña() {
  const r = await fetch(`${CDP}/json/list`, { signal: AbortSignal.timeout(8000) });
  const lista = await r.json();
  const p = lista.find(t => t.type === 'page');
  if (!p) throw new Error('el navegador no tiene ninguna pestaña abierta');
  return p.webSocketDebuggerUrl;
}

/** Una sesión de CDP: se mandan métodos y se esperan sus respuestas por id. */
class Sesion {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pendientes = new Map();
    ws.onmessage = e => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.id && this.pendientes.has(m.id)) {
        const { resolver, rechazar } = this.pendientes.get(m.id);
        this.pendientes.delete(m.id);
        m.error ? rechazar(new Error(JSON.stringify(m.error).slice(0, 200))) : resolver(m.result);
      }
    };
  }
  enviar(method, params = {}, ms = 40000) {
    const id = ++this.id;
    return new Promise((resolver, rechazar) => {
      this.pendientes.set(id, { resolver, rechazar });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pendientes.has(id)) { this.pendientes.delete(id); rechazar(new Error(`${method}: sin respuesta en ${ms / 1000} s`)); }
      }, ms);
    });
  }
  /** Evalúa una expresión en la página y devuelve su valor (no una promesa). */
  async evaluar(expresion) {
    const r = await this.enviar('Runtime.evaluate', { expression: expresion, returnByValue: true, awaitPromise: false });
    if (r?.exceptionDetails) throw new Error('la página rechazó la lectura');
    return r?.result?.value;
  }
}

async function abrirSesion() {
  // Si el navegador no está, se levanta: esta lectura no tiene con qué leer sin él.
  const hay = await asegurarNavegador();
  if (!hay) throw new Error('el navegador del motor no responde y no se pudo levantar');
  const url = await pestaña();
  const ws = new WebSocket(url);
  await new Promise((resolver, rechazar) => {
    ws.onopen = resolver;
    ws.onerror = () => rechazar(new Error('no se pudo hablar con el navegador'));
    setTimeout(() => rechazar(new Error('el navegador no respondió al conectar')), 10000);
  });
  const s = new Sesion(ws);
  // Sin caché: la lección de las corridas a mano (una página vieja guardada hacía leer datos viejos).
  await s.enviar('Network.setCacheDisabled', { cacheDisabled: true }).catch(() => {});
  await s.enviar('Page.enable').catch(() => {});
  await s.enviar('Runtime.enable').catch(() => {});
  return s;
}

/**
 * El extractor de fichas: se lee por `Library ID` (lo único que no cambia) y se deduplica por ese id.
 * Devuelve el id, la fecha de inicio y el texto que traiga la ficha. Es el mismo criterio que se usó a
 * mano: no se inventan campos que la plataforma no muestra.
 */
const EXTRACTOR = readFileSync(new URL('./extractor-fichas.js', import.meta.url), 'utf8');

/** Una consulta: palabra clave en un país. Devuelve las fichas que la plataforma entregó. */
async function leer(sesion, palabra, pais) {
  const url = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${pais}`
    + `&media_type=all&q=${encodeURIComponent(palabra)}&search_type=keyword_unordered`;
  await sesion.enviar('Page.navigate', { url }, 45000);
  await new Promise(r => setTimeout(r, ESPERA_CARGA));
  // Se recorre para que la página cargue más fichas (la biblioteca carga de a poco).
  for (let i = 0; i < 3; i++) {
    await sesion.evaluar('window.scrollBy(0,1500); true').catch(() => {});
    await new Promise(r => setTimeout(r, 2500));
  }
  const total = await sesion.evaluar(`(() => { const m = document.body.innerText.match(/~?[\\d.,]+\\s*results?/i); return m ? m[0] : ''; })()`).catch(() => '');
  const vacio = await sesion.evaluar(`(() => /No ads match your search criteria|No hay anuncios que coincidan/i.test(document.body.innerText||''))()`).catch(() => false);
  const fichas = JSON.parse(await sesion.evaluar(EXTRACTOR) || '[]');
  return { palabra, pais, total: total || '(sin contador)', sinAnuncios: !!vacio, fichas: fichas.slice(0, MAX_FICHAS) };
}

/**
 * Guarda las fichas en la base, además del archivo. `negocio` es el negocio al que le sirve la lectura
 * (vacío cuando es una lectura suelta, sin negocio). Se actualiza la fecha si el anuncio vuelve a
 * aparecer: lo que importa es desde cuándo corre, y eso lo dice la plataforma.
 */
async function guardarEnBase(consulta) {
  if (!pool) return 0;
  let n = 0;
  for (const f of consulta.fichas || []) {
    try {
      await pool.query(
        `INSERT INTO anuncios_leidos (business_id, palabra, pais, id_anuncio, anunciante, copy, cta, destino, fecha_inicio, plataformas)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (palabra, pais, id_anuncio) DO UPDATE SET
           anunciante = COALESCE(NULLIF(EXCLUDED.anunciante,''), anuncios_leidos.anunciante),
           copy = COALESCE(NULLIF(EXCLUDED.copy,''), anuncios_leidos.copy),
           leido_at = now()`,
        [NEGOCIO || null, consulta.palabra, consulta.pais, f.id, f.anunciante || '', f.copy || '',
          f.cta || '', f.destino || '', f.fecha || '', f.plataformas || []]);
      n++;
    } catch (e) { console.error(`no se pudo guardar el anuncio ${f.id}: ${String(e.message).slice(0, 80)}`); }
  }
  return n;
}

// ---------------------------------- La corrida ----------------------------------
const resultado = { leido_at: new Date().toISOString(), consultas: [] };
// QUEDA ANOTADO QUÉ SE VA A LEER, ANTES DE LEERLO. Es lo que el mapa del panel necesita para mostrar, con su
// nombre, qué ciudades o países está verificando el motor ahora mismo. Se cierra al terminar, con las fichas.
const mercadosDeLaLectura = [...new Set(objetivos.map(o => String(o).split(':').pop().toUpperCase()).filter(Boolean))];
const palabrasDeLaLectura = [...new Set(objetivos.map(o => String(o).split(':')[0]).filter(Boolean))];
let lecturaId = '';
if (pool && NEGOCIO) {
  try {
    lecturaId = String((await pool.query(
      `INSERT INTO lecturas_de_anuncios (business_id, mercados, palabras, motivo)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [NEGOCIO, mercadosDeLaLectura, palabrasDeLaLectura, 'lectura de anuncios'])).rows[0].id);
  } catch { lecturaId = ''; }
}

for (const objetivo of objetivos) {
  const [palabra, pais = 'CO'] = objetivo.split(':');
  try {
    const sesion = await abrirSesion();
    const r = await leer(sesion, palabra, pais.toUpperCase());
    resultado.consultas.push(r);
    const enBase = await guardarEnBase(r);
    const viejas = r.fichas.filter(f => f.fecha).length;
    console.log(`${palabra} · ${pais.toUpperCase()}: ${r.total} · ${r.fichas.length} fichas (${viejas} con fecha)`
      + (r.sinAnuncios ? ' · la plataforma dice que no hay anuncios' : '')
      + (pool ? ` · ${enBase} guardadas en la base` : ''));
  } catch (e) {
    // Una consulta que falla no tumba la corrida: se anota con su causa y se sigue.
    resultado.consultas.push({ palabra, pais: pais.toUpperCase(), error: String(e.message || e).slice(0, 200) });
    console.error(`${palabra} · ${pais.toUpperCase()}: falló — ${String(e.message || e).slice(0, 120)}`);
  }
  // Se guarda AL MOMENTO: si el navegador se cae después, lo leído no se pierde.
  writeFileSync(SALIDA, JSON.stringify(resultado, null, 2));
}
await pool?.end().catch(() => {});
const total = resultado.consultas.reduce((n, c) => n + (c.fichas?.length || 0), 0);
// Y se cierra la lectura: con esto el mapa deja de mostrarla como «verificando» y queda la constancia.
if (pool && lecturaId) {
  try {
    await pool.query('UPDATE lecturas_de_anuncios SET terminada_at = now(), fichas = $2 WHERE id = $1', [lecturaId, total]);
  } catch { /* si no se puede cerrar, la lectura queda abierta: el mapa la muestra como en curso */ }
}

// El puesto se suelta pase lo que pase: si queda el cerrojo, ese navegador no lo usa nadie más.
process.on('exit', soltarPuesto);
process.on('SIGINT', () => { soltarPuesto(); process.exit(0); });
process.on('SIGTERM', () => { soltarPuesto(); process.exit(0); });

console.log(`\nGuardado en ${SALIDA}: ${resultado.consultas.length} consultas, ${total} fichas.`);
soltarPuesto();
