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

import { writeFileSync } from 'node:fs';

const CDP = process.env.CDP_URL || 'http://127.0.0.1:9222';
const ESPERA_CARGA = Number(process.env.ESPERA_CARGA || 9000);
const MAX_FICHAS = Number(process.env.MAX_FICHAS || 80);

/** Los argumentos: palabra:país. Sin argumentos, no hay nada que leer. */
const salidaIdx = process.argv.indexOf('--salida');
const SALIDA = salidaIdx > -1 ? String(process.argv[salidaIdx + 1] || '') : '/tmp/anuncios-leidos.json';
// Los objetivos son palabra:país. Se salta el valor de --salida, que no es un objetivo.
const objetivos = process.argv.slice(2).filter((a, i) => !a.startsWith('--') && i + 1 !== salidaIdx);
if (!objetivos.length) {
  console.error('Falta qué buscar. Ejemplo: node workers/lector-anuncios.mjs --salida /tmp/f.json "keratina:CO"');
  process.exit(2);
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
const EXTRACTOR = `(() => {
  const nodos = [...document.querySelectorAll('div')].filter(d => /Library ID:/i.test(d.innerText||'') && (d.innerText||'').length < 4000);
  const porId = new Map();
  for (const n of nodos) {
    const t = (n.innerText||'').replace(/\\s+/g,' ').trim();
    const id = (t.match(/Library ID:\\s*(\\d+)/)||[])[1]; if (!id) continue;
    const fecha = (t.match(/Started running on ([A-Za-z]+ \\d+, \\d{4})/)||[])[1] || '';
    const plazas = [...new Set((t.match(/Facebook|Instagram|Audience Network|Messenger|Threads/g)||[]))];
    const texto = t.replace(/Library ID:.*$/,'').replace(/Started running on.*$/,'').replace(/^Active\\s*/,'').trim().slice(0,220);
    if (!porId.has(id)) porId.set(id, { id, fecha, plataformas: plazas, texto });
  }
  return JSON.stringify([...porId.values()]);
})()`;

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

// ---------------------------------- La corrida ----------------------------------
const resultado = { leido_at: new Date().toISOString(), consultas: [] };
for (const objetivo of objetivos) {
  const [palabra, pais = 'CO'] = objetivo.split(':');
  try {
    const sesion = await abrirSesion();
    const r = await leer(sesion, palabra, pais.toUpperCase());
    resultado.consultas.push(r);
    const viejas = r.fichas.filter(f => f.fecha).length;
    console.log(`${palabra} · ${pais.toUpperCase()}: ${r.total} · ${r.fichas.length} fichas (${viejas} con fecha)`
      + (r.sinAnuncios ? ' · la plataforma dice que no hay anuncios' : ''));
  } catch (e) {
    // Una consulta que falla no tumba la corrida: se anota con su causa y se sigue.
    resultado.consultas.push({ palabra, pais: pais.toUpperCase(), error: String(e.message || e).slice(0, 200) });
    console.error(`${palabra} · ${pais.toUpperCase()}: falló — ${String(e.message || e).slice(0, 120)}`);
  }
  // Se guarda AL MOMENTO: si el navegador se cae después, lo leído no se pierde.
  writeFileSync(SALIDA, JSON.stringify(resultado, null, 2));
}
const total = resultado.consultas.reduce((n, c) => n + (c.fichas?.length || 0), 0);
console.log(`\nGuardado en ${SALIDA}: ${resultado.consultas.length} consultas, ${total} fichas.`);
