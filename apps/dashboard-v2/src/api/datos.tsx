import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { arrancarMotor, baseApi, guardarOnboarding, hayApi, token } from './cliente';

// =============================================================================================
// LA CAPA DE DATOS DEL PANEL — una sola puerta, y una sola decisión: ¿de dónde salen los datos?
//
//   · Con el back encendido y sesión (`?api=…` y token), el panel lee del BACK y muestra lo que hay.
//     Si el negocio es nuevo, no hay nada: las pantallas muestran su estado vacío, con la invitación a
//     hacer la primera acción. Nada de datos de ejemplo mezclados con los datos reales.
//   · Sin back, el panel funciona con los datos de demostración, como hasta hoy. Eso es lo que se ve en
//     el link de revisión y lo que permite mostrar el producto sin depender del servidor.
//
// Regla que no se rompe: si `real` es true, NINGUNA pantalla puede leer del demo. Mezclarlos sería mentir
// sobre lo que hay.
// =============================================================================================

export type Negocio = {
  id: string; name: string; description: string; industry: string;
  plan: string; creditos: number; zona: string; created_at: string;
};
export type Resumen = {
  piezas: number; evaluaciones: number; hallazgos: number; conversaciones: number; publico: number; corridas: number;
};
export type Campana = {
  id: string; nombre: string; forma: string; estado: string; presupuesto: number;
  destinos: string[]; objetivo: string; piezas: number; roas: number | null; gasto: number; created_at: string;
};
export type Pieza = { id: string; titulo: string; formato: string; estado: string; created_at: string; puntaje: number | null };
export type Evaluacion = { id: string; titulo: string; puntaje: number; orden: number | null; total_publico: number; created_at: string };
export type Hallazgo = { id: string; tipo: string; titulo: string; dato: string; porque: string; fuente: string; created_at: string };
export type Corrida = { id: string; motivo: string; estado: string; creditos: number; empezada_at: string; tareas: TareaCorrida[] };
export type TareaCorrida = { agente: string; que: string; resultado: Record<string, unknown>; orden: number };
export type Publico = { total: number; por_estilo: { estilo: string; n: number }[]; por_edad: { rango: string; n: number }[]; muestra: any[] };
export type Conversacion = { id: string; lead_phone: string; stage: string; status: string; lead_score: number; last_message_at: string; ultimo: string | null };
export type Movimiento = { delta: number; motivo: string; detalle: string; saldo: number; created_at: string };
/** Cómo está repartido el público del panel: agentes y peso por segmento, y de dónde salió el dato. */
export type Calibracion = {
  total: number;
  calibrada: boolean;
  ultima: { origen: string; fuente: string; segmentos: unknown; agentes: number; created_at: string } | null;
  por_segmento: { segmento: string; agentes: number; peso: number; origen: string }[];
  por_origen: { origen: string; n: number }[];
  confianza: string;
};
/** El modelo medido contra la historia real del negocio: error promedio y caso por caso. */
export type Backtest = {
  casos: number;
  casos_con_metrica_real: number;
  mae: number | null;
  error_pct: number | null;
  confianza: string;
  detalle: { predicho: number; real: number; error: number; con_metrica_real: boolean; metrica: string; cuando: string }[];
};

/** Una pieza viva del mercado: un anuncio que el mercado ya premió con tiempo, medido por nosotros. */
export type PiezaViva = {
  anunciante: string;
  /** Días que el anuncio lleva activo: es el único indicador público de que la pieza rinde. */
  dias: number;
  tipo: string;
  formato?: string;
  estilo?: string;
  quien?: string;
  lugar?: string;
  texto_sobre_imagen?: string;
  gancho?: string;
  cta?: string;
  destino?: string;
  prueba_social?: string;
  paleta?: string[];
  /** La tipografía y el encuadre medidos sobre la creatividad (para poder repetirlos). */
  tipografia?: string;
  composicion?: string;
  hashtags?: string[];
  duracion?: string;
  nota?: string;
};

/**
 * EL INFORME COMPLETO DEL MERCADO (el patrón-modelo). `hay: false` significa que todavía no se corrió
 * para el rubro y la ciudad de este negocio: en ese caso `falta` dice exactamente qué se necesita, y no
 * se muestra ningún mercado de ejemplo. `origen` distingue un informe medido para este negocio de uno
 * medido para su rubro y su ciudad.
 */
