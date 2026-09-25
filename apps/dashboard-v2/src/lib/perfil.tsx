import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// =============================================================================================
// PERFIL — los datos del dueño de la cuenta + LA MARCA DEL CLIENTE (su logo y sus colores).
//
// Es editable desde el sidebar y todo el panel los usa: el saludo del hero, el nombre del
// negocio, la inicial del avatar, y ahora también el logo y la paleta con la que el cliente
// quiere ver pintado SU dashboard.
//
// La marca se aplica con variables CSS en `document.documentElement` (ver `aplicarMarca`): así
// el degradado de los botones, el brillo del hero, el acento del menú y la serie principal del
// gráfico grande toman los colores del cliente sin tocar componente por componente.
//
// REGLA QUE NO SE ROMPE: los semáforos (verde de aprobado, ámbar de revisar, rojo de crítico y
// gris de neutro) NO se pintan nunca con la paleta del cliente. Si su color se parece a uno de
// ellos, igual gana el semáforo: el rojo tiene que seguir significando crítico.
// =============================================================================================

export interface Perfil {
  nombre: string;
  marca: string;
  email: string;
  telefono: string;
  zona: string;
  moneda: string;
  /** Color del avatar (las iniciales). */
  color: string;
  /** Logo del negocio, guardado como data URL. Vacío = se usa el logo de Sinkroo. */
  logo: string;
  /** Color principal de la paleta de su negocio. Vacío = se usan los colores de Sinkroo. */
  col1: string;
  /** Color de acento de la paleta de su negocio. */
  col2: string;
}

export const PERFIL_INICIAL: Perfil = {
  nombre: 'María Paula',
  marca: 'Skincare Natural',
  email: 'hola@skincarenatural.com',
  telefono: '+57 300 555 2341',
  zona: 'Medellín · GMT-5',
  moneda: 'Peso colombiano',
  color: '#a855f7',
  logo: '',
  col1: '',
  col2: '',
};

// =============================================================================================
// ZONA HORARIA Y MONEDA — los lugares donde puede estar el negocio del cliente.
//
// EL BUSCADOR DE UBICACIÓN: el cliente escribe su ciudad (o su país) y el panel le propone los
// lugares que conoce. Elegir uno aplica DOS cosas de una sola vez —la zona horaria con la que el
// motor publica y la moneda con la que se muestran los presupuestos y las ventas—, porque las dos
// salen del mismo dato: dónde está el negocio.
//
// Cada lugar lleva su bandera (para reconocerlo de un vistazo) y su zona escrita igual que en los
// chips (`Ciudad · GMT±n`), que es el texto que el cliente ve y elige.
// =============================================================================================

export interface Lugar {
  /** La ciudad, como la escribe la gente. */
  nombre: string;
  pais: string;
  /** La zona horaria, con el mismo texto que usan los chips (`Ciudad · GMT±n`). */
  zona: string;
  /** El nombre de la moneda del país. Tiene que existir en `MONEDAS`. */
  moneda: string;
  /** El emoji de la bandera del país. */
  bandera: string;
}

/** Los lugares que el buscador conoce. La lista vive aquí: esta maqueta no tiene backend. */
export const LUGARES: Lugar[] = [
  { nombre: 'Medellín', pais: 'Colombia', zona: 'Medellín · GMT-5', moneda: 'Peso colombiano', bandera: '🇨🇴' },
  { nombre: 'Santiago', pais: 'Chile', zona: 'Santiago · GMT-3', moneda: 'Peso chileno', bandera: '🇨🇱' },
  { nombre: 'São Paulo', pais: 'Brasil', zona: 'São Paulo · GMT-3', moneda: 'Real brasileño', bandera: '🇧🇷' },
  { nombre: 'Bogotá', pais: 'Colombia', zona: 'Bogotá · GMT-5', moneda: 'Peso colombiano', bandera: '🇨🇴' },
  { nombre: 'Ciudad de México', pais: 'México', zona: 'Ciudad de México · GMT-6', moneda: 'Peso mexicano', bandera: '🇲🇽' },
  { nombre: 'Miami', pais: 'EE. UU.', zona: 'Miami · GMT-4', moneda: 'Dólar', bandera: '🇺🇸' },
  { nombre: 'Madrid', pais: 'España', zona: 'Madrid · GMT+2', moneda: 'Euro', bandera: '🇪🇸' },
];

