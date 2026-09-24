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
  telefono: '+54 9 11 5555-2341',
  zona: 'Buenos Aires · GMT-3',
  moneda: 'Peso argentino',
  color: '#a855f7',
  logo: '',
  col1: '',
  col2: '',
};

export const ZONAS = ['Buenos Aires · GMT-3', 'Santiago · GMT-3', 'Bogotá · GMT-5', 'Ciudad de México · GMT-6', 'Madrid · GMT+2'];
export const MONEDAS = ['Peso argentino', 'Peso chileno', 'Peso colombiano', 'Peso mexicano', 'Dólar', 'Euro'];
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
  { nombre: 'ámbar de «ojo, revisá»', hex: '#f59e0b' },
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

/** ¿El cliente cargó su propia paleta? */
export const tieneMarca = (p: Perfil) => !!(p.col1 && p.col2);

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

  const { col1, col2 } = p;
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

/** Dos iniciales a partir del nombre, para el avatar. Si no hay nombre, cae en "TU". */
export function inicialesDe(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return 'TU';
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
      rechazar(new Error('La imagen pesa más de 6 MB. Probá con una más chica.'));
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
  /** Muestra un perfil sin guardarlo: es la vista previa en vivo del modal (logo y colores). */
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
  // Se guarda en el navegador: lo que editás sobrevive a recargar la página.
  const [perfil, setPerfil] = useState<Perfil>(leerGuardado);
  // Mientras el modal está abierto, acá vive el borrador: así el logo y el nombre se ven en su
  // lugar (el hero y la barra de arriba) antes de guardar.
  const [previa, setPrevia] = useState<Perfil | null>(null);

  // La marca del cliente vive en las variables CSS de la raíz. Cuando cambia (o cuando se
  // canceló una edición), el panel entero se repinta solo.
  useEffect(() => { aplicarMarca(perfil); }, [perfil]);

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
