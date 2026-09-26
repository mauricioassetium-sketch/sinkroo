import { Card, Badge, Button } from './ui';
import { I_Zap } from './icons';
import { useDatos } from '../api/datos';
import { EstadoVacio } from './EstadoVacio';

/**
 * La secuencia de mensajes, tal como se edita en pantalla.
 * El estado editable vive en la vista (Conversaciones), no en el archivo de datos: aquí sólo se
 * dibuja lo que la vista pasa y se avisa cada cambio con onCambio.
 *
 * HOY NO HAY NINGUNA SECUENCIA Y NO SE INVENTA NINGUNA: el sistema todavía no manda mensajes solo —no
 * hay ruta de envío—, así que la tarjeta muestra el estado vacío —qué es, sobre qué se configura y qué
 * falta para tenerla— en vez de una secuencia de ejemplo con sus pasos, sus retardos, sus disparadores
 * y sus cifras. Sin back (modo demostración) tampoco hay ninguna que mostrar: la pantalla es la misma,
 * el mismo estado vacío.
 *
 * Los callbacks de edición siguen en la firma porque los pasa la vista; cuando el back pueda mandar
 * las secuencias reales, esta tarjeta vuelve a pintar los pasos y a usarlos.
 */
export type PasoFlujo = { id: string; delay: string; txt: string; condicion?: boolean };
export type FlujoEditable = {
  id: string; nombre: string; disparador: string; grupo: string; estado: string;
  resultado: { v: string; l: string }[];
  pasos: PasoFlujo[];
};

/** Copia profunda de un flujo: la copia editable no puede compartir arrays con los datos. */
export function clonarFlujo(f: FlujoEditable): FlujoEditable {
  return { ...f, resultado: f.resultado.map(r => ({ ...r })), pasos: f.pasos.map(p => ({ ...p })) };
}

/** Un id nuevo por secuencia creada, para poder editarla sin confundirla con otra. */
let seq = 0;

/**
 * Una secuencia nueva, vacía: la crea el botón "+ Nueva secuencia de mensajes" de Conversaciones.
 * Arranca EN PAUSA a propósito: hasta que el dueño no la revise y la guarde, no le sale nada a
 * ningún cliente. El primer paso viene listo para escribir el mensaje, y el disparador queda sin
 * elegir: lo escoge el dueño, no viene puesto por un ejemplo.
 */
export function flujoNuevo(): FlujoEditable {
  seq++;
  const id = `nueva-${Date.now()}-${seq}`;
  return {
    id, nombre: '', disparador: '', grupo: 'Sin categoría', estado: 'En pausa',
    resultado: [], pasos: [{ id: `${id}-p1`, delay: 'Al instante', txt: '' }],
  };
}

/** Cómo se lee el nombre de una secuencia de mensajes que todavía no tiene nombre. */
export const nombreOFrase = (f: FlujoEditable) => f.nombre.trim() || 'la secuencia nueva';

// =============================================================================================
// LA TARJETA — el estado vacío, que dice qué va a quedar acá y cuándo se puede configurar.
// =============================================================================================

export function SecuenciaMensajesCard(_props: {
  flujo: FlujoEditable;
  /** Hay cambios sin guardar en esta secuencia. */
  sucio: boolean;
  onCambio: (f: FlujoEditable) => void;
  onGuardar: () => void;
  onDescartar: () => void;
  /** Saca la secuencia entera de la lista (la vista decide si todavía se puede devolver). */
  onBorrar: () => void;
  avisar: (t: string) => void;
}) {
  // De dónde sale esta tarjeta: del back, siempre. Sin back no hay cuenta que leer, así que la
  // pantalla es la misma: el estado vacío, sin pasos ni cifras de ejemplo.
  const d = useDatos();
  return (
    <Card
      className="aut-card"
      title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--purple3)' }} /> Secuencias de mensajes</span>}
      action={<Badge tone="muted">sin configurar</Badge>}
    >
      <EstadoVacio
        titulo="Acá van a quedar sus secuencias de mensajes"
        texto="Una secuencia de mensajes manda sola cuando pasa algo del negocio: alguien escribe por primera vez, deja el carrito, no compra hace 90 días. Todavía no está conectada —el sistema no manda mensajes solo—, así que acá no hay ninguna: cuando el back habilite el envío, esta tarjeta es donde se arma cada paso y se elige cuándo sale cada mensaje."
      />
      <div className="acc-why">
        El motor todavía no manda ningún mensaje solo: <b>nada queda encendido por su cuenta</b>, y usted
        no tiene que apagarlo.
      </div>
      {d.real && (
        <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
          <Button variant="ghost" className="btn-sm"
            title="Vuelve a leer su cuenta: si el back ya tiene secuencias de mensajes configuradas, aparecen acá con sus pasos."
            onClick={() => void d.refrescar()}>Volver a leer</Button>
        </div>
      )}
    </Card>
  );
}