/**
 * Las zonas horarias para elegir a mano. Salen de los lugares: una sola lista, sin datos repetidos
 * que se puedan desincronizar (si mañana se agrega un lugar, su zona aparece sola en los chips).
 */
export const ZONAS = Array.from(new Set(LUGARES.map(l => l.zona)));

export interface Moneda {
  nombre: string;
  /** El código de tres letras: es lo que se ve al lado del nombre. */
  codigo: string;
  /** El símbolo que va delante del número en la conversión del día. */
  simbolo: string;
}

/**
 * Las monedas con las que se muestran los presupuestos y las ventas. El DÓLAR ESTÁ SIEMPRE: es la
 * base contra la que se compara todo, así que nunca puede faltar de la lista.
 */
export const MONEDAS: Moneda[] = [
  { nombre: 'Peso colombiano', codigo: 'COP', simbolo: '$' },
  { nombre: 'Peso chileno', codigo: 'CLP', simbolo: '$' },
  { nombre: 'Peso mexicano', codigo: 'MXN', simbolo: '$' },
  { nombre: 'Real brasileño', codigo: 'BRL', simbolo: 'R$' },
  { nombre: 'Euro', codigo: 'EUR', simbolo: '€' },
  { nombre: 'Dólar', codigo: 'USD', simbolo: 'US$' },
];

/** La moneda por su nombre. Si el nombre guardado ya no existe, cae en la primera (nunca queda vacío). */
export const monedaDe = (nombre: string): Moneda => MONEDAS.find(m => m.nombre === nombre) ?? MONEDAS[0];

/** Saca las tildes y las mayúsculas: para buscar «medellin» y encontrar «Medellín». */
const sinTildes = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Los lugares que coinciden con lo que el cliente escribió (por ciudad, país o moneda). */
export function buscarLugares(consulta: string): Lugar[] {
  const q = sinTildes(consulta);
  if (q.length < 2) return [];
  return LUGARES.filter(l => sinTildes(`${l.nombre} ${l.pais} ${l.moneda}`).includes(q));
}

// =============================================================================================
// LA CONVERSIÓN DEL DÍA — ATENCIÓN: SON VALORES DE MUESTRA, NO SON UN DATO EN VIVO.
//
// Esta maqueta no tiene backend ni internet: los números de abajo están escritos a mano para que la
// pantalla se vea como se va a ver. En producción NO se escriben en el código: se piden todos los
// días a la API del banco central del país —Banco de la República (Colombia), Banco Central de
// Chile, Banxico (México), Banco Central do Brasil, Banco Central Europeo— y se
// guardan con la fecha del día. El dólar es la BASE: todo se muestra contra 1 USD.
// =============================================================================================

export interface Cambio {
  /** Cuántas unidades de la moneda local equivalen a 1 dólar estadounidense. */
  porUsd: number;
  /** El banco central que publica ese número. */
  banco: string;
}

export const CAMBIOS: Record<string, Cambio> = {
  CLP: { porUsd: 946, banco: 'Banco Central de Chile' },
  COP: { porUsd: 4000, banco: 'Banco de la República (Colombia)' },
  MXN: { porUsd: 18.42, banco: 'Banco de México' },
  BRL: { porUsd: 5.42, banco: 'Banco Central do Brasil' },
  EUR: { porUsd: 0.92, banco: 'Banco Central Europeo' },
  USD: { porUsd: 1, banco: 'Reserva Federal (EE. UU.)' },
};

