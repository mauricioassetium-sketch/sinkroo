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

/** El estado de la integración con Meta (Instagram): si la app está configurada en el servidor, si hay
 *  cuenta conectada (el token nunca se devuelve, sólo se dice si hay uno guardado) y cuándo se sincronizó. */
export type IntegracionMeta = {
  configurado: boolean;
  /** Las variables de entorno que faltan para que la app de Meta esté configurada (sus nombres). */
  falta: string[];
  cuenta: {
    red: string; external_id: string | null; nombre: string | null; estado: string;
    token_expira: string | null; created_at: string; tiene_token: boolean;
  } | null;
  ultima_sincronizacion: { que: string; ok: boolean; detalle: string; created_at: string } | null;
  /** Qué hace la integración con los datos que trae, en palabras del back. */
  como_funciona: string;
};

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
  creditos: { saldo: number; movimientos: Movimiento[] } | null;
  /** El público calibrado del back: cómo está repartido y de dónde salió cada peso. null = sin back. */
  calibracion: Calibracion | null;
  /** El backtest del back: qué tan cerca le pega el modelo a la realidad. null = sin back. */
  backtest: Backtest | null;
  /** La integración con Meta (Instagram): si la app está configurada, si hay cuenta conectada y cuándo
   *  se sincronizó. null = sin back, o el servidor no respondió a la consulta. */
  integraciones: IntegracionMeta | null;
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
  publico: null, conversaciones: [], creditos: null, calibracion: null, backtest: null, integraciones: null, desvioPct: 0,
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

export function ProveedorDatos({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Datos>(VACIO);

  const refrescar = useCallback(async () => {
    if (!hayApi() || !token()) { setEstado(VACIO); return; }
    setEstado(e => ({ ...e, real: true, cargando: true, error: '' }));
    const [neg, onb, camp, piez, eval_, hall, corr, publ, conv, cred, calib, back, integ] = await Promise.all([
      traer<{ negocio: Negocio; resumen: Resumen; onboarding: { hechos: number[]; arrancado: boolean } } | null>('/api/negocio', null),
      traer<{ datos: Record<string, unknown>; hechos: number[]; arrancado: boolean }>('/api/onboarding', { datos: {}, hechos: [], arrancado: false }),
      traer<{ campanas: Campana[] }>('/api/campanas', { campanas: [] }),
      traer<{ piezas: Pieza[] }>('/api/piezas', { piezas: [] }),
      traer<{ evaluaciones: Evaluacion[] }>('/api/mirofish', { evaluaciones: [] }),
      traer<{ hallazgos: Hallazgo[]; desvio_actual_pct: number }>('/api/hallazgos', { hallazgos: [], desvio_actual_pct: 0 }),
      traer<{ corridas: Corrida[] }>('/api/agentes/corridas', { corridas: [] }),
      traer<Publico | null>('/api/publico', null),
      traer<{ conversaciones: Conversacion[] }>('/api/conversaciones', { conversaciones: [] }),
      traer<{ saldo: number; movimientos: Movimiento[] }>('/api/creditos', { saldo: 0, movimientos: [] }),
      traer<Calibracion | null>('/api/publico/calibracion', null),
      traer<Backtest | null>('/api/mirofish/backtest', null),
      traer<IntegracionMeta | null>('/api/integraciones/meta/estado', null),
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
      creditos: cred,
      calibracion: calib,
      backtest: back,
      integraciones: integ,
      desvioPct: hall.desvio_actual_pct || 0,
      refrescar: async () => {},
      guardar: async () => {},
      arrancar: async () => {},
    });
  }, []);

  useEffect(() => { void refrescar(); }, [refrescar]);

  const guardar = useCallback(async (cuerpo: { datos?: Record<string, unknown>; hechos?: number[]; arrancado?: boolean }) => {
    if (!hayApi() || !token()) return;
    await guardarOnboarding(cuerpo).catch(() => {});
    void refrescar();
  }, [refrescar]);

  const arrancar = useCallback(async () => {
    if (!hayApi() || !token()) return;
    await arrancarMotor().catch(() => {});
    void refrescar();
  }, [refrescar]);

  // El estado se completa con las funciones una sola vez, para no re-renderizar de más.
  const valor: Datos = { ...estado, refrescar, guardar, arrancar };
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
