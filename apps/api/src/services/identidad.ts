// =============================================================================================
// LA IDENTIDAD DEL NEGOCIO, MEDIDA EN SU PROPIA PÁGINA
//
// Cuando el mercado todavía no está leído, o cuando hay que armar una pieza, el negocio ya tiene una
// fuente que nadie usa: SU PROPIA WEB. Ahí están sus colores, su tipografía, su logo y las imágenes que
// ya eligió. Eso no se inventa ni se supone: se lee de su CSS y de su HTML. Es la diferencia entre
// «usamos azul porque nos gusta» y «su marca usa este azul, medido en 42 declaraciones de su hoja de
// estilo».
//
// Lo que se hace, en corto:
//   · Se baja el HTML de la página (y hasta tres hojas de estilo que enlace) y se cuentan las
//     DECLARACIONES de color y de tipografía, no el texto de la página.
//   · De los colores se descartan blanco, negro y grises: esos no son marca, son fondo de todo el mundo.
//     Del que queda, se dice en qué se usa más (texto, fondo o borde).
//   · Las imágenes se leen del HTML: la que usa al compartir el enlace, su logo y las fotos, con su
//     dirección real. Sin descargarlas: se dice de dónde salieron.
//   · Si la página no se puede leer (bloquea, tarda, es solo JavaScript), se dice el motivo y NO se
//     completa con nada inventado: la pieza se arma con lo que el negocio dijo de sí mismo.
//
// Nada de esto gasta créditos ni necesita llaves: es leer lo que ya está publicado.
// =============================================================================================

const UA = 'Sinkroo/1.0 (+https://sinkroo.com; info@sinkroo.com)';
/** El tope de cada bajada: una hoja de estilo más grande que esto no es una hoja de estilo. */
const TOPE_HTML = 400_000;
const TOPE_CSS = 250_000;

export type Identidad = {
  url: string;
  leida: boolean;
  /** Por qué no se pudo leer, cuando no se pudo. En castellano y sin tecnicismos. */
  motivo: string;
  /** Los colores de marca: el hex, cuántas veces aparece y en qué se usa más. */
  colores: { hex: string; usos: number; rol: string }[];
  /** Las tipografías declaradas, con la familia y el tamaño más usado. */
  tipografias: { familia: string; usos: number; tamano: string }[];
  /** Las imágenes que ya usa, con su dirección real y para qué son. */
  imagenes: { url: string; para: string }[];
  titulo: string;
  /** Cómo se midió todo esto, para que la pieza pueda decirlo. */
  como_se_midio: string;
  fuente: string;
};

/** Los colores que no son marca: el blanco, el negro y los grises los usa cualquier web. */
const esMarca = (hex: string) => {
  if (hex === '#ffffff' || hex === '#000000') return false;
  const r = hex.slice(1, 3), g = hex.slice(3, 5), b = hex.slice(5, 7);
  return !(r === g && g === b);
};

/** Un color de CSS a hex de seis dígitos. El alfa se descarta: para un prompt no cambia el color. */
export function colorAHex(crudo: string): string {
  const s = String(crudo || '').trim().toLowerCase();
  if (s.startsWith('#')) {
    const h = s.slice(1);
    if (h.length === 3) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
    if (h.length === 6) return `#${h}`;
    if (h.length === 8) return `#${h.slice(0, 6)}`;
    return '';
  }
  const m = s.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  if (!m) return '';
  const hx = (n: string) => Math.max(0, Math.min(255, Math.round(Number(n)))).toString(16).padStart(2, '0');
  return `#${hx(m[1])}${hx(m[2])}${hx(m[3])}`;
}

/** En qué se usa un color, según la propiedad de CSS donde aparece. */
const rolDePropiedad = (prop: string) => {
  if (prop === 'color' || prop === 'fill' || prop === 'stroke') return 'texto y detalles';
  if (prop.startsWith('background')) return 'fondo';
  if (prop.startsWith('border') || prop === 'outline') return 'bordes';
  return 'detalles';
};

/**
 * Lee la identidad de una página: sus colores, sus tipografías y sus imágenes. Nunca lanza: si algo
 * falla, devuelve `leida: false` con el motivo dicho, para que quien la use lo pueda contar.
 */
