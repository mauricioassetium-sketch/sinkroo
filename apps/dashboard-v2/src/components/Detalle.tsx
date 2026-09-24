import { createContext, useContext, useState, type ReactNode } from 'react';
import { Modal, Button, Badge } from './ui';

// =============================================================================================
// EL PANEL DE DETALLE — lo que muestra CUALQUIER botón que informa.
//
// Regla del dueño: «todos los botones deben hacer algo y ese algo debe mostrarse». Un aviso que
// dice «(demo)» no es algo: se va solo y no deja nada. Todo botón que no cambia el estado de una
// campaña abre ESTE panel, con el dato real del negocio adentro (el gasto desglosado, las
// variantes que escribió el motor, el historial, el por qué de la votación).
//
// Un solo lugar para todos: el contenido se arma con bloques, así que agregar un botón nuevo es
// escribir sus datos, no una pantalla nueva.
// =============================================================================================

export type Bloque =
  /** Un párrafo: el contexto de lo que se está mirando. */
  | { tipo: 'texto'; texto: string }
  /** Filas etiqueta → valor: el desglose de un número, un antes y un después, un dato y su peso. */
  | { tipo: 'datos'; filas: { k: string; v: string; s?: string; tono?: 'green' | 'amber' | 'red' | 'muted' }[] }
  /** Filas de una lista con su etiqueta: las variantes, las piezas, los movimientos. */
  | { tipo: 'filas'; items: { t: string; s?: string; etiqueta?: string; tono?: 'purple' | 'green' | 'amber' | 'red' | 'muted' }[] }
  /** Lo que el motor va a hacer, en orden y numerado. */
  | { tipo: 'pasos'; items: string[] }
  /** Un aviso al pie: lo que hay que saber antes de decidir. */
  | { tipo: 'aviso'; texto: string; tono?: 'green' | 'amber' };

export type Detalle = {
  titulo: string;
  sub?: string;
  bloques: Bloque[];
  /** De dónde sale el dato que se está mostrando (para que nunca quede un número sin origen). */
  fuente?: string;
  /** Acciones al pie del panel. Cada una tiene que producir un cambio visible al cerrar. */
  acciones?: { label: string; onClick: () => void; variante?: 'primary' | 'outline' | 'ghost'; title?: string }[];
};

const Ctx = createContext<(d: Detalle) => void>(() => {});
/** Abre el panel de detalle: `const detalle = useDetalle(); detalle({ titulo, bloques })`. */
export const useDetalle = () => useContext(Ctx);

export function DetalleProvider({ children }: { children: ReactNode }) {
  const [d, setD] = useState<Detalle | null>(null);

  return (
    <Ctx.Provider value={setD}>
      {children}
      <Modal open={!!d} onClose={() => setD(null)} title={d?.titulo || ''}>
        {d?.sub && <div className="bs" style={{ marginTop: -6 }}>{d.sub}</div>}

        {d?.bloques.map((b, i) => {
          if (b.tipo === 'texto') return <div key={i} className="bs det-texto">{b.texto}</div>;

          if (b.tipo === 'datos') return (
            <div key={i} className="det-grupo">
              {b.filas.map((f, j) => (
                <div key={j} className="guard">
                  <span className="guard-lb">{f.k}{f.s && <small>{f.s}</small>}</span>
                  {f.tono
                    ? <Badge tone={f.tono}>{f.v}</Badge>
                    : <span className="guard-val">{f.v}</span>}
                </div>
              ))}
            </div>
          );

          if (b.tipo === 'filas') return (
            <div key={i} className="det-grupo">
              {b.items.map((it, j) => (
                <div key={j} className="guard">
                  <span className="guard-lb">{it.t}{it.s && <small>{it.s}</small>}</span>
                  {it.etiqueta && <Badge tone={it.tono || 'muted'}>{it.etiqueta}</Badge>}
                </div>
              ))}
            </div>
          );

          if (b.tipo === 'pasos') return (
            <div key={i} className="det-pasos">
              {b.items.map((p, j) => (
                <div key={j} className="det-paso"><span className="det-paso-n">{j + 1}</span><span>{p}</span></div>
              ))}
            </div>
          );

          return <div key={i} className={`acc-why ${b.tono === 'amber' ? 'det-amber' : ''}`}>{b.texto}</div>;
        })}

        {d?.fuente && <div className="tiny muted det-fuente">{d.fuente}</div>}

        {d?.acciones && d.acciones.length > 0 && (
          <div className="row det-acciones">
            {d.acciones.map((a, i) => (
              <Button key={i} variant={a.variante || 'outline'} className="btn-sm"
                title={a.title || 'Cierra este panel y aplica el cambio en la pantalla, al instante'}
                onClick={() => { setD(null); a.onClick(); }}>{a.label}</Button>
            ))}
          </div>
        )}
      </Modal>
    </Ctx.Provider>
  );
}
