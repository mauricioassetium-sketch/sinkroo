// =============================================================================================
// MIROFISH — el panel de agentes que vota las publicaciones.
//
// El flujo completo, tal como tiene que verse en Campañas:
//   1. Sinkroo investiga el mercado y detecta los COLORES de la competencia que mejor convierte.
//   2. Con eso MEJORA o CREA el material: escribe los prompts de las imágenes y los videos.
//   3. Arma un mínimo de 5 OPCIONES de publicación distintas.
//   4. MiroFish las vota, se ORDENAN DEL 1 AL 5, y las 3 PRIMERAS pasan a producción.
// =============================================================================================

export const PERFILES = [
  { k: 'impulsivo', nombre: 'Comprador impulsivo', mira: 'decide en 3 segundos' },
  { k: 'compara', nombre: 'El que compara', mira: 'mira precio y alternativa' },
  { k: 'desconfiado', nombre: 'Desconfiado', mira: 'busca la letra chica' },
  { k: 'experto', nombre: 'Experto del rubro', mira: 'detecta lo que no es real' },
  { k: 'nuevo', nombre: 'Alguien que nunca te vio', mira: 'no sabe qué vendés' },
] as const;

// ---------------------------------------------------------------------------------------------
// 1. LO QUE INVESTIGÓ — incluido el color del competidor que mejor convierte
// ---------------------------------------------------------------------------------------------
export const INVESTIGACION = {
  competidor: {
    nombre: 'Tienda Norte',
    leads: 240,
    detalle: 'Es el que más leads trae del rubro: 240 por mes, contra 96 tuyos.',
  },
  colores: [
    { hex: '#4A7C59', nombre: 'Verde salvia', uso: 'fondo de video y placas', por: 'su anuncio con más leads del rubro' },
    { hex: '#F5EFE6', nombre: 'Crema', uso: 'texto sobre el verde', por: 'se lee al sol en el celular' },
    { hex: '#E8A33D', nombre: 'Ámbar', uso: 'precio y oferta', por: 'es lo que más se toca en esos anuncios' },
  ],
  hallazgos: [
    { t: 'Color y contraste', d: 'El video que más leads trae de todo el rubro usa verde salvia con texto crema. Se lee perfecto en pantalla al sol, que es donde tu cliente mira.' },
    { t: 'Duración y ritmo', d: 'Entre 12 y 18 segundos. El producto entra en los primeros 2 segundos: si tardás más, se van.' },
    { t: 'El gancho', d: 'Arrancan mostrando el problema, no el producto. Ninguno de los que arranca con el logo está entre los que más rinden.' },
    { t: 'Cuándo publican', d: 'Martes y jueves entre 19 y 21. Es la franja donde esos anuncios juntan más respuestas.' },
  ],
};

// ---------------------------------------------------------------------------------------------
// 2 y 3. LO QUE CREÓ — 5 opciones, cada una con el prompt que escribió el motor
// ---------------------------------------------------------------------------------------------
export interface Opcion {
  id: string;
  formato: 'Video vertical' | 'Imagen' | 'Carrusel' | 'Reel';
  medida: string;
  titulo: string;
  gancho: string;
  prompt: string;
  copy: string;
  cta: string;
  color: string;
  usaCompetidor: string;
  votos: Record<string, number>;
}