export async function leerIdentidadDeLaPagina(url: string, ms = 12_000): Promise<Identidad> {
  const vacia = (motivo: string): Identidad => ({
    url, leida: false, motivo, colores: [], tipografias: [], imagenes: [], titulo: '',
    como_se_midio: '', fuente: '',
  });
  let limpia = String(url || '').trim();
  if (!limpia) return vacia('el negocio no cargó ninguna página web');
  if (!/^https?:\/\//i.test(limpia)) limpia = `https://${limpia.replace(/^\/+/, '')}`;
  if (!/^https?:\/\/[^\s.]+\.[^\s]+/i.test(limpia)) return vacia('el enlace no parece una dirección web');

  let html = '';
  try {
    const r = await fetch(limpia, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(Math.min(ms, 10_000)),
      redirect: 'follow',
    });
    if (!r.ok) return vacia(`su página respondió ${r.status}: no se pudo leer la identidad`);
    html = (await r.text()).slice(0, TOPE_HTML);
  } catch (e) {
    return vacia(`no se pudo leer su página: ${String((e as Error).message).slice(0, 90)}`);
  }

  // ---------- el CSS: el de las hojas que enlaza y el que va dentro del HTML ----------
  let css = '';
  let hojas = 0;
  const estilosDentro = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
  for (const bloque of estilosDentro.slice(0, 10)) css += ` ${bloque.replace(/<\/?style[^>]*>/gi, ' ')}`;
  const enlazadas = [...html.matchAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi)]
    .map(t => (t[0].match(/href=["']([^"']+)["']/i) || [])[1])
    .filter(Boolean)
    .slice(0, 3);
  for (const href of enlazadas) {
    try {
      const destino = new URL(href as string, limpia).toString();
      if (!/^https?:/i.test(destino)) continue;
      const r = await fetch(destino, {
        headers: { 'User-Agent': UA, Accept: 'text/css,*/*' },
        signal: AbortSignal.timeout(Math.min(ms, 8_000)),
      });
      if (!r.ok) continue;
      css += ` ${(await r.text()).slice(0, TOPE_CSS)}`;
      hojas++;
    } catch { /* una hoja que no se pudo leer no tumba la medición */ }
  }
  // Los colores que van en el propio HTML (estilos en línea y atributos style) también son suyos.
  const estilosEnLinea = html.match(/style=["'][^"']{1,400}["']/gi) || [];
  css += ` ${estilosEnLinea.slice(0, 200).join(' ')}`;

  // ---------- las variables del CSS ----------
  // Una web moderna no escribe el color ni la tipografía: los llama con var(--algo). Sin resolverlas, la
  // medición dice «var(--mono)», que no le sirve a nadie. Se resuelven hasta tres saltos y se sigue.
  const variables = new Map<string, string>();
  for (const v of css.matchAll(/--([\w-]{1,40})\s*:\s*([^;{}]{1,200})/g)) variables.set(v[1], v[2].trim());
  const resolver = (valor: string, hondo = 0): string => {
    if (hondo > 3 || !valor.includes('var(')) return valor;
    return resolver(valor.replace(/var\(\s*--([\w-]{1,40})\s*(?:,[^)]*)?\)/g, (_: string, n: string) => variables.get(n) ?? ''), hondo + 1);
  };

  // ---------- los colores, contando declaraciones ----------
  const colores = new Map<string, { usos: number; roles: Map<string, number> }>();
  const declColor = /([a-z-]{3,24})\s*:\s*([^;{}]{1,240})/gi;
  let m: RegExpExecArray | null;
  while ((m = declColor.exec(css))) {
    const prop = m[1].toLowerCase();
    const literales = resolver(m[2]).match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]{3,60}\)/g) || [];
    for (const lit of literales) {
      const hex = colorAHex(lit);
      if (!hex) continue;
      const ficha = colores.get(hex) ?? { usos: 0, roles: new Map<string, number>() };
      ficha.usos++;
      const rol = rolDePropiedad(prop);
      ficha.roles.set(rol, (ficha.roles.get(rol) ?? 0) + 1);
      colores.set(hex, ficha);
    }
  }
  const todos = [...colores.entries()].sort((a, b) => b[1].usos - a[1].usos);
  const deMarca = todos.filter(([hex]) => esMarca(hex));
  const elegidos = (deMarca.length ? deMarca : todos).slice(0, 6).map(([hex, ficha]) => {
    const rol = [...ficha.roles.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'detalles';
    return { hex, usos: ficha.usos, rol };
  });

  // ---------- las tipografías ----------
  const tipografias = new Map<string, { usos: number }>();
  for (const t of css.matchAll(/font-family\s*:\s*([^;{}]{1,160})/gi)) {
    const familia = resolver(String(t[1])).split(',')[0].replace(/["']/g, '').trim();
    if (!familia || /^(inherit|initial|unset|sans-serif|serif|monospace|system-ui)$/i.test(familia)) continue;
    tipografias.set(familia, { usos: (tipografias.get(familia)?.usos ?? 0) + 1 });
  }
  const tamanos = new Map<string, number>();
  for (const t of css.matchAll(/font-size\s*:\s*([\d.]+)(px|rem|em)\b/gi)) {
    const clave = `${t[1]}${t[2].toLowerCase()}`;
    tamanos.set(clave, (tamanos.get(clave) ?? 0) + 1);
  }
  // El tamaño del cuerpo: el más usado entre los que se leen en un celular (14 px para arriba). Si la web
  // solo declara tamaños chicos, se dice el más usado y no se supone ninguno.
  const porUso = [...tamanos.entries()].sort((a, b) => b[1] - a[1]);
  const delCuerpo = porUso.find(([clave]) => clave.endsWith('px') && parseFloat(clave) >= 14)
    ?? porUso.find(([clave]) => clave.endsWith('rem') && parseFloat(clave) >= 0.9);
  const tamanoComun = delCuerpo?.[0] ?? porUso[0]?.[0] ?? '';
  const tipografiasOrdenadas = [...tipografias.entries()]
    .sort((a, b) => b[1].usos - a[1].usos)
    .slice(0, 3)
    .map(([familia, v]) => ({ familia, usos: v.usos, tamano: tamanoComun }));

  // ---------- las imágenes que ya usa ----------
  const absolutizar = (u: string) => {
    try { return new URL(String(u).trim(), limpia).toString(); } catch { return ''; }
  };
  const imagenes: { url: string; para: string }[] = [];
  const og = (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || [])[1]
    || (html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) || [])[1];
  if (og) imagenes.push({ url: absolutizar(og), para: 'la imagen con la que presenta el enlace al compartirlo' });
  const icono = (html.match(/<link[^>]+rel=["'][^"']*(?:apple-touch-icon|icon)[^"']*["'][^>]*href=["']([^"']+)["']/i) || [])[1];
  if (icono) imagenes.push({ url: absolutizar(icono), para: 'su icono de marca' });
  for (const t of html.matchAll(/<img\b[^>]*>/gi)) {
    if (imagenes.length >= 6) break;
    const src = (t[0].match(/\bsrc=["']([^"']+)["']/i) || [])[1];
    if (!src || /^data:/i.test(src)) continue;
    const alt = (t[0].match(/\balt=["']([^"']{0,120})["']/i) || [])[1] || '';
    const par = /logo|marca|brand/i.test(src) || /logo|marca/i.test(alt)
      ? 'su logo'
      : (alt ? `una foto suya («${alt.slice(0, 60)}»)` : 'una foto de su web');
    imagenes.push({ url: absolutizar(src), para: par });
  }
  for (const t of css.matchAll(/background-image\s*:\s*url\((["']?)([^)"']{5,300})\1\)/gi)) {
    if (imagenes.length >= 8) break;
    const u = absolutizar(t[2]);
    if (u && !imagenes.some(i => i.url === u)) imagenes.push({ url: u, para: 'una imagen de fondo de su web' });
  }

  const titulo = ((html.match(/<title[^>]*>([\s\S]{0,200}?)<\/title>/i) || [])[1] || '').trim();
  const kb = (n: number) => `${Math.round(n / 1024)} KB`;
  const como = [
    `Se leyó su propia página (${limpia})`,
    `su HTML${hojas ? ` y ${hojas} ${hojas === 1 ? 'hoja de estilo' : 'hojas de estilo'}` : ''}`,
    `y se contaron las declaraciones de color y de tipografía del CSS (${kb(css.length)} en total).`,
    elegidos.length ? `Blanco, negro y grises quedan afuera: no son marca, los usa cualquier web.` : '',
    tipografiasOrdenadas.length ? `La tipografía sale de sus propias declaraciones font-family.` : '',
    imagenes.length ? `Las imágenes son las que su web ya publica, con su dirección real.` : '',
  ].filter(Boolean).join(' ');

  return {
    url: limpia, leida: true, motivo: '',
    colores: elegidos, tipografias: tipografiasOrdenadas, imagenes,
    titulo, como_se_midio: como, fuente: limpia,
  };
}