export type InformeMercado = {
  hay: boolean;
  rubro: string;
  ciudad: string;
  origen: string;
  generado_at: string | null;
  fuente: string;
  /** Por qué este informe le aplica a este negocio (la clave del rubro que coincidió y la ciudad). */
  porque_aplica?: string;
  falta: string[];
  informe: {
    resumen?: string;
    jugadores?: { capa: string; detalle: string; cuantos?: string }[];
    piezas?: PiezaViva[];
    patron?: { k: string; v: string; s?: string }[];
    saturacion?: string[];
    huecos?: { titulo: string; detalle: string; como?: string }[];
    propuestas?: { titulo: string; tipo: string; guion?: string[]; copy?: string; por_que?: string }[];
    etapas?: string[];
    techos?: { se_puede: string; no_se_puede: string }[];
    cuidado?: string[];
    creadoras?: { nivel: string; detalle: string; evidencia?: string }[];
    /** La analítica visual del mercado: tipografía, encuadre, paletas medidas y el brief por plaza. */
    analitica_visual?: {
      resumen?: string;
      nota_plazas?: string;
      tipografia?: { estilo: string; tratamiento?: string; caja?: string; ubicacion?: string; medido_en?: string }[];
      composicion?: { regla: string; porque?: string }[];
      paletas?: { uso: string; colores: string[]; nota?: string }[];
      hashtags_usados?: string[];
      duraciones_medidas?: string[];
      por_plaza?: { plaza: string; formato: string; gancho: string; boton: string; paleta?: string[]; tipografia?: string; porque?: string }[];
      lo_que_no_hay_que_copiar?: string[];
    };
    checks?: string[];
  } | null;
};

/** Un tema de los que el país está hablando, con su alcance cultural y si toca el rubro del negocio. */
export type Tendencia = {
  tema: string;
  /** local (un solo país) · regional (varios de la región) · global o de varios mercados. */
  alcance: string;
  toca_el_rubro: boolean;
  paises: string[];
  fecha: string;
  /** En cuántas fechas distintas apareció: 1 = noticia de un día; más = algo que sigue. */
  dias: number;
};

/** Un prompt de generación: el contrato que leerá el generador, con la traza de cómo se armó. */
export type PromptGeneracion = {
  id: string;
  pieza: string;
  plaza: string;
  tipo: string;
  estilo: string;
  proporcion: string;
  prompt: string;
  prompt_negativo: string;
  parametros: Record<string, unknown>;
  detalle: {
    sujeto?: { quien?: string; donde?: string; accion?: string; vestuario?: string; mirada?: string };
    escenas?: { s: string; plano: string; accion: string; texto_en_pantalla: string; voz: string }[];
    colores?: { paleta: string[]; rol: string; contraste: string };
    tipografia?: { familia: string; peso: string; caja: string; tratamiento: string; ubicacion: string; texto_exacto: string };
    iluminacion?: string;
    camara?: string;
    audio?: { voz: string; musica: string };
    marca?: string;
    no_debe_aparecer?: string[];
    /** De dónde sale cada campo del prompt: dato medido → cómo se usa. */
    como_se_arma?: { campo: string; sale_de: string; como_se_usa: string }[];
    elegido_por_nosotros?: string[];
    verificaciones?: string[];
    referencia?: { anunciante: string; dias: number; que_se_toma: string };
  };
  created_at: string;
};

/** Una red conectable, tal como la devuelve el back: su nombre y su rol, si está configurada en el
 *  servidor y qué falta, la cuenta conectada (el token nunca se devuelve, sólo se dice si hay uno
 *  guardado) y cuándo se sincronizó por última vez. */
export type IntegracionRed = {
  red: string;
  nombre: string;
  rol: string;
  tipo?: 'oauth' | 'token';
  categoria: string;
  /** ¿La app de esa red está configurada en el servidor? Si no, `falta` dice qué variables faltan. */
  configurado: boolean;
  /**
   * La plataforma dentro de bundle.social con la que esa red se conecta (ej. 'INSTAGRAM'), cuando la
   * cubre el agregador. Una red con esto SE PUEDE CONECTAR aunque `configurado` siga en false: no
   * depende de que la app propia esté cargada en el servidor. Por eso no puede decir «falta configurar».
   */
  viaBundle?: string;
  falta: string[];
  cuenta: {
    red: string; external_id: string | null; nombre: string | null; estado: string;
    token_expira: string | null; permisos: string[] | null; created_at: string; tiene_token: boolean;
  } | null;
  ultima_sincronizacion: { que: string; ok: boolean; detalle: string; created_at: string } | null;
  /** Qué le aporta esa red al motor, en palabras del back. */
  que_aporta: string;
  /** Cómo funciona la integración y con qué datos lee, en palabras del back. */
  como_funciona: string;
};

