import { useState } from 'react';
import { Card, Badge, Button } from './ui';
import { I_Zap, I_Edit, I_Trash, I_Plus, I_Check, I_Eye, I_Whatsapp } from './icons';
import { RETARDOS, CONDICIONES, DISPARADORES } from '../data/demo';

/**
 * La automatización, tal como se edita en pantalla.
 * El estado editable vive en la vista (Conversaciones), no en el archivo de datos: acá sólo se
 * dibuja lo que la vista pasa y se avisa cada cambio con onCambio.
 * El retardo NO se escribe a mano: se elige de una lista corta (RETARDOS / CONDICIONES de demo.ts).
 * Escribir tiempos libres confundía al dueño de la tienda ("AI instante"), y además el motor sólo
 * sabe medir los tiempos de la lista: cualquier otra cosa no se podía cumplir.
 */
export type PasoFlujo = { id: string; delay: string; txt: string; condicion?: boolean };
export type FlujoEditable = {
  id: string; nombre: string; disparador: string; grupo: string; estado: string;
  resultado: { v: string; l: string }[];
  pasos: PasoFlujo[];
};

/** Las variables que el motor completa solo con los datos de cada cliente. */
const VARIABLES = ['{nombre}', '{producto}', '{descuento}'];

/** Copia profunda de un flujo: la copia editable no puede compartir arrays con los datos. */
export function clonarFlujo(f: FlujoEditable): FlujoEditable {
  return { ...f, resultado: f.resultado.map(r => ({ ...r })), pasos: f.pasos.map(p => ({ ...p })) };
}

/** Un id nuevo por paso agregado, para poder editarlo sin confundirlo con otro. */
let seq = 0;

/** Un paso nuevo arranca con un tiempo de la lista, nunca con un texto libre. */
const pasoNuevo = (): PasoFlujo => ({ id: `nuevo-${Date.now()}-${++seq}`, delay: RETARDOS[1], txt: '' });

/**
 * Una automatización nueva, vacía: la crea el botón "+ Nueva automatización" de Conversaciones.
 * Arranca EN PAUSA a propósito: hasta que el dueño no la revise y la guarde, no le sale nada a
 * ningún cliente. El primer paso viene listo para escribir el mensaje.
 */
export function flujoNuevo(): FlujoEditable {
  seq++;
  const id = `nueva-${Date.now()}-${seq}`;
  return {
    id, nombre: '', disparador: DISPARADORES[0], grupo: 'Sin categoría', estado: 'En pausa',
    resultado: [], pasos: [{ id: `${id}-p1`, delay: 'Al instante', txt: '' }],
  };
}

/** Cómo se lee el nombre de una automatización que todavía no tiene nombre. */
export const nombreOFrase = (f: FlujoEditable) => f.nombre.trim() || 'la automatización nueva';

/** Resalta {variables} dentro del mensaje: son las que el motor completa solo. */
function conVariables(txt: string) {
  return txt.split(/(\{[a-záéíóúñ]+\})/i).map((t, i) => (
    /^\{[a-záéíóúñ]+\}$/i.test(t)
      ? <span key={i} className="aut-var" title={`${t} se completa sola con el dato del cliente. No hace falta que la escribas a mano.`}>{t}</span>
      : <span key={i}>{t}</span>
  ));
}

/** El momento del paso escrito como se dice hablando: lo usa la prueba de la burbuja. */
function cuandoLlega(p: PasoFlujo): string {
  if (p.condicion) return `cuando el cliente ${p.delay.replace(/^Si /, '').toLowerCase()}`;
  if (p.delay === RETARDOS[0]) return 'al instante, apenas te escribe';
  return `${p.delay.replace(' después', '')} después de que te escriba`;
}