export const OPCIONES: Opcion[] = [
  {
    id: 'op1', formato: 'Video vertical', medida: '15 s · 9:16', titulo: 'El problema primero',
    gancho: '«Si tu piel se te pone roja con todo, esto te va a interesar»',
    prompt: 'Plano cenital de la mesada del baño con luz de mañana entrando de costado. Fondo verde salvia (#4A7C59) desenfocado. Una mano entra y apoya el frasco en el centro. Texto crema (#F5EFE6) grande: a los 2 s aparece «roja». Cierre: el frasco en primer plano, el precio en ámbar (#E8A33D). Sin música, sonido ambiente del baño.',
    copy: 'Ese ardor no es normal: es tu piel pidiendo otra cosa. Serum con 3 ingredientes, nada más.',
    cta: 'Ver el serum',
    color: '#4A7C59', usaCompetidor: 'los 3 colores que mejor rinden',
    votos: { impulsivo: 92, compara: 78, desconfiado: 74, experto: 88, nuevo: 84 },
  },
  {
    id: 'op2', formato: 'Carrusel', medida: '5 placas · 4:5', titulo: 'Antes y después real',
    gancho: '«30 días usando lo mismo, así quedó»',
    prompt: 'Cinco placas con fondo crema (#F5EFE6) y borde verde salvia. Placa 1: foto de las fotos reales del cliente subida por la tienda, con la fecha encima en ámbar. Placsa 2 a 4: el frasco en la mesada, la textura en la mano, el resultado. Placa 5: los 3 ingredientes en lista y el precio en ámbar. Tipografía gruesa, sin decoración.',
    copy: 'No te prometo magia: te muestro 30 días reales de la misma persona.',
    cta: 'Ver los resultados',
    color: '#F5EFE6', usaCompetidor: 'la paleta crema y verde',
    votos: { impulsivo: 74, compara: 88, desconfiado: 86, experto: 79, nuevo: 71 },
  },
  {
    id: 'op3', formato: 'Video vertical', medida: '12 s · 9:16', titulo: 'El precio sin vueltas',
    gancho: '«Sale $34. Te muestro exactamente qué llevás»',
    prompt: 'Cámara en mano, un solo plano, sin cortes: alguien muestra el frasco, lo abre, pone una gota en el dorso de la mano y lo acerca. Fondo verde salvia. El precio en ámbar aparece a los 6 s y queda fijo. Voz real, no locución. Subtítulos en crema, chicos, abajo.',
    copy: '$34, con envío gratis desde $15.000. Nada más que explicar.',
    cta: 'Comprar ahora',
    color: '#E8A33D', usaCompetidor: 'el ámbar para el precio',
    votos: { impulsivo: 88, compara: 91, desconfiado: 69, experto: 72, nuevo: 66 },
  },
  {
    id: 'op4', formato: 'Imagen', medida: '1080x1350', titulo: 'El testimonio solo',
    gancho: '«Me lo recomendó mi dermatóloga»',
    prompt: 'Fondo verde salvia plano. En el centro, la captura real de un mensaje de WhatsApp de una clienta (tapando el número), con la frase subrayada en crema. Abajo a la derecha el frasco. Arriba, en ámbar, «reseña real de las 128 que tenemos». Tipografía de sistema, no de marca: tiene que parecer una captura, no un diseño.',
    copy: '128 reseñas, y esta es la que más se repite.',
    cta: 'Leer las reseñas',
    color: '#4A7C59', usaCompetidor: 'el verde salvia de fondo',
    votos: { impulsivo: 66, compara: 74, desconfiado: 92, experto: 81, nuevo: 78 },
  },
  {
    id: 'op5', formato: 'Reel', medida: '18 s · 9:16', titulo: 'La rutina de 3 pasos',
    gancho: '«No sabés en qué orden usarlos, esto es para vos»',
    prompt: 'Tres cortes rápidos, uno por paso, cada uno con el mismo encuadre para que se sienta una rutina. Fondo crema, el verde salvia solo en los subtítulos. En cada corte aparece el número del paso en ámbar y el cronómetro del tiempo que hay que esperar. Cierre con los tres frascos alineados y el pack completo.',
    copy: 'El orden importa más que el producto: en qué orden y cuánto esperar.',
    cta: 'Ver la rutina',
    color: '#F5EFE6', usaCompetidor: 'el crema para el texto largo',
    votos: { impulsivo: 61, compara: 72, desconfiado: 68, experto: 84, nuevo: 88 },
  },
];

/** El promedio de los 5 perfiles: es el puntaje final de cada opción. */
export function puntaje(o: Opcion) {
  const v = Object.values(o.votos);
  return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
}

/** Las opciones ordenadas del 1 al 5 por puntaje. */
export function ranking() {
  return [...OPCIONES].sort((a, b) => puntaje(b) - puntaje(a));
}

export const CUANTAS_PASAN = 3;