/** Todas las redes conectables y el total que se muestra en el badge de la tarjeta. */
export type Integraciones = {
  redes: IntegracionRed[];
  resumen: { conectadas: number; total: number };
};

/** Las métricas reales del negocio, tal como las reporta la plataforma. `hay: false` = no llegó ninguna. */
export type Metricas = {
  hay: boolean;
  filas: number;
  ultima: string | null;
  totales: { metrica: string; total: string }[];
  por_red: { red: string; metrica: string; total: string }[];
  por_pieza: { pieza: string; metrica: string; total: string }[];
};

/** Un archivo que el negocio subió a su carpeta del servidor. */
export type Archivo = { id: string; nombre: string; tipo: string; tamano: number; created_at: string };

export type Datos = {
  /** true cuando los datos son del back. Si es false, el panel está en modo demostración. */
  real: boolean;
  cargando: boolean;
  error: string;
  negocio: Negocio | null;
  resumen: Resumen | null;
  onboarding: { hechos: number[]; arrancado: boolean } | null;
  campanas: Campana[];
  piezas: Pieza[];
  evaluaciones: Evaluacion[];
  hallazgos: Hallazgo[];
  corridas: Corrida[];
  publico: Publico | null;
  conversaciones: Conversacion[];
  /** El material que el negocio subió a su carpeta del servidor (imágenes, videos, PDF). */
  archivos: Archivo[];
  creditos: { saldo: number; movimientos: Movimiento[] } | null;
  /** El público calibrado del back: cómo está repartido y de dónde salió cada peso. null = sin back. */
  calibracion: Calibracion | null;
  /** El backtest del back: qué tan cerca le pega el modelo a la realidad. null = sin back. */
  backtest: Backtest | null;
  /** El informe completo del mercado (el patrón-modelo) que abre el botón de la pantalla de Mercado.
   *  null = el back no respondió o no hay informe para el rubro y la ciudad de este negocio. */
  informeMercado: InformeMercado | null;
  /** Los prompts de generación (imagen o video) del negocio, con su traza. Vacío = todavía no hay. */
  prompts: PromptGeneracion[];
  /** Lo que se está hablando en los países que se miran, con su alcance y su histórico. */
  tendencias: Tendencia[];
  /** Las redes conectables con el back encendido: cuáles están configuradas, cuáles tienen cuenta
   *  conectada y cuándo se sincronizaron, más el resumen (`conectadas` de `total`). null = sin back, o
   *  el servidor no respondió a la consulta. */
  integraciones: Integraciones | null;
  /** Las mediciones reales de las plataformas (alcance, clics, ventas, gasto). Sin ninguna, `hay` es
   *  false y la pantalla de resultados lo dice: el número no se finge. */
  metricas: Metricas | null;
  desvioPct: number;
  refrescar: () => Promise<void>;
  /** Guarda el onboarding en el back (mezcla los campos) y refresca. */
  guardar: (cuerpo: { datos?: Record<string, unknown>; hechos?: number[]; arrancado?: boolean }) => Promise<void>;
  arrancar: () => Promise<void>;
};

const VACIO: Datos = {
  real: false, cargando: false, error: '',
  negocio: null, resumen: null, onboarding: null,
  campanas: [], piezas: [], evaluaciones: [], hallazgos: [], corridas: [],
  publico: null, conversaciones: [], archivos: [], creditos: null, calibracion: null, backtest: null, integraciones: null,
  metricas: null, informeMercado: null, prompts: [], tendencias: [], desvioPct: 0,
  refrescar: async () => {}, guardar: async () => {}, arrancar: async () => {},
};

const Ctx = createContext<Datos>(VACIO);
export const useDatos = () => useContext(Ctx);

async function traer<T>(ruta: string, porDefecto: T): Promise<T> {
  try {
    const r = await fetch(baseApi() + ruta, {
      headers: token() ? { Authorization: `Bearer ${token()}` } : {},
    });
    if (!r.ok) return porDefecto;
    return (await r.json()) as T;
  } catch { return porDefecto; }
}

