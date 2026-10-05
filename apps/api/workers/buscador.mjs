// =====================================================================================================
// EL BUSCADOR DEL MOTOR — sale a internet a averiguar lo que el negocio no cuenta de sí mismo.
//
// POR QUÉ EXISTE
// El motor sabía leer el material del cliente y los anuncios de su categoría, pero no podía preguntarle
// nada al mundo. Con un negocio global eso deja el estudio en lo básico: se buscan los mercados que el
// cliente nombró y nada más. Un negocio de conserjería de lujo en Dubái vende a gente que viene de Rusia,
// Estados Unidos, Brasil, China o Europa, y eso no está en su web: está en las noticias, en los informes de
// turismo y en los datos de quién compra.
//
// QUÉ HACE
// Toma una lista de consultas YA ARMADAS (las escribe el motor a partir del negocio, no este archivo), las
// corre en un navegador de la flota —el mismo que lee anuncios, porque la búsqueda directa por HTTP recibe
// un 202 de muro anti-robot— y devuelve, por consulta, los resultados con su título, su extracto y su enlace.
// Con eso el motor puede deducir de dónde viene la demanda y con qué fuente lo sostiene.
//
// CÓMO SE USA
//   node workers/buscador.mjs --salida /tmp/busqueda.json "consulta uno" "consulta dos" ...
//   node workers/buscador.mjs --negocio <uuid> --salida ...
// =====================================================================================================

import { mkdirSync, readFileSync, unlinkSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const PUERTOS = Array.from({ length: 10 }, (_, i) => 9222 + i);
const DIR_CERROJO = '/run/sinkroo-navegador';
const POR_CONSULTA = 6;          // resultados que se guardan de cada consulta
const ESPERA_MS = 9000;          // lo que se le da a la página para traer sus resultados

const args = process.argv.slice(2);
const salida = (() => { const i = args.indexOf('--salida'); return i >= 0 ? args[i + 1] : '/tmp/busqueda.json'; })();
const negocio = (() => { const i = args.indexOf('--negocio'); return i >= 0 ? args[i + 1] : null; })();
const consultas = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--salida' && args[i - 1] !== '--negocio');
if (!consultas.length) { console.error('faltan las consultas'); process.exit(1); }

// ---------------------------------------------------------------------------------------------------
// UN PUESTO DE LA FLOTA, CON CERROJO: si los diez están tomados, espera al primero que se suelte. El
// cerrojo es un archivo por puesto para que dos trabajadores no usen el mismo navegador a la vez.
// ---------------------------------------------------------------------------------------------------
const esperar = ms => new Promise(r => setTimeout(r, ms));

async function vivo(puerto) {
  try { const r = await fetch(`http://127.0.0.1:${puerto}/json/version`, { signal: AbortSignal.timeout(2500) }); return r.ok; }
  catch { return false; }
}

async function tomarPuesto() {
  mkdirSync(DIR_CERROJO, { recursive: true });
  for (let vuelta = 0; vuelta < 90; vuelta++) {
    for (const puerto of PUERTOS) {
      const cerrojo = `${DIR_CERROJO}/${puerto - 9221}.pid`;
      if (existsSync(cerrojo)) {
        const dueno = Number(readFileSync(cerrojo, 'utf8').trim());
        let vive = false;
        try { process.kill(dueno, 0); vive = true; } catch { vive = false; }
        if (vive) continue;                       // el puesto está en uso por alguien vivo
        try { unlinkSync(cerrojo); } catch {}     // quedó de un proceso muerto: se libera
      }
      if (!await vivo(puerto)) continue;          // ese navegador no está levantado
      writeFileSync(cerrojo, String(process.pid));
      return { puerto, numero: puerto - 9221, cerrojo };
    }
    await esperar(2000);
  }
  throw new Error('los diez puestos de la flota están ocupados');
}

// ---------------------------------------------------------------------------------------------------
// UNA CONSULTA EN EL NAVEGADOR: abre una pestaña, busca en DuckDuckGo, espera y se lleva los resultados.
// El WebSocket es el que trae Node: no hay dependencia que se pueda romper.
// ---------------------------------------------------------------------------------------------------
async function buscar(puerto, consulta) {
  const tab = await (await fetch(`http://127.0.0.1:${puerto}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let id = 0; const esperando = new Map();
  const enviar = (method, params = {}) => new Promise(res => {
    const n = ++id; esperando.set(n, res); ws.send(JSON.stringify({ id: n, method, params }));
  });
  await new Promise((r, x) => { ws.addEventListener('open', r); ws.addEventListener('error', x); });
  ws.addEventListener('message', e => {
    const d = JSON.parse(e.data);
    if (d.id && esperando.has(d.id)) { esperando.get(d.id)(d); esperando.delete(d.id); }
  });
  try {
    await enviar('Page.enable');
    await enviar('Page.navigate', { url: `https://duckduckgo.com/?q=${encodeURIComponent(consulta)}&ia=web` });
    await esperar(ESPERA_MS);
    const r = await enviar('Runtime.evaluate', { returnByValue: true, expression: `
      (() => {
        const salida = [];
        document.querySelectorAll('article[data-testid="result"], li[data-layout="organic"]').forEach(a => {
          const h = a.querySelector('h2, a[data-testid="result-title-a"]');
          const en = a.querySelector('a[data-testid="result-extras-url-link"], a[href^="http"]');
          const s = a.querySelector('[data-result="snippet"]');
          const u = (en?.href || a.querySelector('a[href]')?.href || '').split('&rut=')[0];
          if (h && u && !/duckduckgo\\.com/.test(u)) {
            salida.push({ titulo: (h.innerText || '').trim().slice(0, 160),
                          extracto: (s?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 300),
                          enlace: u.slice(0, 300) });
          }
        });
        return salida.slice(0, ${POR_CONSULTA});
      })()` });
    return r.result?.result?.value ?? [];
  } finally {
    try { await fetch(`http://127.0.0.1:${puerto}/json/close/${tab.id}`); } catch {}
    try { ws.close(); } catch {}
  }
}

// ---------------------------------------------------------------------------------------------------
const puesto = await tomarPuesto();
console.log(`[buscador] puesto ${puesto.numero} de 10 (puerto ${puesto.puerto})`);
const guardado = { cuando: new Date().toISOString(), negocio, consultas: [] };
for (const c of consultas) {
  const t0 = Date.now();
  let resultados = [];
  try { resultados = await buscar(puesto.puerto, c); }
  catch (e) { console.error(`[buscador] falló «${c}»: ${String(e).slice(0, 120)}`); }
  const seg = Math.round((Date.now() - t0) / 1000);
  console.log(`[buscador] «${c}»: ${resultados.length} resultados en ${seg} s`);
  guardado.consultas.push({ consulta: c, segundos: seg, resultados });
}
writeFileSync(salida, JSON.stringify(guardado, null, 1));
console.log(`[buscador] guardado en ${salida}: ${guardado.consultas.length} consultas, ${guardado.consultas.reduce((s, c) => s + c.resultados.length, 0)} resultados`);
try { execSync(`rm -f ${puesto.cerrojo}`); } catch {}
process.exit(0);
