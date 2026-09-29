// =============================================================================================
// EL EXTRACTOR DE FICHAS — el JavaScript que se le manda a la página de la Biblioteca de Anuncios.
//
// Vive en su propio archivo por una razón concreta: antes iba dentro del código del trabajador, como
// texto dentro de otro texto, y ahí los saltos de línea y las barras se mezclaban con los escapes. Un
// error en ese embrollo hacía que la página rechazara la lectura. Acá es JavaScript de verdad: se lee
// tal cual y se manda tal cual. Lo que se prueba es exactamente lo que corre.
//
// QUÉ HACE, PASO POR PASO
//   1. Busca los nodos donde la plataforma escribe «Library ID» (es lo único que no cambia nunca).
//   2. De cada uno SUBE hasta la TARJETA del anuncio: la más grande que siga siendo de UNA sola ficha.
//      Se corta cuando aparece «Ad Library Report» (el marco de la página) o cuando hay más de un
//      Library ID en la misma caja (ahí ya no es una ficha, es la lista).
//   3. De la tarjeta saca: la fecha de inicio, el ANUNCIANTE (la línea de arriba de «Sponsored»), el
//      COPY (lo que va debajo), el botón, el destino y las plazas.
//   4. Deduplica por Library ID: la plataforma muestra el mismo anuncio repetido.
//
// Lo que la ficha no traiga, queda vacío. No se inventa ningún campo.
// =============================================================================================
(() => {
  const nodos = [...document.querySelectorAll('div')]
    .filter(d => /Library ID:/i.test(d.innerText || '') && (d.innerText || '').length < 4000);
  const porId = new Map();

  for (const chico of nodos) {
    const id = ((chico.innerText || '').match(/Library ID:\s*(\d+)/) || [])[1];
    if (!id) continue;

    let caja = chico;
    let tarjeta = chico;
    for (let i = 0; i < 7 && caja.parentElement; i++) {
      caja = caja.parentElement;
      const textoCaja = caja.innerText || '';
      if (/Ad Library Report/i.test(textoCaja)) break;
      const cuantos = (textoCaja.match(/Library ID:/g) || []).length;
      if (cuantos === 1 && textoCaja.length < 6000 && textoCaja.length > (tarjeta.innerText || '').length) {
        tarjeta = caja;
      }
    }

    const texto = (tarjeta.innerText || '').replace(/\s*\n\s*/g, '\n').trim();
    const fecha = (texto.match(/Started running on ([A-Za-z]+ \d+, \d{4})/) || [])[1] || '';

    const lineas = texto.split('\n').map(s => s.trim()).filter(Boolean)
      .filter(s => !/^(Active|Inactive)$/i.test(s))
      .filter(s => !/^Library ID/i.test(s))
      .filter(s => !/^Started running/i.test(s))
      .filter(s => !/^(Facebook|Instagram|Audience Network|Messenger|Threads)$/.test(s))
      .filter(s => !/^(See ad details|Platforms|Open Dropdown|Active|Menu|Close)$/i.test(s))
      .filter(s => !/^This ad has multiple/i.test(s));

    const iSp = lineas.findIndex(l => l.toLowerCase() === 'sponsored');
    const anunciante = iSp > 0 ? lineas[iSp - 1] : '';
    const copy = (iSp >= 0 ? lineas.slice(iSp + 1).join(' · ') : lineas.join(' · ')).slice(0, 400);
    const cta = (texto.match(/\n(Shop Now|Send WhatsApp message|Send message|Learn more|Sign up|Book now|Contact us|Get offer|Buy now|Order now|Apply now|Subscribe)\n/i) || [])[1] || '';
    const destino = (texto.match(/\n([A-Z0-9.\-]{4,40}\.(COM|CO|CC|NET|ORG|ONLINE|STORE|COM\.CO|IO|XYZ|AI))\b/) || [])[1] || '';
    const plataformas = [...new Set((texto.match(/Facebook|Instagram|Audience Network|Messenger|Threads/g) || []))];

    porId.set(id, { id, fecha, anunciante, copy, cta, destino, plataformas });
  }
  return JSON.stringify([...porId.values()]);
})()
