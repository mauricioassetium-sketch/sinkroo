// =====================================================================================================
// EL MOTOR TRABAJANDO — el aviso de que el motor está trabajando, en TODOS los lugares donde escribe.
//
// El dueño lo pidió con estas palabras: «cuando el motor esté corriendo debe salir la misma barra de carga
// circular en todos los lugares donde el motor mete información, para que se sepa que está trabajando».
// Antes cada bloque mostraba su estado vacío («No hay nada que mostrar todavía») como si nada estuviera
// pasando, mientras el motor trabajaba en ese mismo dato.
//
// CÓMO FUNCIONA: UNA sola pregunta al back para todo el panel (no una por bloque). Un almacén de módulo
// guarda el estado y avisa a quien lo esté mirando; el intervalo es de 4 segundos mientras corre y de 20
// cuando está quieto (para enterarse igual si la corrida la lanzó otra pantalla o el celular).
// =====================================================================================================
import { useEffect, useState } from 'react';
import { baseApi, token } from '../api/cliente';

export type MotorVivo = {
  corriendo: boolean;
  paso: string;
  detalle: string;
  paso_de: number;
  pasos: number;
  ronda: number;
  segundos: number;
  tareas: number;
  estimado_seg: number | null;
  sin_latido?: boolean;
  /** El nombre de los seis pasos, tal como los manda el back (acá no se duplican). */
  pasos_nombres: string[];
  /** La corrida cruda, para quien necesite más (la línea de carga de las rondas). */
  corrida: Record<string, unknown> | null;
  /** TODO lo que está en marcha, en líneas: la corrida, los videos que se están montando, etc. */
  trabajos: Trabajo[];
};

export type Trabajo = {
  clase: string;
  que: string;
  detalle: string;
  paso_de?: number;
  pasos?: number;
  segundos?: number;
  ronda?: number;
  /** El promedio real de las corridas anteriores: con esto la barra dice cuánto falta. */
  estimado_seg?: number | null;
  /** Los agentes que ya dejaron su tarea en la corrida en curso. El panel los marca y saca por descarte al que
   *  está trabajando ahora: sin esto adivinaba y, con la lista de corridas vieja, siempre daba Vera. */
  agentes_hechos?: string[];
};

let actual: MotorVivo | null = null;
const oyentes = new Set<(m: MotorVivo | null) => void>();
let reloj: ReturnType<typeof setTimeout> | null = null;

function avisar() { for (const o of oyentes) o(actual); }

async function preguntar(): Promise<void> {
  try {
    const r = await fetch(baseApi() + '/api/sistema/trabajando', {
      headers: token() ? { Authorization: 'Bearer ' + token() } : {},
    });
    if (r.ok) {
      const j = await r.json();
      const trabajos = (Array.isArray(j?.trabajando) ? j.trabajando : []) as Trabajo[];
      // La corrida es la tarea principal: de ahí salen los campos que ya usaban las pantallas.
      const c = (trabajos.find((t: Trabajo) => t.clase === 'corrida') ?? null) as Record<string, any> | null;
      actual = {
        corriendo: trabajos.length > 0,
        paso: String(c?.paso ?? ''),
        detalle: String(c?.detalle ?? ''),
        paso_de: Number(c?.paso_de ?? 0),
        pasos: Number(c?.pasos ?? 0),
        ronda: Number(c?.ronda ?? 0),
        segundos: Number(c?.segundos ?? 0),
        tareas: trabajos.length,
        estimado_seg: null,
        sin_latido: Boolean(c?.sin_latido),
        pasos_nombres: [],
        corrida: c,
        trabajos,
      };
      avisar();
    }
  } catch { /* sin back no hay aviso: el bloque se queda como está */ }
  // Se vuelve a preguntar: cada 2 s mientras trabaja —una corrida con la escritura pausada dura siete
  // segundos, y con 4 no se alcanzaba a ver quién trabajaba— y cada 20 s cuando está quieto.
  const cada = actual?.corriendo ? 2000 : 20000;
  reloj = setTimeout(() => void preguntar(), cada);
}

/** El estado del motor, compartido por todo el panel: un solo reloj para todos los bloques. */
export function useMotorVivo(): MotorVivo | null {
  const [m, setM] = useState<MotorVivo | null>(actual);
  useEffect(() => {
    oyentes.add(setM);
    if (!reloj && !actual) void preguntar();
    return () => { oyentes.delete(setM); };
  }, []);
  return m;
}