/** El tipo de cambio de la moneda elegida (siempre contra el dólar). */
export const cambioDe = (nombreMoneda: string): Cambio => CAMBIOS[monedaDe(nombreMoneda).codigo] ?? CAMBIOS.USD;

/** La fecha del tipo de cambio mostrado, en dd/mm/aaaa. En producción la manda el banco central. */
export function fechaDeCambio(d: Date = new Date()): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Un número como se escribe en Colombia: separador de miles con punto y sin decimales de más. */
export function numeroConMiles(n: number): string {
  return n.toLocaleString('es-CO', { maximumFractionDigits: n >= 100 ? 0 : 2 });
}

/**
 * Lo que se muestra en el bloque de la conversión del día, ya armado: el título con el número
 * (`1 USD = $4.000 COP`), la fecha y el banco que lo publica. Con el dólar elegido no hay
 * conversión: es la base.
 */
export function conversionDelDia(nombreMoneda: string): { titulo: string; detalle: string; fecha: string; banco: string; esBase: boolean } {
  const mon = monedaDe(nombreMoneda);
  const cambio = cambioDe(nombreMoneda);
  const fecha = fechaDeCambio();
  if (mon.codigo === 'USD') {
    return {
      titulo: '1 USD = 1 USD',
      detalle: 'El dólar es la base: las demás monedas se muestran contra él.',
      fecha, banco: cambio.banco, esBase: true,
    };
  }
  const cien = `${mon.simbolo}${numeroConMiles(cambio.porUsd * 100)} ${mon.codigo}`;
  return {
    titulo: `1 USD = ${mon.simbolo}${numeroConMiles(cambio.porUsd)} ${mon.codigo}`,
    detalle: `Con este tipo de cambio, US$ 100 son ${cien}.`,
    fecha, banco: cambio.banco, esBase: false,
  };
}

export const COLORES_AVATAR = ['#a855f7', '#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4'];

/** Los colores de la casa: es lo que se ve mientras el cliente no cargue su paleta. */
export const PALETA_SINKROO = { col1: '#9333ea', col2: '#c084fc' };

/**
 * Paletas ya armadas para elegir de un clic. Las tres primeras son la marca del caso
 * (skincare natural: verde salvia #4A7C59, crema #F5EFE6 y ámbar #E8A33D).
 */
export const PALETAS: { nombre: string; detalle: string; col1: string; col2: string }[] = [
  { nombre: 'Salvia', detalle: '+ ámbar', col1: '#4A7C59', col2: '#E8A33D' },
  { nombre: 'Salvia', detalle: '+ crema', col1: '#4A7C59', col2: '#F5EFE6' },
  { nombre: 'Ámbar', detalle: '+ salvia', col1: '#E8A33D', col2: '#4A7C59' },
  { nombre: 'Crema', detalle: '+ salvia', col1: '#F5EFE6', col2: '#4A7C59' },
  { nombre: 'Verde bosque', detalle: '+ arena', col1: '#1F5136', col2: '#D9C7A3' },
  { nombre: 'Azul océano', detalle: '+ arena', col1: '#2F6F8F', col2: '#E9C46A' },
  { nombre: 'Bordó', detalle: '+ rosa', col1: '#8E3B5E', col2: '#E8A0B8' },
  { nombre: 'Sinkroo', detalle: 'violeta', col1: PALETA_SINKROO.col1, col2: PALETA_SINKROO.col2 },
];

/**
 * Colores sueltos para armar la paleta a mano. Los tres primeros son los de la marca del caso;
 * el resto son negocios típicos (océano, bordó, oliva, terracota) y los últimos bien oscuros,
 * que también tienen que verse bien.
 */
export const COLORES_MARCA = [
  '#4A7C59', '#F5EFE6', '#E8A33D',
  '#1F5136', '#D9C7A3', '#2F6F8F', '#8E3B5E', '#C4553B', '#7C6A9C', '#3F3A34',
];

// =============================================================================================
// COLORES: lectura, mezcla y ajustes. Todo en hex para que sea fácil de leer en el código.
// =============================================================================================