export function AutomatizacionCard({ flujo, sucio, onCambio, onGuardar, onDescartar, onBorrar, avisar }: {
  flujo: FlujoEditable;
  /** Hay cambios sin guardar en esta automatización. */
  sucio: boolean;
  onCambio: (f: FlujoEditable) => void;
  onGuardar: () => void;
  onDescartar: () => void;
  /** Saca la automatización entera de la lista (la vista decide si todavía se puede devolver). */
  onBorrar: () => void;
  avisar: (t: string) => void;
}) {
  // El paso cuyo mensaje se está escribiendo ahora. El retardo no se edita: se elige de la lista.
  const [editando, setEditando] = useState<string | null>(null);
  // Si la prueba del primer paso está a la vista.
  const [prueba, setPrueba] = useState(false);
  const activo = flujo.estado === 'Activo';
  const primerPaso = flujo.pasos[0];
  const sinNombre = !flujo.nombre.trim();
  const nombre = nombreOFrase(flujo);
  // Una automatización que todavía no corrió no tiene cifras: se dice con palabras, no se deja vacío.
  const sinCifras = flujo.resultado.length === 0;

  const cambiarPaso = (id: string, campos: Partial<PasoFlujo>) =>
    onCambio({ ...flujo, pasos: flujo.pasos.map(p => (p.id === id ? { ...p, ...campos } : p)) });

  const agregarPaso = () => {
    const p = pasoNuevo();
    onCambio({ ...flujo, pasos: [...flujo.pasos, p] });
    setEditando(p.id);
    avisar(`Agregaste un paso al final de "${nombre}": elegí el tiempo de la lista, escribí el mensaje y apretá Guardar`);
  };

  const borrarPaso = (id: string) => {
    onCambio({ ...flujo, pasos: flujo.pasos.filter(p => p.id !== id) });
    setEditando(null);
    avisar(`Sacaste un paso de "${nombre}". Todavía no se guardó: Descartar lo devuelve`);
  };

  const encenderApagar = () => {
    const estado = activo ? 'En pausa' : 'Activo';
    onCambio({ ...flujo, estado });
    avisar(estado === 'Activo'
      ? `"${nombre}" queda encendida: vuelve a mandar sus mensajes (falta Guardar)`
      : `"${nombre}" queda en pausa: no sale ningún mensaje hasta que la vuelvas a encender`);
  };

  const guardar = () => {
    if (sinNombre) {
      avisar('Esta automatización todavía no tiene nombre: escribí uno (por ejemplo "Recordatorio de recompra") y volvé a guardar');
      return;
    }
    if (flujo.pasos.length === 0) {
      avisar('Una automatización sin pasos no manda nada: agregá al menos un paso');
      return;
    }
    const sinTexto = flujo.pasos.find(p => !p.txt.trim());
    if (sinTexto) {
      avisar('Hay un paso sin texto: completalo o borralo antes de guardar');
      setEditando(sinTexto.id);
      return;
    }
    onGuardar();
  };

  const descartar = () => {
    onDescartar();
    setEditando(null);
    setPrueba(false);
  };

  return (
    <Card
      className="aut-card"
      title={
        <span className="row aut-nombre-row" style={{ gap: 8 }}>
          <I_Zap size={14} style={{ color: 'var(--purple3)' }} />
          <input className="aut-nombre" value={flujo.nombre} placeholder="Ej. Recordatorio de recompra"
            title="El nombre de esta automatización: es el que ves en la lista y el que sale en los avisos. Se puede escribir y, mientras no guardes, Descartar lo devuelve."
            onChange={e => onCambio({ ...flujo, nombre: e.target.value })} />
        </span>
      }
      action={
        <span className="aut-head">
          {!sinCifras && (
            <span className="aut-res">
              {flujo.resultado.map(r => (
                <span key={r.l} className="aut-res-i" title={`${r.v} ${r.l}: lo que esta automatización logró este mes`}>
                  <b>{r.v}</b><i>{r.l}</i>
                </span>
              ))}
            </span>
          )}
          {/* BORRAR LA AUTOMATIZACIÓN ENTERA: es distinto de pausarla, y por eso el title lo aclara. */}
          <button className="icon-btn danger aut-del"
            title="Saca esta automatización de la lista. Es distinto de pausarla: en pausa queda guardada y no manda nada; borrada deja de existir. Mientras no guardes, se puede descartar y la automatización vuelve tal como estaba."
            onClick={onBorrar}><I_Trash size={13} /></button>
        </span>
      }
    >
      {/* ENCENDIDO / APAGADO: el estado y el badge salen del mismo dato, así que siempre coinciden. */}
      <div className="aut-barra">
        <button className={`toggle ${activo ? 'on' : ''}`} role="switch" aria-checked={activo}
          title="Cuando está en pausa no se manda ningún mensaje. Se puede volver a activar cuando quieras. Pausar no borra: la automatización y sus pasos siguen guardados."
          onClick={encenderApagar} />
        <Badge tone={activo ? 'green' : 'muted'}>{flujo.estado}</Badge>
        <span className="badge badge-muted" title="Para qué sirve esta automatización dentro de la tienda">{flujo.grupo}</span>
        <span className="aut-barra-nota">
          {sinCifras
            ? 'Todavía no salió ningún mensaje de acá: cuando empiece a correr van a aparecer los clientes y la plata que movió.'
            : activo
              ? 'Manda sus mensajes sola cuando se cumple el tiempo de cada paso.'
              : 'No se manda nada de esta automatización mientras esté en pausa.'}
        </span>
      </div>

      {/* CUÁNDO SE DISPARA: también se elige de la lista. Es el momento en que arranca la secuencia. */}
      <div className="aut-disparo">
        <span className="aut-disparo-t">Se dispara</span>
        <select className="input aut-sel aut-sel-disparo" value={flujo.disparador}
          title="Cuándo arranca esta automatización. Elegilo de la lista: es el momento del negocio en que la tienda empieza a mandar sola estos mensajes."
          onChange={e => onCambio({ ...flujo, disparador: e.target.value })}>
          {DISPARADORES.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <span className="aut-disparo-n">El primer paso sale a partir de este momento.</span>
      </div>

      {/* VARIABLES: aviso chico con las que se pueden usar en cualquier mensaje. */}
      <div className="aut-vars">
        <span className="aut-vars-t">Podés usar estas variables en los mensajes:</span>
        {VARIABLES.map(v => (
          <span key={v} className="aut-var" title={`${v} se completa sola con el dato del cliente: en el mensaje se lee reemplazada, sin las llaves.`}>{v}</span>
        ))}
        <span className="aut-vars-n">se completan solas con el dato de cada cliente</span>
      </div>

      {/* LOS PASOS: el tiempo se elige de la lista y el mensaje se edita donde se lee. */}
      <div className="tl aut-pasos">
        {flujo.pasos.length === 0 ? (
          <div className="bs">
            Esta automatización quedó sin pasos, así que no manda nada. Agregá uno con el botón
            <b> Agregar paso</b> de abajo.
          </div>
        ) : flujo.pasos.map(p => {
          const edTxt = editando === p.id;
          return (
            <div key={p.id} className="tl-item">
              <span className="tl-dot" style={{ background: p.condicion ? 'var(--amber)' : 'var(--purple2)' }} />
              {p.condicion ? (
                <select className="input aut-sel aut-sel-cond" value={p.delay}
                  title="Este paso no espera un tiempo: depende de lo que haga el cliente. Elegí el caso de la lista."
                  onChange={e => cambiarPaso(p.id, { delay: e.target.value })}>
                  {CONDICIONES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <select className="input aut-sel aut-sel-delay" value={p.delay}
                  title="Cuándo se manda este mensaje. Elegí uno de los tiempos de la lista: son los que el motor sabe medir, no hace falta escribir nada."
                  onChange={e => cambiarPaso(p.id, { delay: e.target.value })}>
                  {RETARDOS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              )}
              <div className="tl-body">
                {edTxt ? (
                  <input className="input aut-in" autoFocus value={p.txt} placeholder="Escribí el mensaje que le llega al cliente…"
                    title="Escribí el mensaje tal como le llega al cliente. Podés usar las variables de arriba y apretar Enter al terminar."
                    onChange={e => cambiarPaso(p.id, { txt: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditando(null); }}
                    onBlur={() => setEditando(null)} />
                ) : (
                  <div className="tl-text aut-clic" role="button" style={{ fontSize: 12.5 }}
                    title="Clic para editar el mensaje. Es reversible mientras no guardes."
                    onClick={() => setEditando(p.id)}>
                    {p.txt.trim() ? conVariables(p.txt) : <span className="aut-vacio">Escribí el mensaje de este paso…</span>}
                  </div>
                )}
                <div className="aut-paso-acts">
                  <button className="icon-btn aut-mini" title="Editar el mensaje de este paso. Reversible mientras no guardes."
                    onClick={() => setEditando(p.id)}><I_Edit size={12} /></button>
                  <button className="icon-btn aut-mini danger" title="Borra este paso de la automatización. Es reversible mientras no guardes: Descartar lo devuelve."
                    onClick={() => borrarPaso(p.id)}><I_Trash size={12} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* LA PRUEBA: el primer paso como le llega al cliente, en una burbuja de WhatsApp. */}
      {prueba && primerPaso && (
        <div className="aut-prueba">
          <div className="aut-prueba-t">
            <I_Whatsapp size={13} /> Así le llega a un cliente nuevo, en tu WhatsApp
          </div>
          <div className="hilo aut-hilo">
            <div className="wa-burbuja">
              <div style={{ fontSize: 13, lineHeight: 1.45 }}>{conVariables(primerPaso.txt)}</div>
              <div className="tiny muted wa-burbuja-hora">
                {activo ? `Sale ${cuandoLlega(primerPaso)}` : 'No sale: la automatización está en pausa'}
              </div>
            </div>
          </div>
          <div className="tiny muted">
            Es una vista previa: no se le manda nada a nadie. {activo
              ? 'La automatización está encendida, así que este mensaje sale solo.'
              : 'Si la encendés, este mensaje empieza a salir solo.'}
          </div>
        </div>
      )}

      {/* GUARDAR / DESCARTAR + AGREGAR PASO + VER LA PRUEBA: el pie de la tarjeta. */}
      <div className="aut-pie">
        <Button variant="ghost" className="btn-sm" title="Agrega un paso nuevo al final de la secuencia. Se puede borrar mientras no guardes."
          onClick={agregarPaso}><I_Plus size={13} /> Agregar paso</Button>
        <Button variant="outline" className="btn-sm"
          title="Muestra el primer paso como una burbuja de WhatsApp, tal como lo ve el cliente. No manda nada: es una vista previa."
          onClick={() => setPrueba(v => !v)}><I_Eye size={13} /> {prueba ? 'Ocultar la prueba' : 'Ver cómo le llega'}</Button>
        {sucio && (
          <>
            <span className="badge badge-amber aut-sucio"
              title="Todavía no se guardó: la automatización sigue funcionando como estaba. Guardá para aplicar los cambios o Descartá para volver atrás.">
              cambios sin guardar
            </span>
            <Button className="btn-sm"
              title="Aplica los cambios: desde acá la automatización funciona como la dejaste, con estos pasos y este estado."
              onClick={guardar}><I_Check size={13} /> Guardar</Button>
            <Button variant="ghost" className="btn-sm"
              title="Vuelve la automatización a como estaba antes de editar. No se puede deshacer, pero sólo se pierden estos cambios."
              onClick={descartar}>Descartar</Button>
          </>
        )}
      </div>
    </Card>
  );
}