/** Los segundos, en reloj: 2:14. */
function relojDe(seg: number): string {
  const s = Math.max(0, Math.round(seg || 0));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * LA LISTA DE LO QUE ESTÁ HACIENDO, EN LÍNEAS: una por tarea, todas a la vez. Es lo que va en la barra del
 * menú (siempre visible en toda la app) para tener «visualización total de lo que está trabajando el sistema».
 * Con varias tareas en curso se ven varias líneas, cada una con su paso, su detalle y su reloj.
 */
export function ListaDeTrabajo() {
  const m = useMotorVivo();
  if (!m?.trabajos?.length) return null;
  return (
    <div className="tk-trabajos">
      {m.trabajos.length > 1
        ? <span className="tk-cuantas">{m.trabajos.length} tareas en curso a la vez</span>
        : null}
      {m.trabajos.map((t, i) => {
        // LA BARRA: el avance se mide en PASOS (que es lo que el motor sabe de verdad), y el tiempo que falta
        // sale del promedio real de las corridas anteriores de ese negocio. Sin historial no se inventa un
        // número: se dice que todavía no hay estimado.
        const porc = t.pasos ? Math.min(100, Math.max(0, Math.round((Number(t.paso_de) / Number(t.pasos)) * 100))) : 0;
        const falta = t.estimado_seg ? Math.round(Number(t.estimado_seg) - Number(t.segundos || 0)) : null;
        const paso = Number(t.paso_de) || 0;
        return (
          <div className="tk-trabajo" key={`${t.clase}-${i}`}>
            <span className="mt-spin" title="el sistema está trabajando en esto ahora mismo" />
            <span className="tk-trabajo-t">
              <span className="tk-trabajo-linea">
                <b>{t.que}</b>
                {t.pasos ? <span className="tk-paso">paso {t.paso_de} de {t.pasos}{t.ronda ? ` · ronda ${t.ronda}` : ''}</span> : null}
                <span className="tk-reloj">
                  {t.segundos ? <>lleva {relojDe(t.segundos)}</> : null}
                  {falta !== null && falta > 0 ? <> · <b>faltan ~{relojDe(falta)}</b></> : null}
                  {falta !== null && falta <= 0 ? <> · se está pasando del promedio</> : null}
                  {falta === null && t.pasos ? <> · sin estimado todavía</> : null}
                </span>
              </span>
              {t.pasos ? (
                <span className="tk-barra" title={`${paso} de ${t.pasos} pasos: ${porc}%`}>
                  <span className="tk-barra-fill" style={{ width: `${porc}%` }} />
                </span>
              ) : null}
              {t.detalle ? <span className="tk-detalle">{t.detalle}</span> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * EL AVISO. `compacto` es la línea chica para el encabezado de un bloque; sin `compacto` trae el paso y el
 * reloj. Con `que` se dice en qué está trabajando ese bloque en particular.
 */
export function MotorTrabajando({ que, compacto = false }: { que?: string; compacto?: boolean }) {
  const m = useMotorVivo();
  if (!m) return null;

  // Cuando el latido se enfrió (el proceso murió sin cerrar la corrida) NO se miente: se avisa que se cortó.
  if (m.sin_latido && m.paso_de) {
    return (
      <span className="mt-linea mt-cortada" title={`el motor dejó de dar señales en el paso ${m.paso_de} de ${m.pasos}`}>
        <span className="mt-punto" /> El motor dejó de dar señales en «{m.paso}»: la corrida puede haberse cortado
      </span>
    );
  }
  if (!m.corriendo) return null;

  const donde = que ? `${que} · ` : '';
  return (
    <span className={'mt-linea' + (compacto ? ' mt-chica' : '')}>
      <span className="mt-spin" title="el motor está trabajando ahora mismo" />
      <span className="mt-txt">
        {compacto
          ? <>{donde}el motor está trabajando{que ? '' : ` · ${m.paso || 'escribiendo'}`}</>
          : <>
              <b>El motor está trabajando</b>{m.ronda ? ` · ronda ${m.ronda}` : ''}
              {m.pasos ? <> · paso {m.paso_de} de {m.pasos}</> : null}
              {m.paso ? <>: {m.paso}</> : null}
              {m.segundos ? <> · lleva {relojDe(m.segundos)}</> : null}
              {m.detalle ? <span className="mt-detalle">{m.detalle}</span> : null}
            </>}
      </span>
    </span>
  );
}