function aRgb(hex: string): [number, number, number] {
  let h = (hex || '').trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [168, 85, 247];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function aHex(rgb: number[]): string {
  return '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

/** El color convertido a "168, 85, 247": para usarlo dentro de un rgba(...) en el CSS. */
export function tripleDe(hex: string): string {
  return rgbTexto(hex);
}

function rgbTexto(hex: string): string {
  const [r, g, b] = aRgb(hex);
  return `${r}, ${g}, ${b}`;
}

/** Mezcla dos colores: t = 0 devuelve `a`, t = 1 devuelve `b`. */
export function mezclar(a: string, b: string, t: number): string {
  const A = aRgb(a), B = aRgb(b);
  return aHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

/** Brillo percibido del color: 0 = negro, 1 = blanco. */
export function brilloDe(hex: string): number {
  const [r, g, b] = aRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Lleva el brillo del color hasta el objetivo, mezclando con negro (`techo`) o con blanco. */
function llevarA(hex: string, objetivo: number, techo: boolean): string {
  let c = hex;
  for (let i = 0; i < 26; i++) {
    const l = brilloDe(c);
    if (techo ? l <= objetivo : l >= objetivo) break;
    c = mezclar(c, techo ? '#000000' : '#ffffff', 0.12);
  }
  return c;
}

/**
 * Un color del cliente que se pueda LEER sobre el fondo del tema: en el tema oscuro no puede ser
 * demasiado apagado y en el claro no puede ser demasiado claro. El tono es el suyo; solo se ajusta
 * el brillo. Es lo que usan las barras del gráfico y los acentos de texto.
 */
export function colorLegible(hex: string, temaClaro: boolean): string {
  return temaClaro ? llevarA(hex, 0.62, true) : llevarA(hex, 0.45, false);
}

/** Relleno de botones: un color clarísimo dejaría el texto blanco ilegible, así que se oscurece. */
export function colorDeRelleno(hex: string): string {
  return llevarA(hex, 0.72, true);
}

/** El degradado de la identidad (botones principales, gauge, acento del menú). */
export function gradienteMarca(col1: string, col2: string): string {
  const a = colorDeRelleno(col1), b = colorDeRelleno(col2);
  return `linear-gradient(135deg, ${a} 0%, ${mezclar(a, b, 0.5)} 45%, ${b} 100%)`;
}

/** Con qué color se escribe arriba del degradado, para que el texto siempre se lea. */
export function textoDeGradiente(col1: string, col2: string): string {
  const medio = (brilloDe(colorDeRelleno(col1)) + brilloDe(colorDeRelleno(col2))) / 2;
  return medio > 0.62 ? '#14110d' : '#ffffff';
}

// =============================================================================================
// LOS SEMÁFOROS: lo único que la paleta del cliente NO puede tocar.
// =============================================================================================

export const SEMAFOROS = [
  { nombre: 'verde de «está bien / aprobado»', hex: '#22c55e' },
  { nombre: 'ámbar de «ojo, revise»', hex: '#f59e0b' },
  { nombre: 'rojo de «crítico / rechazado»', hex: '#ef4444' },
  { nombre: 'gris de lo neutro', hex: '#9a8fad' },
];

/** Si el color elegido se parece a un semáforo, devuelve su nombre (o null si no choca). */
export function semaforoQueChoca(hex: string): string | null {
  if (!hex) return null;
  const A = aRgb(hex);
  for (const s of SEMAFOROS) {
    const B = aRgb(s.hex);
    if (Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) < 55) return s.nombre;
  }
  return null;
}

// =============================================================================================
// APLICAR LA MARCA EN TODO EL PANEL
// =============================================================================================

/** Las variables que se pisan en la raíz mientras el cliente tenga paleta propia. */
export const VARS_MARCA = [
  '--grad', '--sobre-grad',
  '--acento', '--acento-2', '--acento-rgb', '--acento2-rgb',
  '--brillo', '--brillo2',
];

const ESTILO_TEMA = 'sinkroo-marca-tema';

/** ¿El cliente cargó su propia paleta? Alcanza con UN color: el otro se completa solo. */
export const tieneMarca = (p: Perfil) => !!(p.col1 || p.col2);

/**
 * La paleta que se pinta de verdad. Si el cliente eligió un solo color, el otro se saca de ese
 * mismo: así el panel cambia con el PRIMER clic (que es lo que hace que se pueda jugar) y nunca
 * queda a mitad de camino. Con los dos colores vacíos no hay marca y manda Sinkroo.
 */
export function paletaEfectiva(p: Perfil): { col1: string; col2: string } {
  if (p.col1 && p.col2) return { col1: p.col1, col2: p.col2 };
  if (p.col1) return { col1: p.col1, col2: mezclar(p.col1, '#ffffff', 0.34) };
  return { col1: p.col2, col2: p.col2 };
}

/**
 * Pinta el panel con la marca del cliente. Si no hay paleta, borra todo y el panel vuelve a verse
 * con los colores de Sinkroo (nada se rompe y nada queda a medias).
 */
export function aplicarMarca(p: Perfil) {
  const raiz = document.documentElement;
  VARS_MARCA.forEach(v => raiz.style.removeProperty(v));
  raiz.classList.toggle('marca-cliente', tieneMarca(p));
  document.getElementById(ESTILO_TEMA)?.remove();
  if (!tieneMarca(p)) return;

  const { col1, col2 } = paletaEfectiva(p);
  raiz.style.setProperty('--acento', col1);
  raiz.style.setProperty('--acento-2', col2);
  raiz.style.setProperty('--acento-rgb', rgbTexto(col1));
  raiz.style.setProperty('--acento2-rgb', rgbTexto(col2));
  raiz.style.setProperty('--brillo', rgbTexto(col1));
  raiz.style.setProperty('--brillo2', rgbTexto(col2));
  raiz.style.setProperty('--grad', gradienteMarca(col1, col2));
  raiz.style.setProperty('--sobre-grad', textoDeGradiente(col1, col2));

  // Lo que depende del tema (textos y barras del gráfico) va en su propia hojita: deja de
  // depender de que React vuelva a renderizar cuando el cliente cambia de tema.
  const est = document.createElement('style');
  est.id = ESTILO_TEMA;
  const fila = (temaClaro: boolean) => {
    const a = colorLegible(col1, temaClaro), b = colorLegible(col2, temaClaro);
    const g = `linear-gradient(135deg, ${a} 0%, ${mezclar(a, b, 0.5)} 45%, ${b} 100%)`;
    return `--acento-txt:${a};--acento-txt-rgb:${rgbTexto(a)};--acento2-txt:${b};` +
      `--acento2-txt-rgb:${rgbTexto(b)};--grad-texto:${g}`;
  };
  est.textContent = `:root{${fila(false)}}\nhtml.light{${fila(true)}}`;
  document.head.appendChild(est);
}

/** Dos iniciales a partir del nombre, para el avatar. Si no hay nombre, cae en "Su". */
export function inicialesDe(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return 'Su';
  const a = partes[0][0] ?? '';
  const b = partes.length > 1 ? partes[1][0] ?? '' : (partes[0][1] ?? '');
  return (a + b).toUpperCase();
}

/** El nombre de pila, para saludar. */
export function nombreDePila(nombre: string) {
  return nombre.trim().split(/\s+/)[0] || 'hola';
}

// =============================================================================================
// EL LOGO: se achica antes de guardarlo, para que no se coma el espacio del navegador.
// =============================================================================================

/** Lee una imagen, la achica a `lado` px como máximo y la devuelve como data URL. */
export function leerLogo(archivo: File, lado = 320): Promise<string> {
  return new Promise((resolver, rechazar) => {
    if (!archivo.type.startsWith('image/')) {
      rechazar(new Error('El archivo tiene que ser una imagen: PNG, JPG o SVG.'));
      return;
    }
    if (archivo.size > 6 * 1024 * 1024) {
      rechazar(new Error('La imagen pesa más de 6 MB. Pruebe con una más chica.'));
      return;
    }
    const lector = new FileReader();
    lector.onerror = () => rechazar(new Error('No pudimos leer el archivo.'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => rechazar(new Error('El archivo no parece una imagen que se pueda mostrar.'));
      img.onload = () => {
        try {
          const ancho = img.naturalWidth || img.width || lado;
          const alto = img.naturalHeight || img.height || lado;
          const escala = Math.min(1, lado / Math.max(ancho, alto));
          const w = Math.max(1, Math.round(ancho * escala));
          const h = Math.max(1, Math.round(alto * escala));
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          const ctx = cv.getContext('2d');
          if (!ctx) { resolver(String(lector.result)); return; }
          ctx.drawImage(img, 0, 0, w, h);
          resolver(cv.toDataURL('image/png'));
        } catch {
          resolver(String(lector.result));
        }
      };
      img.src = String(lector.result);
    };
    lector.readAsDataURL(archivo);
  });
}

// =============================================================================================
// CONTEXTO
// =============================================================================================

type ContextoPerfil = {
  perfil: Perfil;
  /** Lo mismo que `perfil`, pero con la edición en curso encima: es lo que se muestra en pantalla. */
  perfilVisible: Perfil;
  /** Guarda y devuelve false si el navegador no dejó guardar (modo privado, o el logo es muy grande). */
  guardar: (p: Perfil) => boolean;
  /** Muestra un perfil sin guardarlo: es la vista previa en vivo de «Haga suyo este panel» (logo y colores). */
  previsualizar: (p: Perfil) => void;
  /** Corta la vista previa y vuelve a lo guardado. */
  terminarPrevia: () => void;
};

const Ctx = createContext<ContextoPerfil>({
  perfil: PERFIL_INICIAL,
  perfilVisible: PERFIL_INICIAL,
  guardar: () => true,
  previsualizar: () => {},
  terminarPrevia: () => {},
});

const CLAVE = 'sinkroo-perfil';

function leerGuardado(): Perfil {
  try {
    const guardado = localStorage.getItem(CLAVE);
    return guardado ? { ...PERFIL_INICIAL, ...JSON.parse(guardado) } : PERFIL_INICIAL;
  } catch { return PERFIL_INICIAL; }
}

export function PerfilProvider({ children }: { children: ReactNode }) {
  // Se guarda en el navegador: lo que usted edita sobrevive a recargar la página.
  const [perfil, setPerfil] = useState<Perfil>(leerGuardado);
  // Mientras el pop-up de personalización está abierto, aquí vive el borrador: así el logo y los
  // colores se ven en su lugar (el hero, la barra de arriba y el menú) antes de guardar.
  const [previa, setPrevia] = useState<Perfil | null>(null);

  // La marca del cliente vive en las variables CSS de la raíz. Se repinta con lo que se está
  // VIENDO: si hay una vista previa abierta manda la vista previa, si no el perfil guardado.
  // (Antes miraba sólo el guardado: al guardar los datos de cuenta con el pop-up abierto, los
  // colores que usted estaba eligiendo volvían atrás en la pantalla aunque el pop-up siguiera
  // mostrándolos elegidos.)
  useEffect(() => { aplicarMarca(previa ?? perfil); }, [perfil, previa]);

  const guardar = (p: Perfil) => {
    setPerfil(p);
    try { localStorage.setItem(CLAVE, JSON.stringify(p)); return true; }
    catch { return false; } // modo privado: queda en memoria hasta recargar
  };

  const previsualizar = (p: Perfil) => { setPrevia(p); aplicarMarca(p); };
  const terminarPrevia = () => { setPrevia(null); aplicarMarca(perfil); };

  const valor = { perfil, perfilVisible: previa ?? perfil, guardar, previsualizar, terminarPrevia };
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const usePerfil = () => useContext(Ctx);
