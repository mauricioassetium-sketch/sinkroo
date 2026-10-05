
// ¿Puede el navegador de la flota buscar en internet y devolver resultados de verdad? (WebSocket nativo de Node)
const puerto = process.argv[2] || '9222';
const consulta = process.argv[3] || 'top source markets luxury travellers Dubai 2025';
const tab = await (await fetch(`http://127.0.0.1:${puerto}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0; const esperando = new Map();
const enviar = (method, params = {}) => new Promise(res => { const n = ++id; esperando.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
await new Promise(r => ws.addEventListener('open', r));
ws.addEventListener('message', e => { const d = JSON.parse(e.data); if (d.id && esperando.has(d.id)) { esperando.get(d.id)(d); esperando.delete(d.id); } });
await enviar('Page.enable');
await enviar('Page.navigate', { url: `https://duckduckgo.com/?q=${encodeURIComponent(consulta)}&ia=web` });
await new Promise(r => setTimeout(r, 9000));
const r = await enviar('Runtime.evaluate', { returnByValue: true, expression: `
  (() => {
    const t = [];
    document.querySelectorAll('article[data-testid="result"], li[data-layout="organic"]').forEach(a => {
      const h = a.querySelector('h2, a[data-testid="result-title-a"]');
      const s = a.querySelector('[data-result="snippet"]');
      if (h) t.push({ titulo: (h.innerText||'').trim().slice(0,120), extracto: (s?.innerText||'').trim().slice(0,180) });
    });
    return { titulo: document.title.slice(0,70), resultados: t.length, primeros: t.slice(0,4) };
  })()` });
console.log(JSON.stringify(r.result?.result?.value ?? r.result, null, 1));
await fetch(`http://127.0.0.1:${puerto}/json/close/${tab.id}`).catch(() => {});
process.exit(0);
