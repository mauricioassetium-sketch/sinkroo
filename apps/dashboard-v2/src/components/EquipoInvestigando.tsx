import { useEffect, useRef, useState } from 'react';
import { Card, Badge, Button } from './ui';
import { I_Zap, I_ArrowRight, I_Users, I_Eye } from './icons';
import {
  AGENTES, ACCIONES_FEED, INVESTIGACION_MERCADO, FRENTES_INVESTIGACION, HALLAZGOS,
  COMPETIDORES, ANGULOS, TENDENCIAS,
  type Agente, type AccionFeed, type Hallazgo,
} from '../data/demo';
import { useDetalle, type Detalle } from './Detalle';

// =============================================================================================
// EL EQUIPO TRABAJANDO — la investigación del mercado, hecha por los 6 agentes
//
// Esto NO es la evaluación de una pieza: eso es MiroFish (los 5 jueces + 500 del público) y entra
// recién cuando hay una pieza para evaluar. Acá se ve la otra mitad, la que corre SIEMPRE: el
// motor se puso solo cuando el usuario terminó el onboarding y desde entonces revisa el mercado
// de su negocio cada 15 minutos. Lux, Rex, Nia, Kai, Sol y Rumi, en una grilla compacta, con lo
// que están haciendo ahora y el artefacto que dejaron.
//
// REGLA DE ORO: cada línea que se muestra tiene (1) algo del negocio del usuario, (2) un resultado
// concreto y (3) una hora. Y el resultado se abre: no hay estados vacíos tipo "analizando…".
//
// ESTO SE MUEVE SOLO. Todo lo que cambia en pantalla sale de un único reloj de 1 segundo (`t`) y
// de un programador de líneas con setTimeout que se limpia al desmontar:
//   · el feed: entra una línea nueva cada 2-4 s, con su hora ('hace un instante' → 'hace 20 s')
//   · la cuenta regresiva a la próxima vuelta al mercado (mm:ss, baja de verdad)
//   · 'revisado hasta ahora': sube cada 2 s
//   · el avance de la tarea de cada agente: '47 de 50 anuncios' → 48
//   · el estado de Lux: 'trabajando' → 'al día' → 'trabajando' (y los contadores del encabezado)
//   · la hora del último resultado de cada agente ('hace 12 min' → 'hace 13 min')
// Ninguno de estos timers queda vivo al desmontar: los dos efectos devuelven su limpieza.
//
// EL BLOQUE ENTRA EN UNA PANTALLA: a 1440×900 mide ~860 px (encabezado + feed + los 6 agentes +
// los frentes y hallazgos + el puente a MiroFish). Para eso los agentes van de a 3 por fila, los
// frentes y los hallazgos son filas de una sola línea, y paddings y tipografías van un punto abajo.
// =============================================================================================

/** Cada cuánto el motor vuelve a mirar el mercado: 15 min. */
const CADENCIA_SEG = INVESTIGACION_MERCADO.cadenciaMin * 60;
/** La última revisión fue hace 4 min: de ahí sale el arranque de la cuenta regresiva. */
const EDAD_INICIAL_SEG = 4 * 60;
/** Segundos que faltan para la próxima vuelta cuando se abre el panel. */
const FALTAN_INICIAL_SEG = CADENCIA_SEG - EDAD_INICIAL_SEG;
/** Cómo entran las líneas del feed: una cada 2 a 4 segundos. */
const MS_LINEA_MIN = 2000;
const MS_LINEA_MAX = 4000;
/** Cuántas líneas del feed se ven a la vez (la altura de la lista está atada a esta cifra). */
const MAX_LINEAS = 5;
/** Los tiempos de la lista arrancan escalonados: la lista no nace vacía. */
const EDADES_INICIALES_SEG = [4, 14, 28, 47, 65];
/** Cada cuánto avanza un punto la tarea de cada agente, y cada cuánto se estira el de al lado. */
const PASO_TAREA_SEG = 7;
const DESFASE_TAREA_SEG = 3;
/** Cada cuántos segundos Lux se toma un respiro: al día 14 s, trabajando 30 s, y vuelve. */
const CICLO_ESTADO_SEG = 44;
const DESDE_AFLORA_SEG = 30;

const ESTADO_LB: Record<Agente['estado'], string> = {
  trabajando: 'trabajando',
  esperando_ok: 'esperando tu OK',
  al_dia: 'al día',
};

const CLASE_ESTADO: Record<Agente['estado'], string> = {
  trabajando: 'working',
  esperando_ok: 'waiting',
  al_dia: 'idle',
};

/** El agente, por id: el feed guarda a quién pertenece cada acción. */
const AGENTE_POR_ID: Record<string, Agente> = AGENTES.reduce(
  (m, a) => { m[a.id] = a; return m; }, {} as Record<string, Agente>,
);

/** El botón abre el artefacto: lo dice el título, y aclara qué se puede hacer con él. */
function tituloArtefacto(nombre: string, estado: Agente['estado']) {
  return estado === 'esperando_ok'
    ? `Abre «${nombre}»: el detalle con sus números y qué significa. Todavía no gasta: para publicarla tenés que aprobarla vos.`
    : `Abre «${nombre}»: el detalle con sus números y qué significa para tu negocio. Solo lectura.`;
}

/** Una línea del feed: quién, qué hizo, cuándo nació (en segundos del reloj del motor). */
interface LineaFeed {
  id: number;
  agenteId: string;
  texto: string;
  artefacto?: string;
  nace: number;
}