export function ProveedorDatos({ children, modoDemo = false }: { children: ReactNode; modoDemo?: boolean }) {
  const [estado, setEstado] = useState<Datos>(VACIO);

  const refrescar = useCallback(async () => {
    // En modo demostración no se lee el back ni con sesión abierta: la demostración no es la cuenta.
    if (!hayApi() || !token() || modoDemo) { setEstado(VACIO); return; }
    setEstado(e => ({ ...e, real: true, cargando: true, error: '' }));
    const [neg, onb, camp, piez, eval_, hall, corr, publ, conv, arch, cred, calib, back, integ, metr, inform, prm, tend] = await Promise.all([
      traer<{ negocio: Negocio; resumen: Resumen; onboarding: { hechos: number[]; arrancado: boolean } } | null>('/api/negocio', null),
      traer<{ datos: Record<string, unknown>; hechos: number[]; arrancado: boolean }>('/api/onboarding', { datos: {}, hechos: [], arrancado: false }),
      traer<{ campanas: Campana[] }>('/api/campanas', { campanas: [] }),
      traer<{ piezas: Pieza[] }>('/api/piezas', { piezas: [] }),
      traer<{ evaluaciones: Evaluacion[] }>('/api/mirofish', { evaluaciones: [] }),
      traer<{ hallazgos: Hallazgo[]; desvio_actual_pct: number }>('/api/hallazgos', { hallazgos: [], desvio_actual_pct: 0 }),
      traer<{ corridas: Corrida[] }>('/api/agentes/corridas', { corridas: [] }),
      traer<Publico | null>('/api/publico', null),
      traer<{ conversaciones: Conversacion[] }>('/api/conversaciones', { conversaciones: [] }),
      traer<{ archivos: Archivo[] }>('/api/archivos', { archivos: [] }),
      traer<{ saldo: number; movimientos: Movimiento[] }>('/api/creditos', { saldo: 0, movimientos: [] }),
      traer<Calibracion | null>('/api/publico/calibracion', null),
      traer<Backtest | null>('/api/mirofish/backtest', null),
      traer<Integraciones | null>('/api/integraciones', null),
      traer<Metricas | null>('/api/metricas', null),
      traer<InformeMercado | null>('/api/mercado/informe', null),
      traer<{ prompts: PromptGeneracion[] }>('/api/prompts', { prompts: [] }),
      traer<{ tendencias: Tendencia[] }>('/api/tendencias', { tendencias: [] }),
    ]);
    setEstado({
      real: true, cargando: false, error: neg ? '' : 'no se pudo leer el negocio del servidor',
      negocio: neg?.negocio ?? null,
      resumen: neg?.resumen ?? null,
      onboarding: onb ? { hechos: onb.hechos || [], arrancado: !!onb.arrancado } : null,
      campanas: camp.campanas || [],
      piezas: piez.piezas || [],
      evaluaciones: eval_.evaluaciones || [],
      hallazgos: hall.hallazgos || [],
      corridas: corr.corridas || [],
      publico: publ,
      conversaciones: conv.conversaciones || [],
      archivos: arch.archivos || [],
      creditos: cred,
      calibracion: calib,
      backtest: back,
      integraciones: integ,
      metricas: metr,
      informeMercado: inform,
      prompts: prm.prompts || [],
      tendencias: tend.tendencias || [],
      desvioPct: hall.desvio_actual_pct || 0,
      refrescar: async () => {},
      guardar: async () => {},
      arrancar: async () => {},
    });
  }, [modoDemo]);

  useEffect(() => { void refrescar(); }, [refrescar]);

  const guardar = useCallback(async (cuerpo: { datos?: Record<string, unknown>; hechos?: number[]; arrancado?: boolean }) => {
    if (!hayApi() || !token() || modoDemo) return;
    await guardarOnboarding(cuerpo).catch(() => {});
    void refrescar();
  }, [refrescar, modoDemo]);

  const arrancar = useCallback(async () => {
    if (!hayApi() || !token() || modoDemo) return;
    await arrancarMotor().catch(() => {});
    void refrescar();
  }, [refrescar, modoDemo]);

  // El estado se completa con las funciones una sola vez, para no re-renderizar de más.
  const valor: Datos = { ...estado, refrescar, guardar, arrancar };
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