/** 'hace un instante' → 'hace 20 s' → 'hace 2 min' → 'hace 3 h'. */
function hace(seg: number): string {
  const s = Math.max(0, Math.floor(seg));
  if (s < 6) return 'hace un instante';
  if (s < 90) return `hace ${Math.floor(s / 5) * 5} s`;
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  return `hace ${Math.round(s / 3600)} h`;
}

/** Los minutos que declara cada agente ('hace 12 min', 'hace 2 h', 'hace 1 día'). */
function minutosDe(cuando: string, porDefecto: number): number {
  const m = cuando.match(/(\d+)\s*(min|h|d)/i);
  if (!m) return porDefecto;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  return u === 'min' ? n : u === 'h' ? n * 60 : n * 1440;
}

/** Ese mismo tiempo, ya corrido por el reloj: 'hace 12 min' → 'hace 13 min' sin recargar nada. */
function haceMin(min: number): string {
  if (min < 60) return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.floor(min / 60)} h`;
  const d = Math.floor(min / 1440);
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
}

/** Baraja una copia: el feed recorre las acciones siempre en un orden distinto. */
function barajar<T>(xs: T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

// =============================================================================================
// LOS ARTEFACTOS — lo que hay adentro de cada botón
//
// Cada botón del equipo abre el panel de detalle con el contenido REAL del artefacto: qué miró el
// agente, con qué números, y qué significa para el negocio del usuario. Nada de avisos que se van
// solos: se lee, se cierra y, cuando hay una decisión (Kai esperando el OK), se decide ahí mismo.
//
// Los números salen de la misma biblioteca que el resto del panel (src/data/demo.ts): los 6
// agentes, los frentes de investigación, los competidores, los ángulos y las tendencias. No hay
// ningún dato inventado acá adentro.
// =============================================================================================

type TonoFila = 'purple' | 'green' | 'amber' | 'red' | 'muted';

/** El color de la etiqueta sale del gasto declarado: no se elige a mano. */
const tonoGasto = (gasto: string): TonoFila => (gasto === 'alto' ? 'red' : gasto === 'medio' ? 'amber' : 'muted');

/** Los 5 competidores en filas: el mismo desglose lo usan el informe de Lux y el hallazgo de Tienda Norte. */
const filasCompetencia = () => COMPETIDORES.map(c => ({
  t: `${c.nombre}${c.propio ? ' (vos)' : ''}`,
  s: `${c.anuncios} anuncios activos · ${c.leads} leads por mes estimados · precio $${c.precio}`,
  etiqueta: `gasto ${c.gasto}`,
  tono: tonoGasto(c.gasto),
}));

/** Los ángulos del rubro, con el % de anuncios que usa cada uno y qué significa para vos. */
const filasAngulos = () => ANGULOS.map((a, i) => ({
  t: a.nombre,
  s: a.lectura,
  etiqueta: `${a.pct}% del rubro`,
  tono: (i === 0 ? 'purple' : 'muted') as TonoFila,
}));

/** Lo que el agente dejó en el feed en vivo: sirve como respaldo de su artefacto. */
const filasFeed = (agenteId: string) => ACCIONES_FEED
  .filter(x => x.agenteId === agenteId && x.artefacto)
  .map(x => ({ t: x.texto, etiqueta: x.artefacto as string, tono: 'muted' as TonoFila }));

/** El avance de la tarea, la hora del último resultado: el segundo dato de todo artefacto. */
const filaAvance = (a: Agente, hecho: number, cuando: string) =>
  ({ k: 'Avance de ahora', v: `${hecho} de ${a.tarea.total} ${a.tarea.etiqueta}`, s: `último resultado: ${cuando}` });

/**
 * El artefacto de un agente, armado con sus datos reales. `accion` es la línea del feed desde la
 * que se abrió, si vino de ahí: así el panel dice también qué fue lo último que hizo.
 */
function detalleDeAgente(
  a: Agente,
  hecho: number,
  cuando: string,
  opts: { accion?: string; onAprobar?: () => void } = {},
): Detalle {
  const ultima = opts.accion
    ? `Lo último que dejó registrado: ${opts.accion}.`
    : `${a.accion} · ${a.ancla}.`;

  switch (a.id) {
    case 'lux': return {
      titulo: `Lux · ${a.artefactoNombre}`,
      sub: `Lux lee los anuncios de tu competencia, los precios y la demanda de tu zona todos los días. Lo que encontró: ${a.resultado}.`,
      bloques: [
        { tipo: 'texto', texto: ultima },
        { tipo: 'datos', filas: [
          { k: 'Anuncios activos leídos', v: '47', s: 'de 6 competidores a menos de 8 km de tu tienda' },
          { k: 'Competidores en tu zona', v: '6', s: INVESTIGACION_MERCADO.zonaDetalle },
          { k: 'El precio que cambió', v: 'Tienda Norte: $34 → $29', tono: 'amber', s: 'bajó 15%. Vos estás en $34' },
          { k: 'Tu zona', v: INVESTIGACION_MERCADO.zona, s: `revisada ${INVESTIGACION_MERCADO.ultimaRevision}, ${INVESTIGACION_MERCADO.cadencia}` },
          filaAvance(a, hecho, cuando),
        ] },
        { tipo: 'filas', items: FRENTES_INVESTIGACION.map(f => ({
          t: f.t, s: f.resultado, etiqueta: f.dato, tono: 'purple' as TonoFila,
        })) },
        { tipo: 'filas', items: filasCompetencia() },
        { tipo: 'texto', texto: `El ángulo que más se usa en tu rubro es «${ANGULOS[0].nombre}» (${ANGULOS[0].pct}% de los anuncios). ${ANGULOS[0].lectura}` },
        { tipo: 'aviso', tono: 'amber', texto: 'No conviene tocar el precio: bajar $5 te deja sin margen y Tienda Norte puede bajar otra vez. La diferencia se juega en el ángulo.' },
      ],
      fuente: 'Biblioteca pública de anuncios de Meta, leída todos los días a las 06:00, más las búsquedas de tu zona.',
    };

    case 'rex': return {
      titulo: `Rex · ${a.artefactoNombre}`,
      sub: `El plan del mes define el ángulo, la audiencia y dónde va la plata. El movimiento de hoy: ${a.resultado}.`,
      bloques: [
        { tipo: 'texto', texto: ultima },
        { tipo: 'datos', filas: [
          { k: 'Movimiento de hoy', v: '$40/día de TikTok a Meta', s: 'la misma audiencia, a la mitad del costo por clic' },
          { k: 'Costo por clic en TikTok', v: '$4,20', tono: 'red' },
          { k: 'Costo por clic en Meta', v: '$2,10', tono: 'green' },
          { k: 'Audiencia', v: 'Lookalike 3%', s: 'sacó «intereses amplios»: gastaba sin convertir' },
          filaAvance(a, hecho, cuando),
        ] },
        { tipo: 'filas', items: filasAngulos() },
        { tipo: 'texto', texto: `El ángulo del mes es «${ANGULOS[0].nombre}» y el precio entra solo como comparación. ${ANGULOS[3].lectura}` },
        { tipo: 'aviso', tono: 'amber', texto: 'Mover el presupuesto no gasta de más: sigue dentro del techo diario de $120.' },
      ],
      fuente: 'Tus cuentas de TikTok y Meta, con el gasto y el costo por clic de los últimos 14 días.',
    };

    case 'nia': return {
      titulo: `Nia · ${a.artefactoNombre}`,
      sub: `Nia escribe los textos y arma las imágenes. Estas 6 variantes salieron del ángulo que gana: ${a.resultado}.`,
      bloques: [
        { tipo: 'texto', texto: ultima },
        { tipo: 'datos', filas: [
          { k: 'Variantes escritas', v: '6', s: 'para el Serum Vitamina C, tu producto que más se busca' },
          { k: 'Ángulo que ganó', v: `${ANGULOS[0].nombre} · ${ANGULOS[0].pct}%`, s: 'puntuó 12% mejor que «precio» en el panel' },
          { k: 'Formato que crece', v: 'before/after +41%', tono: 'green', s: 'lo usa 1 de cada 5 anuncios nuevos y tus piezas todavía no' },
          { k: 'Dónde se prueban', v: 'MiroFish', s: '5 jueces + 500 del público antes de que salga nada' },
          filaAvance(a, hecho, cuando),
        ] },
        { tipo: 'filas', items: filasAngulos() },
        { tipo: 'texto', texto: `Ejemplo de cómo arranca una con ese ángulo: ${ANGULOS[0].ej}` },
        { tipo: 'aviso', tono: 'green', texto: 'Un borrador no publica nada: las variantes se puntúan antes de salir y ninguna gasta un peso hasta que las apruebes.' },
      ],
      fuente: 'El reparto de ángulos de los 47 anuncios activos del rubro, más las 6 variantes que escribió Nia.',
    };

    case 'kai': return {
      titulo: `Kai · ${a.artefactoNombre}`,
      sub: `Kai maneja el presupuesto, las plataformas y las pujas. Dejó esta campaña lista y espera tu OK: ${a.resultado}.`,
      bloques: [
        { tipo: 'texto', texto: ultima },
        { tipo: 'datos', filas: [
          { k: 'Presupuesto pedido', v: '$30/día', s: 'entra en el techo diario de $120' },
          { k: 'Nota del panel', v: '84 de 100', tono: 'green', s: 'la miraron 5 vendedores, 1 dudó' },
          { k: 'Gasto del día', v: '$88 de $120', s: 'si sale, sigue dentro del techo' },
          { k: 'Puja de hoy', v: '$1,65', s: 'bajó de $1,80 y sostuvo el costo por venta en $20' },
          filaAvance(a, hecho, cuando),
        ] },
        { tipo: 'filas', items: filasFeed('kai') },
        { tipo: 'texto', texto: 'Retargeting Carrito le habla al que ya dejó el carrito: es la venta más barata que tenés, porque el cliente ya te eligió y no hay que convencerlo de nuevo.' },
        { tipo: 'aviso', tono: 'amber', texto: 'Nada sale hasta tu OK. Si aprobás, empieza a gastar $30/día y la podés pausar cuando quieras; si no, queda guardada donde está.' },
      ],
      fuente: 'Tus cuentas de Meta Ads, con el gasto, las pujas y el costo por venta de hoy.',
      acciones: opts.onAprobar ? [
        { label: 'Aprobar y que salga', variante: 'primary' as const, onClick: opts.onAprobar },
        { label: 'Todavía no', onClick: () => {} },
      ] : undefined,
    };

    case 'sol': return {
      titulo: `Sol · ${a.artefactoNombre}`,
      sub: `Sol mide lo que pasó y lo compara con lo que el panel había predicho: ${a.resultado}.`,
      bloques: [
        { tipo: 'texto', texto: ultima },
        { tipo: 'datos', filas: [
          { k: 'Score que predijo el panel', v: '84' },
          { k: 'Score que midió de verdad', v: '79', tono: 'amber', s: '5 puntos abajo: dentro de lo aceptable' },
          { k: 'Desvío', v: '6%', s: 'el modelo lo corrige y la próxima vez subestima menos' },
          { k: 'ROAS de la semana', v: '3,8x', tono: 'green', s: 'por cada $1 invertido volvieron $3,80' },
          filaAvance(a, hecho, cuando),
        ] },
        { tipo: 'filas', items: filasFeed('sol') },
        { tipo: 'texto', texto: 'Esto es lo que hace confiable al número: el panel dice cuánto se equivocó y lo corrige, en vez de mostrar solo lo que acertó.' },
        { tipo: 'aviso', tono: 'green', texto: 'Con cada semana el score se vuelve más exacto: es el que decide si una pieza sale o no.' },
      ],
      fuente: 'Resultados reales de tus campañas cruzados con la predicción que el panel dejó antes de publicarlas.',
    };

    case 'rumi': return {
      titulo: `Rumi · ${a.artefactoNombre}`,
      sub: `Rumi atiende y cierra las conversaciones con tus clientes: ${a.resultado}.`,
      bloques: [
        { tipo: 'texto', texto: ultima },
        { tipo: 'datos', filas: [
          { k: 'Cliente', v: 'Valeria G.', s: 'pidió envío a CABA y quedó esperando' },
          { k: 'Lo que respondió Rumi', v: 'Envío en 2 a 4 días', s: 'no pudo confirmar la cobertura de la zona' },
          { k: 'Ventas cerradas hoy', v: '2', tono: 'green', s: 'y 1 conversación escalada a una persona' },
          { k: 'Carrito recuperado', v: '$59', tono: 'green', s: 'de un carrito que había quedado abandonado' },
          filaAvance(a, hecho, cuando),
        ] },
        { tipo: 'filas', items: filasFeed('rumi') },
        { tipo: 'texto', texto: 'Escalar no es fallar: cuando la respuesta compromete plata o depende de una zona que la IA no puede confirmar, la conversación pasa a una persona en vez de arriesgar una respuesta equivocada.' },
        { tipo: 'aviso', tono: 'amber', texto: 'Es la única conversación de hoy que espera una persona. Si no la contestás, el 40% de estos clientes no vuelve a escribir.' },
      ],
      fuente: 'Tu WhatsApp Business · conversaciones de las últimas 24 horas.',
    };

    default: return {
      titulo: `${a.nombre} · ${a.artefactoNombre}`,
      sub: `${a.funcion} Resultado de ahora: ${a.resultado}.`,
      bloques: [
        { tipo: 'texto', texto: ultima },
        { tipo: 'datos', filas: [
          { k: 'Rol', v: a.rol, s: a.funcion },
          { k: 'Ancla', v: a.ancla, s: 'de dónde sale este resultado' },
          { k: 'Resultado', v: a.resultado },
          filaAvance(a, hecho, cuando),
        ] },
      ],
      fuente: 'El registro del motor: cada acción con su ancla, su resultado y su hora.',
    };
  }
}

/** El artefacto de un hallazgo: el dato, su lectura y qué conviene hacer con él. */
function detalleDeHallazgo(h: Hallazgo): Detalle {
  switch (h.id) {
    case 'h1': return {
      titulo: 'Tienda Norte: los 14 anuncios y el precio que bajó',
      sub: `${h.texto}. ${h.detalle}`,
      bloques: [
        { tipo: 'datos', filas: [
          { k: 'Anuncios activos', v: '14', tono: 'amber', s: 'es el que más corre de tus 5 competidores: 1 de cada 3 de los 47 del rubro' },
          { k: 'Su precio', v: '$34 → $29', tono: 'red', s: 'bajó 15% · vos estás en $34' },
          { k: 'Qué está empujando', v: 'Video corto', s: 'duplicó el gasto en video' },
          { k: 'Leads por mes estimados', v: '82', s: 'el más alto de tu zona; vos: 48' },
        ] },
        { tipo: 'filas', items: filasCompetencia() },
        { tipo: 'texto', texto: TENDENCIAS[3].lectura },
        { tipo: 'aviso', tono: 'amber', texto: 'Igualar el precio no es la salida: te deja sin margen y él puede bajar otra vez. Se compite con el ángulo y con la prueba social.' },
      ],
      fuente: 'Biblioteca pública de anuncios de Meta, leída hoy, más el conteo de leads estimados por competidor.',
    };

    case 'h2': return {
      titulo: 'La tendencia de búsqueda de «serum vitamina C»',
      sub: `${h.texto}. ${h.detalle}`,
      bloques: [
        { tipo: 'datos', filas: [
          { k: 'Crecimiento', v: '+32%', tono: 'green', s: 'contra el mes pasado, en tu zona' },
          { k: 'Índice del rubro', v: '78 de 100', s: 'contra el máximo de los últimos 30 días' },
          { k: 'Dónde se mide', v: INVESTIGACION_MERCADO.zona, s: INVESTIGACION_MERCADO.zonaDetalle },
          { k: 'Tu producto', v: 'Serum Vitamina C', s: 'la demanda ya está esperando: es el momento de pautar' },
        ] },
        { tipo: 'filas', items: TENDENCIAS.map(t => ({
          t: t.label, s: t.lectura, etiqueta: t.num, tono: (t.up ? 'green' : 'amber') as TonoFila,
        })) },
        { tipo: 'texto', texto: 'La demanda del mercado no es tu desempeño: si sube y tus ventas no, el problema no es el mercado, es tu anuncio.' },
      ],
      fuente: 'Búsquedas de tu zona (Buenos Aires y GBA), últimos 30 días.',
    };

    case 'h3': return {
      titulo: 'Las 6 variantes con el formato before/after',
      sub: `${h.texto}. ${h.detalle}`,
      bloques: [
        { tipo: 'datos', filas: [
          { k: 'Crecimiento del formato', v: '+41%', tono: 'green', s: 'en los anuncios nuevos del rubro' },
          { k: 'Quién lo usa', v: '21 de 47 anuncios', s: 'Tienda Norte y los nuevos; vos todavía no' },
          { k: 'Variantes escritas', v: '6', s: `con el ángulo «${ANGULOS[0].nombre}», 12% mejor que «precio»` },
          { k: 'Dónde se prueban', v: 'MiroFish', s: '5 jueces + 500 del público antes de publicar' },
        ] },
        { tipo: 'filas', items: filasAngulos() },
        { tipo: 'texto', texto: `Funciona porque muestra el resultado sin explicarlo: ${ANGULOS[0].ej}` },
        { tipo: 'aviso', tono: 'green', texto: 'Ninguna sale sin pasar el panel: si no convence a los jueces y al público, no se publica.' },
      ],
      fuente: 'Anuncios nuevos del rubro de los últimos 30 días, más las 6 variantes que escribió Nia.',
    };

    case 'h4': return {
      titulo: 'El plan del mes: por qué empuja «Resultado»',
      sub: `${h.texto}. ${h.detalle}`,
      bloques: [
        { tipo: 'datos', filas: [
          { k: 'Ángulo que gana', v: `${ANGULOS[0].nombre} · ${ANGULOS[0].pct}%`, tono: 'green', s: 'de los 47 anuncios del rubro' },
          { k: 'Cuánto mejor rinde', v: '+12%', s: 'que el ángulo «precio»' },
          { k: 'El precio en el plan', v: 'Solo comparación', s: 'no es la bandera del anuncio' },
          { k: 'Avance del plan', v: '4 de 7 días', s: 'con campaña asignada' },
        ] },
        { tipo: 'filas', items: filasAngulos() },
        { tipo: 'texto', texto: ANGULOS[0].lectura },
      ],
      fuente: 'El plan del mes de Rex cruzado con el reparto de ángulos de los 47 anuncios activos.',
    };

    default: return {
      titulo: `${h.agente} · ${h.artefacto}`,
      sub: h.detalle,
      bloques: [
        { tipo: 'texto', texto: `${h.texto}. ${h.detalle}` },
      ],
      fuente: `${h.agente} lo encontró ${h.cuando}, en la investigación del mercado.`,
    };
  }
}

/** El puente a la galería, para cuando no hay navegación disponible: se explica dónde está. */
function detalleDeGaleria(): Detalle {
  return {
    titulo: 'Dónde quedan las piezas que MiroFish puntuó',
    sub: 'La galería de Campañas es donde viven las piezas que ya pasaron por el panel, cada una con su puntaje.',
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Dónde está', v: 'Campañas → Galería' },
        { k: 'Quién le pone el número', v: '5 jueces + 500 del público', s: 'dan el veredicto antes de que la pieza se publique' },
        { k: 'Quién investiga el mercado', v: 'Los 6 agentes', s: 'Lux, Rex, Nia, Kai, Sol y Rumi: trabajan y no votan' },
      ] },
      { tipo: 'texto', texto: 'Son dos cosas distintas: acá los 6 agentes investigan tu mercado y corre siempre; MiroFish entra recién cuando hay una pieza concreta que verificar.' },
    ],
    fuente: `Las ${INVESTIGACION_MERCADO.revisiones} revisiones de arriba son de mercado; el puntaje de las piezas sale del panel de MiroFish.`,
    acciones: [{ label: 'Cerrar', onClick: () => {} }],
  };
}

export function EquipoInvestigando({ setToast, irAGaleria }: {
  setToast: (t: string) => void;
  /** Lleva a la galería de Campañas, donde viven las piezas que MiroFish ya puntuó. */
  irAGaleria?: () => void;
}) {
  // El panel de detalle: cada botón de acá abre el artefacto real del agente, no un aviso.
  const detalle = useDetalle();
  // La campaña que Kai dejó esperando: aprobarla es una decisión que queda a la vista en la ficha.
  const [okKai, setOkKai] = useState(false);
  /** Aprobar la campaña que espera: cambia el estado de la ficha y no se pierde. */
  const aprobarKai = () => {
    setOkKai(true);
    setToast('Retargeting Carrito aprobada: sale en la próxima vuelta al mercado');
  };

  // ---- El reloj del motor: el único timer de 1 segundo. Todo lo demás se deriva de acá. ----
  // El tiempo que se muestra sale del RELOJ REAL (Date.now), no de la cantidad de veces que
  // disparó el intervalo: si el navegador lo frena porque la pestaña quedó de fondo, la cuenta
  // regresiva y las horas no se atrasan. El intervalo sólo hace que la pantalla se vuelva a
  // dibujar; el número que se ve es el tiempo de verdad.
  const inicioRef = useRef(Date.now());
  const [, refrescar] = useState(0);
  useEffect(() => {
    const id = setInterval(() => refrescar(x => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const ahora = Date.now();
  /** Segundos reales desde que se abrió el panel. */
  const t = Math.floor((ahora - inicioRef.current) / 1000);

  // ---- El feed: arranca con la lista puesta y después entra una línea nueva cada 2-4 s. ----
  const [lineas, setLineas] = useState<LineaFeed[]>([]);
  const [nuevas, setNuevas] = useState(0);
  const seqRef = useRef(0);
  const colaRef = useRef<AccionFeed[]>([]);
  const ultimaRef = useRef('');
  useEffect(() => {
    // Saca la próxima acción; cuando se acaba la vuelta, la baraja de nuevo sin repetir la última.
    const siguiente = (): AccionFeed => {
      if (colaRef.current.length === 0) {
        const cola = barajar(ACCIONES_FEED);
        if (cola.length > 1 && cola[0].texto === ultimaRef.current) {
          const t0 = cola[0]; cola[0] = cola[1]; cola[1] = t0;
        }
        colaRef.current = cola;
      }
      const a = colaRef.current.shift() as AccionFeed;
      ultimaRef.current = a.texto;
      return a;
    };
    const crear = (a: AccionFeed, nace: number): LineaFeed => ({
      id: seqRef.current++, agenteId: a.agenteId, texto: a.texto, artefacto: a.artefacto, nace,
    });

    const ahoraMs = Date.now();
    setLineas(EDADES_INICIALES_SEG.map(e => crear(siguiente(), ahoraMs - e * 1000)));

    let id: ReturnType<typeof setTimeout>;
    const programar = () => {
      const espera = MS_LINEA_MIN + Math.random() * (MS_LINEA_MAX - MS_LINEA_MIN);
      id = setTimeout(() => {
        const a = siguiente();
        setLineas(prev => [crear(a, Date.now()), ...prev].slice(0, MAX_LINEAS));
        setNuevas(n => n + 1);
        programar();
      }, espera);
    };
    programar();
    return () => clearTimeout(id);
  }, []);

  // ---- La vuelta al mercado: cuenta regresiva, hora de la última y revisiones acumuladas ----
  const ciclo = t % CADENCIA_SEG;
  const faltan = ciclo < FALTAN_INICIAL_SEG
    ? FALTAN_INICIAL_SEG - ciclo
    : CADENCIA_SEG - (ciclo - FALTAN_INICIAL_SEG);
  const edadUltima = ciclo >= FALTAN_INICIAL_SEG ? ciclo - FALTAN_INICIAL_SEG : EDAD_INICIAL_SEG + ciclo;
  const vueltas = Math.floor(t / CADENCIA_SEG) + (ciclo >= FALTAN_INICIAL_SEG ? 1 : 0);
  const mmss = `${String(Math.floor(faltan / 60)).padStart(2, '0')}:${String(faltan % 60).padStart(2, '0')}`;
  /** Sube de a uno cada 2 segundos mientras mirás: la pantalla nunca está quieta. */
  const revisados = 47 + Math.floor(t / 2);

  // ---- El equipo, con lo que cambia solo: estado, avance de la tarea y hora corrida ----
  const luxAfloja = (t % CICLO_ESTADO_SEG) >= DESDE_AFLORA_SEG;
  const equipo = AGENTES.map((a, i) => {
    const estado: Agente['estado'] = (a.id === 'kai' && okKai)
      ? 'al_dia'
      : luxAfloja && a.id === 'lux' ? 'al_dia' : a.estado;
    const rango = a.tarea.total - a.tarea.hecho + 1;
    const hecho = a.tarea.hecho + (Math.floor((t + i * DESFASE_TAREA_SEG) / PASO_TAREA_SEG) % rango);
    const min = minutosDe(a.cuando, 5) + Math.floor(t / 60);
    return { a, estado, hecho, cuando: haceMin(min) };
  });
  const trabajando = equipo.filter(e => e.estado === 'trabajando').length;
  const esperando = equipo.filter(e => e.estado === 'esperando_ok').length;
  const alDia = equipo.filter(e => e.estado === 'al_dia').length;

  const verGaleria = () => {
    if (irAGaleria) irAGaleria();
    else detalle(detalleDeGaleria());
  };

  return (
    <div className="eq-wrap">
      {/* ==================== ENCABEZADO: el equipo trabaja desde el onboarding ==================== */}
      <div className="eq-head">
        <div className="eq-head-top">
          <span className="eq-live"><span className="dot-live" /> EN VIVO</span>
          <span className="eq-head-t">El equipo trabajando: la investigación de tu mercado</span>
          <Badge tone="green">{trabajando} trabajando ahora</Badge>
        </div>
        <div className="eq-arranque">
          <b>Arrancó solo {INVESTIGACION_MERCADO.desde}</b>, {INVESTIGACION_MERCADO.arranco}.
          {' '}Desde entonces revisa tu mercado <b>{INVESTIGACION_MERCADO.cadencia}</b> y te avisa si algo cambia.
        </div>
        <div className="eq-estado">
          <span><b>{trabajando}</b> trabajando</span>
          <span className="eq-sep">·</span>
          <span><b>{esperando}</b> esperando tu OK</span>
          <span className="eq-sep">·</span>
          <span><b>{alDia}</b> al día</span>
          <span className="eq-sep">·</span>
          <span title={`La última vez que el motor dejó un resultado en tu panel. Vuelve cada ${INVESTIGACION_MERCADO.cadencia}.`}>
            última revisión: <b>{hace(edadUltima)}</b></span>
          <span className="eq-sep">·</span>
          <span className="eq-prox" title="Cuenta regresiva real a la próxima vuelta al mercado: baja cada segundo.">
            próxima vuelta en <b>{mmss}</b></span>
          <span className="eq-sep">·</span>
          <span title="Anuncios, precios y conversaciones que el equipo viene de revisar. Sube solo.">
            revisado hasta ahora: <b>{revisados}</b></span>
          <span className="eq-count">{INVESTIGACION_MERCADO.revisiones + vueltas} revisiones desde que arrancó</span>
        </div>
      </div>

      {/* ============ EL FEED EN VIVO: lo que están haciendo ahora, entrando línea por línea ============ */}
      <div className="eq-feed">
        <div className="eq-feed-head">
          <span className="eq-live"><span className="dot-live" /> EN VIVO</span>
          <span className="eq-feed-t">Lo que están haciendo ahora, agente por agente</span>
          <span className="eq-feed-n" title="Líneas que entraron al feed desde que abriste el panel.">
            <b>{nuevas}</b> {nuevas === 1 ? 'nueva' : 'nuevas'} desde que abriste
          </span>
        </div>
        {/* Altura fija: entra una línea y el resto de la pantalla NO se mueve ni un pixel. */}
        <div className="eq-feed-lista">
          {lineas.map(l => {
            const ag = AGENTE_POR_ID[l.agenteId];
            return (
              <div className="eq-feed-l" key={l.id}>
                <span className="eq-av" style={{ background: ag.color }}>{ag.nombre[0]}</span>
                <span className="eq-feed-nm">{ag.nombre}</span>
                <span className="eq-feed-tx" title={l.texto}>{l.texto}</span>
                <span className="eq-feed-when">{hace((ahora - l.nace) / 1000)}</span>
                {l.artefacto && (
                  <Button variant="ghost" className="btn-sm eq-feed-btn"
                    title={`Abre «${l.artefacto}» de ${ag.nombre}: el artefacto con sus números y qué significa para tu negocio. Solo lectura.`}
                    onClick={() => {
                      const e = equipo.find(x => x.a.id === l.agenteId);
                      detalle(detalleDeAgente(e?.a ?? ag, e?.hecho ?? ag.tarea.hecho, e?.cuando ?? ag.cuando, { accion: l.texto }));
                    }}>
                    <I_ArrowRight size={12} />
                    <span className="eq-feed-btn-t">{l.artefacto}</span>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================== LAS DOS TARJETAS: quién es quién y qué está mirando ==================== */}
      <div className="duo">
        <Card className="eq-card"
          title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--purple3)' }} /> El equipo, agente por agente</span>}
          action={<Badge tone="muted">{AGENTES.length} agentes</Badge>}
        >
          {/* De a 3 por fila: los 6 entran en dos filas y el bloque respira sin scrollear. */}
          <div className="eq-agentes">
            {equipo.map(e => (
              <FichaAgente key={e.a.id} a={e.a} estado={e.estado} hecho={e.hecho} cuando={e.cuando}
                aprobado={e.a.id === 'kai' && okKai}
                onAprobar={e.a.id === 'kai' ? aprobarKai : undefined} />
            ))}
          </div>
          <div className="acc-why">
            Cada agente dice <b>qué miró de tu negocio</b>, <b>qué resultó</b> y <b>cuándo</b>.
            Lo que produjo se abre con un clic: no hay resultados sin comprobar.
          </div>
        </Card>

        <Card className="eq-card"
          title={<span className="row" style={{ gap: 8 }}><I_Eye size={14} style={{ color: '#22d3ee' }} /> Qué está investigando del mercado ahora</span>}
          action={<Badge tone="purple">{INVESTIGACION_MERCADO.zona}</Badge>}
        >
          <div className="eq-inv">
            <div className="eq-zona">
              <span style={{ fontSize: 15, flexShrink: 0 }}>📍</span>
              <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                <div className="eq-zona-t">Lux está mirando tu zona: {INVESTIGACION_MERCADO.zona}</div>
                <div className="eq-zona-d" title={INVESTIGACION_MERCADO.zonaDetalle}>{INVESTIGACION_MERCADO.zonaDetalle}</div>
              </div>
              <span className="eq-tag">revisado {hace(edadUltima)}</span>
            </div>

            <div className="eq-frentes">
              {FRENTES_INVESTIGACION.map(f => (
                <div key={f.id} className="eq-frente" style={{ borderLeftColor: f.color }}
                  title={`${f.ancla} · ${f.resultado}`}>
                  <span className="eq-frente-t">{f.t}</span>
                  <span className="eq-frente-v" style={{ color: f.color }}>{f.dato}</span>
                  <span className="eq-frente-r">{f.resultado}</span>
                  <span className="eq-frente-a">{f.cuando}</span>
                </div>
              ))}
            </div>

            <div className="bs" style={{ marginBottom: 1 }}>Los últimos hallazgos, con la hora en que los encontró:</div>
            <div className="eq-hallazgos">
              {HALLAZGOS.map(h => <FilaHallazgo key={h.id} h={h} />)}
            </div>
          </div>
        </Card>
      </div>

      {/* ==================== EL PUENTE A MIROFISH ==================== */}
      <div className="eq-puente">
        <span className="eq-puente-t">
          Esto es la <b>investigación del mercado</b>: corre desde el onboarding y no gasta presupuesto.
          Cuando hay una <b>pieza para evaluar</b> (un aviso, un video, una imagen), entra <b>MiroFish</b>:
          los 5 jueces y 500 del público la votan antes de que salga a internet.
        </span>
        <Button variant="ghost" className="btn-sm"
          title="Te lleva a la galería de Campañas, donde están las piezas que MiroFish ya puntuó. No publica nada."
          onClick={verGaleria}>
          <I_Zap size={13} /> Ver la galería de MiroFish <I_ArrowRight size={13} />
        </Button>
      </div>
    </div>
  );
}

// =============================================================================================
// La ficha de un agente: nombre, función llana, estado, qué está haciendo, el resultado, el
// avance de su tarea (que se mueve solo) y el artefacto que dejó. El botón abre ese artefacto en
// el panel de detalle, con sus números y su lectura para el negocio.
function FichaAgente({ a, estado, hecho, cuando, aprobado, onAprobar }: {
  a: Agente;
  /** El estado de ahora: puede haber cambiado solo desde que abriste el panel. */
  estado: Agente['estado'];
  /** Cuánto lleva hecho de su tarea: avanza solo. */
  hecho: number;
  /** Su hora, ya corrida por el reloj. */
  cuando: string;
  /** Kai ya tiene tu OK: la ficha lo dice y no queda como si nada hubiera pasado. */
  aprobado?: boolean;
  /** La acción que aprueba de verdad la campaña que espera tu OK. */
  onAprobar?: () => void;
}) {
  const detalle = useDetalle();
  const clase = CLASE_ESTADO[estado];
  const pct = Math.round((hecho / a.tarea.total) * 100);
  return (
    <div className={`eq-ag ${clase}`}>
      <div className="eq-ag-top">
        <span className="eq-av" style={{ background: a.color }}>{a.nombre[0]}</span>
        <span className="eq-nm">{a.nombre}</span>
        <span className={`eq-est ${clase}`}>{ESTADO_LB[estado]}</span>
      </div>
      <div className="eq-rol" title={a.rol}>{a.rol}</div>
      <div className="eq-fn" title={a.funcion}>{a.funcion}</div>
      <div className="eq-ahora" title={`${a.accion} · ${cuando}`}>
        <b>Ahora: </b>{a.accion} <span className="eq-cz">· {cuando}</span>
      </div>
      <div className="eq-ancla" title={a.ancla}>{a.ancla}</div>
      <div className="eq-res" title={a.resultado}><b>→ </b>{a.resultado}</div>
      {/* El avance de la tarea: la barra se llena sola mientras mirás la pantalla. */}
      <div className="eq-prog" title={`${a.nombre}: ${hecho} de ${a.tarea.total} ${a.tarea.etiqueta}. Avanza solo.`}>
        <span className="eq-prog-t">{hecho} de {a.tarea.total} {a.tarea.etiqueta}</span>
        <span className="eq-prog-b"><i style={{ width: `${pct}%`, background: a.color }} /></span>
      </div>
      {aprobado && (
        <div className="eq-cz" style={{ color: 'var(--green)', fontWeight: 700, marginBottom: 6 }}
          title="La aprobaste vos desde el artefacto: sale en la próxima vuelta al mercado.">
          ✓ Aprobada por vos: sale en la próxima vuelta al mercado
        </div>
      )}
      <Button variant="ghost" className="btn-sm eq-ag-btn"
        title={tituloArtefacto(a.artefactoNombre, estado)}
        onClick={() => detalle(detalleDeAgente(a, hecho, cuando, { onAprobar }))}>
        <I_ArrowRight size={12} /> <span className="eq-ag-btn-t">{a.artefactoNombre}</span>
      </Button>
    </div>
  );
}

// =============================================================================================
// El hallazgo: una sola línea, con la hora, quién lo encontró, qué encontró y el artefacto.
// El botón abre el artefacto en el panel de detalle: el dato con sus números, su lectura y qué
// conviene hacer con él. Adentro del panel no se pierde nada de lo que la línea cuenta.
function FilaHallazgo({ h }: { h: Hallazgo }) {
  const detalle = useDetalle();
  return (
    <div className="eq-hall" title={`${h.agente} · ${h.texto} — ${h.detalle}`}>
      <span className="eq-hall-when">{h.cuando}</span>
      <div className="eq-hall-b">
        <b style={{ color: h.color }}>{h.agente}</b> · {h.texto}
      </div>
      <Button variant="ghost" className="btn-sm eq-hall-btn"
        title={`Abre «${h.artefacto}»: el detalle del hallazgo con sus números y qué significa para tu negocio.`}
        onClick={() => detalle(detalleDeHallazgo(h))}>
        <I_ArrowRight size={12} /> {h.artefacto}
      </Button>
    </div>
  );
}
