import { useState, useRef } from 'react';
import { Card, Badge, Button, Avatar, Dinero } from '../components/ui';
import { ViewHead, BarRow } from '../components/viz';
import { AutomatizacionCard, clonarFlujo, flujoNuevo, nombreOFrase, type FlujoEditable } from '../components/AutomatizacionCard';
import {
  I_Whatsapp, I_Chat, I_Send, I_Zap, I_Check, I_Plus, I_Users,
  I_Clock, I_Edit, I_Robot, I_User, I_Camera, I_ArrowLeft,
} from '../components/icons';
import {
  CONVERSACIONES, FLUJOS,
  type Modo, type Mensaje, type Conversacion,
  type TipoConversacion, type EstadoColaboracion,
} from '../data/demo';
import { useDatos, type Conversacion as ConversacionBack } from '../api/datos';
import { EstadoVacio } from '../components/EstadoVacio';

// =============================================================================================
// CONVERSACIONES, SEGÚN LA PIEL DE LA CUENTA — el mismo bloque del motor, con dos idiomas.
//
// La decisión se toma EN ESTE componente, que no tiene estado: así el cambio de piel se resuelve
// antes de montar nada. Si el `if` viviera adentro de la pantalla de negocio (después de sus
// useState), cambiar de piel con Conversaciones abierto cambiaría la cantidad de hooks del mismo
// componente y React cortaría el render; aquí el único hook es leer la piel, y se lee siempre.
//
// La pantalla de negocio queda tal cual estaba: sólo cambia el nombre de la función.
// =============================================================================================

/**
 * Quién atiende la conversación: Rumi (la IA) o usted.
 * Es el único estado que decide si el motor puede contestar solo.
 */
type Control = 'ia' | 'humano';

// Las etapas del acuerdo con un creador, en orden. Se avanza de a una y se puede volver atrás.
const ETAPAS: EstadoColaboracion[] = ['invitado', 'negociando', 'acordado'];

/** El nombre de la etapa, como se lee en la pantalla. */
const textoEtapa = (e: EstadoColaboracion) =>
  e === 'invitado' ? 'Invitación enviada' : e === 'negociando' ? 'Negociando precio y plazo' : 'Acuerdo cerrado';

/** Cómo se pinta cada etapa: no es lo mismo esperar respuesta que tener el acuerdo cerrado. */
const TONO_ETAPA: Record<EstadoColaboracion, string> =
  { invitado: 'badge-amber', negociando: 'badge-purple', acordado: 'badge-green' };

/** Qué significa la etapa, para el title: es la etiqueta de la colaboración, no un mensaje. */
const AYUDA_ETAPA: Record<EstadoColaboracion, string> = {
  invitado: 'Le envió la propuesta al creador y todavía no ha contestado. Se avanza desde la tarjeta La colaboración, y siempre se puede volver atrás.',
  negociando: 'Ya hubo ida y vuelta por el precio y el plazo: falta cerrar. Se avanza desde la tarjeta La colaboración, y siempre se puede volver atrás.',
  acordado: 'Precio, plazo y entrega cerrados con el creador. Se puede volver atrás desde la tarjeta La colaboración.',
};


/** Arma un mapa id-de-conversación → valor, sin trucos de tipos. */
function porConversacion<T>(cs: Conversacion[], f: (c: Conversacion) => T): Record<string, T> {
  const out: Record<string, T> = {};
  for (const c of cs) out[c.id] = f(c);
  return out;
}

/** El texto que redactó Rumi para esta conversación: el borrador que cae en el compositor. */
function propuestaDe(id: string): string {
  if (id === 'v1') return '«Sí, hacemos envíos. Llega en 2 a 4 días hábiles y puede pagar en 3 cuotas sin interés. ¿Le reservo uno?»';
  if (id === 'v4') return '«Lamento el problema. Le paso con una persona del equipo para resolver la cancelación en el momento.»';
  // Con un creador la propuesta no vende un producto: destraba la colaboración (precio, plazo, entrega).
  if (id === 'v5') return '«¿Pudo ver la propuesta? Si le sirve el $12.000, le enviamos el serum mañana para que grabe cuando quiera, antes del 12 de octubre.»';
  if (id === 'v6') return '«Perfecto Bruno: cerramos en $20.000 con la reseña, las dos historias y la foto, publicadas el 6 de octubre. Le mando el serum mañana.»';
  return '«¡Gracias por escribir! ¿Le ayudo con algo más?»';
}

/** Las comillas de la propuesta son del panel, no del mensaje: no viajan al cliente. */
const sinComillas = (t: string) => t.replace(/^«\s*/, '').replace(/\s*»$/, '').trim();

const horaAhora = () => new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

// =============================================================================================
// LA BANDEJA DEL BACK — de dónde salen las conversaciones de esta pantalla
//
// Con el back encendido (`?api=…` y sesión), la bandeja lee las conversaciones del negocio y NADA
// más: ni un renglón de ejemplo. Sin back, sigue la demo de siempre, que es el respaldo del link de
// revisión. La decisión se toma una sola vez, en `bandeja`, dentro de la pantalla.
//
// Lo que el back todavía no manda (el historial de compras, quién atiende, el canal) no se inventa:
// la fila y el detalle muestran el teléfono, la etapa, el estado, el puntaje y el último mensaje,
// que es lo que hay. Mezclarlos con datos de ejemplo sería mentir sobre lo que hay.
// =============================================================================================

/** Los colores de la bandeja para las conversaciones del back, que no traen uno propio. */
const COLORES_BANDEJA = ['#22c55e', '#c084fc', '#f59e0b', '#06b6d4', '#ec4899'];

/**
 * Cuándo fue el último mensaje, en corto: la hora si fue hoy, la fecha si fue antes. Es lo que
 * necesita el dueño para saber si esa conversación es de ahora o de la semana pasada.
 */
const cuandoDe = (iso: string) => {
  const f = new Date(iso);
  if (isNaN(f.getTime())) return '—';
  return f.toDateString() === new Date().toDateString()
    ? f.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    : f.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
};

/**
 * Una conversación del back, con la forma que ya usa la bandeja. El teléfono hace de nombre —es todo
 * lo que el back sabe del lead— y el último mensaje es el que muestra la fila. La etapa, el estado y
 * el puntaje no se aplanan aquí: la fila los lee del dato original, así se ven tal como vienen.
 */
function conversacionDeBack(c: ConversacionBack, i: number): Conversacion {
  const cuando = cuandoDe(c.last_message_at);
  return {
    id: c.id,
    nombre: c.lead_phone || 'sin número',
    tag: c.stage || 'sin etapa',
    color: COLORES_BANDEJA[i % COLORES_BANDEJA.length],
    canal: 'wa',
    // El back todavía no dice quién atiende cada conversación ni cuáles esperan a una persona: la
    // bandeja no lo inventa, y por eso las conversaciones del back no entran en la cola de humanos.
    cola: 'ia',
    hora: cuando,
    esperando: '',
    msgs: c.ultimo ? [{ de: 'ellos', txt: c.ultimo, hora: cuando }] : [],
    tipo: 'cliente',
  };
}

export function ViewConversaciones({ setToast, modo }: { setToast: (t: string) => void; modo: Modo }) {
  const d = useDatos();
  // --- La fuente de la bandeja: las conversaciones del back si hay sesión, la demo si no. Todo lo
  // que se lee de aquí para abajo sale de `bandeja`; la demo queda intacta para el link de revisión.
  const bandeja: Conversacion[] = d.real ? d.conversaciones.map(conversacionDeBack) : CONVERSACIONES;
  /** El dato original del back detrás de cada fila: de aquí salen la etapa, el estado y el puntaje. */
  const delBack: Record<string, ConversacionBack> = {};
  if (d.real) for (const c of d.conversaciones) delBack[c.id] = c;
  // Un negocio conectado que todavía no tiene conversaciones no muestra la demo: muestra su estado vacío.
  const sinNada = d.real && bandeja.length === 0;
  // La bandeja de clientes del negocio (y los creadores que le producen una pieza): Rumi contesta
  // su propia vista —Comunidad— y el corte está arriba, en `ViewConversaciones`.
  const [sel, setSel] = useState(bandeja[0]?.id ?? '');
  // Quién atiende cada conversación. Las que llegaron a la cola de humanos arrancan en sus manos:
  // Rumi ya se corrió y nadie contestó.
  const [control, setControl] = useState<Record<string, Control>>(
    () => porConversacion<Control>(bandeja, c => (c.cola === 'humano' ? 'humano' : 'ia')));
  // Cuánto hace que esperan a un humano. null = ya no esperan (les contestó o volvió Rumi).
  const [espera, setEspera] = useState<Record<string, string | null>>(
    () => porConversacion<string | null>(bandeja, c => (c.cola === 'humano' ? c.esperando : null)));
  // El hilo de cada conversación, con lo que usted ya agregó.
  const [hilos, setHilos] = useState<Record<string, Mensaje[]>>(
    () => porConversacion<Mensaje[]>(bandeja, c => c.msgs));
  // Lo que hay escrito en el compositor de cada conversación (no se pierde al cambiar de chat).
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [filtro, setFiltro] = useState<'todas' | 'esperan'>('todas');
  // Quién le escribe: un cliente (le compra) o un creador (le produce una pieza). Son dos cosas
  // distintas y la bandeja las separa. 'todas' es la bandeja completa, sin filtrar.
  const [tipoFiltro, setTipoFiltro] = useState<'todas' | TipoConversacion>('todas');
  // En qué etapa va cada colaboración. Arranca con el dato de la conversación y se mueve desde
  // la tarjeta La colaboración del detalle.
  const [etapas, setEtapas] = useState<Record<string, EstadoColaboracion>>(() => {
    const out: Record<string, EstadoColaboracion> = {};
    for (const c of bandeja) if (c.colab) out[c.id] = c.colab.estado;
    return out;
  });
  const [ignoradas, setIgnoradas] = useState<string[]>([]);
  // AUTOMATIZACIONES EDITABLES. `base` es lo último guardado (la automatización que está
  // funcionando de verdad) y `flujos` es la copia que se toca en pantalla. Mientras no oprima
  // Guardar, la automatización real sigue siendo la de `base`: por eso se puede Descartar.
  const [base, setBase] = useState<FlujoEditable[]>(() => FLUJOS.map(clonarFlujo));
  const [flujos, setFlujos] = useState<FlujoEditable[]>(() => FLUJOS.map(clonarFlujo));
  // Automatizaciones que sacó de la lista y todavía no se guardó el borrado. Guardan su
  // posición para que Deshacer las devuelva al mismo lugar del que salieron.
  const [borrados, setBorrados] = useState<{ f: FlujoEditable; i: number }[]>([]);
  // La conexión de WhatsApp: probarla deja el resultado a la vista, y reemplazar el token se hace aquí.
  const [prueba, setPrueba] = useState<'probando' | 'ok' | null>(null);
  const [reemplazando, setReemplazando] = useState(false);
  const [tokenNuevo, setTokenNuevo] = useState('');
  const [tokenCambiado, setTokenCambiado] = useState(false);
  const compositor = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------------------------------------
  // LA PIEL DE CREADOR NO PASA POR AQUÍ. El corte está en `ViewConversaciones`, arriba y antes de
  // audiencia, con la respuesta que escribió Rumi—. Lo que sigue es la bandeja de clientes.
  // -------------------------------------------------------------------------------------------

  const cambiarFlujo = (f: FlujoEditable) =>
    setFlujos(fs => fs.map(x => (x.id === f.id ? f : x)));

  /** Hay cambios sin guardar: la copia editable no coincide con lo guardado. */
  const estaSucio = (f: FlujoEditable) => {
    const g = base.find(x => x.id === f.id);
    return !g || JSON.stringify(f) !== JSON.stringify(g);
  };

  const guardarFlujo = (f: FlujoEditable) => {
    // Una automatización nueva no estaba en `base`: al guardarla se agrega a lo que está funcionando.
    setBase(bs => (bs.some(x => x.id === f.id) ? bs.map(x => (x.id === f.id ? clonarFlujo(f) : x)) : [...bs, clonarFlujo(f)]));
    const cuantos = `${f.pasos.length} paso${f.pasos.length === 1 ? '' : 's'}`;
    setToast(`Guardó "${nombreOFrase(f)}": ${f.estado === 'Activo'
      ? `queda encendida con ${cuantos}`
      : `queda en pausa, con ${cuantos} listo${f.pasos.length === 1 ? '' : 's'} para cuando la enciendas`}`);
  };

  const descartarFlujo = (f: FlujoEditable) => {
    const original = base.find(x => x.id === f.id);
    // Nunca se guardó: descartar es sacarla de la lista, no queda nada pendiente.
    if (!original) {
      setFlujos(fs => fs.filter(x => x.id !== f.id));
      setToast(`Descartó "${nombreOFrase(f)}": como no la habías guardado, sale de la lista y no queda nada`);
      return;
    }
    setFlujos(fs => fs.map(x => (x.id === f.id ? clonarFlujo(original) : x)));
    setToast(`Descartó los cambios de "${nombreOFrase(f)}": volvió a como estaba`);
  };

  /** Crea una automatización vacía al final de la grilla, lista para editar. */
  const agregarFlujo = () => {
    const f = flujoNuevo();
    setFlujos(fs => [...fs, f]);
    setToast('Agregó una automatización nueva al final de la lista: póngale nombre, elija cuándo se dispara y escriba el primer mensaje. Arranca en pausa y todavía no está guardada');
    setTimeout(() => document.querySelector<HTMLInputElement>(`#aut-nombre-${f.id}`)?.focus(), 0);
  };

  /**
   * Saca una automatización entera de la lista. Es distinto de pausarla: en pausa queda guardada
   * y deja de mandar; borrada deja de existir. Si ya estaba guardada, el borrado queda pendiente y
   * se puede deshacer (una tarjeta borrada no tiene botón Descartar, así que el deshacer va aquí).
   */
  const borrarFlujo = (f: FlujoEditable) => {
    const i = flujos.findIndex(x => x.id === f.id);
    setFlujos(fs => fs.filter(x => x.id !== f.id));
    if (base.some(x => x.id === f.id)) {
      setBorrados(bs => [...bs, { f: clonarFlujo(f), i }]);
      setToast(`Sacó "${nombreOFrase(f)}" de la lista. No se guardó todavía: Deshacer la devuelve como estaba. Si quería sólo frenarla, la pausa la deja guardada`);
    } else {
      setToast(`Sacó "${nombreOFrase(f)}" de la lista. Como no la había guardado, no queda nada pendiente`);
    }
  };

  const deshacerBorrados = () => {
    setFlujos(fs => {
      const out = [...fs];
      // De menor a mayor: así cada automatización vuelve al lugar exacto del que salió.
      [...borrados].sort((a, b) => a.i - b.i).forEach(({ f, i }) => out.splice(Math.min(i, out.length), 0, clonarFlujo(f)));
      return out;
    });
    setToast(`Volvieron ${borrados.length === 1 ? 'la automatización que había sacado' : `las ${borrados.length} automatizaciones que había sacado`}: quedan como estaban`);
    setBorrados([]);
  };

  const conv = bandeja.find(c => c.id === sel) ?? bandeja[0];
  /** La cola de trabajo: las conversaciones que esperan a un humano. Sólo un cliente espera:
   *  con un creador no se contesta, se negocia. */
  const cola = bandeja.filter(c => espera[c.id]);
  // Las que esperan van primero: la bandeja es una cola de trabajo, no un archivo.
  const orden = [...bandeja].sort((a, b) => Number(!!espera[b.id]) - Number(!!espera[a.id]));
  /** Los dos filtros de la bandeja juntos: quién le escribe y quién espera a una persona. */
  const pasaFiltros = (c: Conversacion, t = tipoFiltro, f = filtro) =>
    (t === 'todas' || c.tipo === t) && (f === 'todas' || !!espera[c.id]);
  const visibles = orden.filter(c => pasaFiltros(c));
  const nClientes = bandeja.filter(c => c.tipo === 'cliente').length;
  const nCreadores = bandeja.filter(c => c.tipo === 'creador').length;
  const enNegociacion = bandeja.filter(c => etapas[c.id] === 'negociando').length;
  const acordadas = bandeja.filter(c => etapas[c.id] === 'acordado').length;
  // La conversación abierta puede no existir todavía: con el back encendido y la bandeja vacía, estas
  // lecturas quedan en vacío en vez de romper la pantalla. El detalle no se monta en ese caso.
  const msgs = hilos[conv?.id ?? ''] ?? conv?.msgs ?? [];
  const atiende = control[conv?.id ?? ''] ?? 'ia';
  const texto = borrador[conv?.id ?? ''] ?? '';
  /** La etapa de la colaboración abierta: sólo tiene sentido si el que escribe es un creador. */
  const etapa = etapas[conv?.id ?? ''] ?? 'invitado';
  /** El dato del back de la conversación abierta: sin él, la pantalla muestra la demo. */
  const cruda = conv ? delBack[conv.id] : undefined;

  /**
   * Cambia un filtro y, si la conversación abierta queda fuera de la lista, abre la primera que
   * sí queda: la bandeja y el detalle nunca se contradicen.
   */
  const filtrar = (t: 'todas' | TipoConversacion, f: 'todas' | 'esperan') => {
    setTipoFiltro(t);
    setFiltro(f);
    const lista = orden.filter(c => pasaFiltros(c, t, f));
    if (lista.length > 0 && !lista.some(c => c.id === sel)) setSel(lista[0].id);
  };

  /**
   * Mueve la colaboración una etapa adelante o atrás. No le manda nada al creador: es la etiqueta
   * del acuerdo, y el mensaje sale sólo desde el compositor.
   */
  const moverEtapa = (id: string, paso: 1 | -1) => {
    const i = ETAPAS.indexOf(etapas[id] ?? 'invitado');
    const siguiente = ETAPAS[Math.min(ETAPAS.length - 1, Math.max(0, i + paso))];
    setEtapas(p => ({ ...p, [id]: siguiente }));
    const nombre = (bandeja.find(c => c.id === id)?.nombre ?? 'el creador').split(' ')[0];
    setToast(paso === 1
      ? `La colaboración con ${nombre} quedó en «${textoEtapa(siguiente)}». No le salió ningún mensaje: el acuerdo se cuenta desde el compositor`
      : `Volviste la colaboración con ${nombre} a «${textoEtapa(siguiente)}»: no cambia nada de lo ya hablado`);
  };

  const tomarControl = (id: string) => {
    setControl(p => ({ ...p, [id]: 'humano' }));
    setToast('Usted toma esa conversación: Rumi deja de contestar hasta que se la devuelva');
  };

  const devolverARumi = (id: string) => {
    setControl(p => ({ ...p, [id]: 'ia' }));
    setEspera(p => ({ ...p, [id]: null }));
    setBorrador(p => ({ ...p, [id]: '' }));
    setToast('Se la devolvió a Rumi: vuelve a contestar sola');
  };

  /** La propuesta de la IA no se manda sola: baja al compositor y la manda usted. */
  const bajarAlBorrador = (id: string) => {
    setBorrador(p => ({ ...p, [id]: sinComillas(propuestaDe(id)) }));
    setControl(p => ({ ...p, [id]: 'humano' }));
    setIgnoradas(p => p.filter(x => x !== id));
    setToast('La propuesta de Rumi bajó al borrador de abajo: edítela y envíela usted');
    setTimeout(() => compositor.current?.focus(), 0);
  };

  const escribir = (id: string, v: string) => {
    setBorrador(p => ({ ...p, [id]: v }));
    // Escribir es tomar el control: Rumi no puede contestar arriba de su respuesta.
    if ((control[id] ?? 'ia') === 'ia' && v.trim() !== '') {
      setControl(p => ({ ...p, [id]: 'humano' }));
      setToast('Usted toma esa conversación: Rumi deja de contestar hasta que se la devuelva');
    }
  };

  const enviar = (id: string) => {
    const t = (borrador[id] ?? '').trim();
    if (!t) {
      setToast('Escriba algo antes de mandar: no sale un mensaje vacío');
      compositor.current?.focus();
      return;
    }
    const quien = bandeja.find(c => c.id === id)?.nombre ?? 'el cliente';
    setHilos(p => ({ ...p, [id]: [...(p[id] ?? []), { de: 'yo', txt: t, hora: horaAhora() }] }));
    setBorrador(p => ({ ...p, [id]: '' }));
    setControl(p => ({ ...p, [id]: 'humano' }));
    setEspera(p => ({ ...p, [id]: null }));
    setToast(`Mensaje enviado a ${quien} por su WhatsApp real`);
  };

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Whatsapp size={19} />}
        titulo="Conversaciones"
        sub="Todo su WhatsApp y Messenger en un solo lugar. Aquí caen dos cosas distintas y se ven distintas: los clientes que le quieren comprar y los creadores que le producen una pieza. Rumi contesta sola y usted entra sólo cuando hace falta."
        nums={[
          // Con el back encendido la bandeja cuenta conversaciones, que es lo que el back tiene. Los
          // 128 mensajes y el 94% de la demo no se muestran: no hay de dónde sacarlos todavía.
          { v: String(bandeja.length), l: d.real ? 'conversaciones en la bandeja' : 'mensajes de clientes hoy' },
          ...(d.real ? ([] as { v: string; l: string; c?: string }[]) : [{ v: '94%', l: 'de esos, los contestó la IA', c: 'var(--green)' }]),
          { v: String(cola.length), l: 'clientes esperan a un humano', c: cola.length ? 'var(--red)' : 'var(--green)' },
          { v: String(nCreadores), l: `colaboraciones con creadores${enNegociacion ? ` · ${enNegociacion} en negociación` : acordadas ? ` · ${acordadas} acordada${acordadas === 1 ? '' : 's'}` : ''}`, c: 'var(--purple4)' },
          { v: String(flujos.filter(f => f.estado === 'Activo').length), l: `de ${flujos.length} automatizaciones de clientes`, c: 'var(--purple3)' },
        ]}
      />

      {/* ============ LA BANDEJA Y EL CHAT ============ */}
      {d.real && d.cargando && bandeja.length === 0 ? (
        /* El panel está trayendo la bandeja del back: todavía no se sabe si hay conversaciones o no,
           así que no se muestra ni el estado vacío ni una conversación de ejemplo. */
        <EstadoVacio
          icono={<I_Whatsapp size={22} />}
          titulo="Leyendo sus conversaciones…"
          texto="Un segundo: el panel está trayendo del servidor lo que este negocio tiene en la bandeja."
        />
      ) : sinNada ? (
        /* Un negocio conectado que todavía no tiene conversaciones: aquí no va ni una de ejemplo.
           Dice de dónde caen y qué hacer para tener la primera. */
        <EstadoVacio
          icono={<I_Whatsapp size={22} />}
          titulo="Todavía no hay conversaciones"
          texto="Aquí van a caer las de WhatsApp y Messenger de su negocio, y también las de los creadores que le producen una pieza: con ellos se negocia el precio, el plazo y lo que entregan, todo en esta misma conversación. Conecte su WhatsApp, que está aquí abajo en esta pantalla, y escríbale al número del negocio: la primera aparece sola."
        />
      ) : (
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Chat size={14} style={{ color: 'var(--purple3)' }} /> La bandeja</span>}
          action={<Badge tone={cola.length ? 'red' : 'green'}>{cola.length ? `${cola.length} clientes esperan a un humano` : 'nadie espera a un humano'}</Badge>}
        >
          {/* Los dos filtros, en la misma fila: quién le escribe (cliente o creador) y la cola de
              trabajo. Un creador NO es un cliente: mezclados, no se sabe si hay que contestarle
              como comprador o negociar con él como proveedor. */}
          <div className="ban-filtros">
            <span className="bt">Quién le escribe</span>
            <div className="seg-group">
              <span className={`seg ${tipoFiltro === 'cliente' ? 'on' : ''}`} role="button"
                title={`Muestra sólo las conversaciones de clientes (${nClientes}): gente que le compró o le quiere comprar. Es sólo la vista, y puede volver a Todas cuando quiera.`}
                onClick={() => filtrar('cliente', filtro)}>Clientes ({nClientes})</span>
              <span className={`seg ${tipoFiltro === 'creador' ? 'on' : ''}`} role="button"
                title={`Muestra sólo las conversaciones de creadores (${nCreadores}): gente que le produce una pieza. No le compran nada: con ellos se negocia precio, plazo y entrega. Es sólo la vista.`}
                onClick={() => filtrar('creador', filtro)}>Creadores ({nCreadores})</span>
              <span className={`seg ${tipoFiltro === 'todas' ? 'on' : ''}`} role="button"
                title={`Muestra las ${bandeja.length} conversaciones de la bandeja: clientes y creadores juntos. Puede volver a este filtro cuando quiera.`}
                onClick={() => filtrar('todas', filtro)}>Todas ({bandeja.length})</span>
            </div>
            <span className="bt">Cola</span>
            <div className="seg-group">
              <span className={`seg ${filtro === 'todas' ? 'on' : ''}`} role="button"
                title="Muestra toda la bandeja, sin mirar quién espera a una persona. Es sólo la vista, y puede volver cuando quiera."
                onClick={() => filtrar(tipoFiltro, 'todas')}>Sin filtrar</span>
              <span className={`seg ${filtro === 'esperan' ? 'on' : ''}`} role="button"
                title={`Muestra sólo los ${cola.length} clientes que esperan a una persona. Un creador nunca espera a un humano: con él se negocia. No cambia nada de las conversaciones.`}
                onClick={() => filtrar(tipoFiltro, 'esperan')}>Esperan a un humano ({cola.length})</span>
            </div>
          </div>

          {visibles.length === 0 ? (
            <div className="bs">
              {tipoFiltro === 'creador'
                ? 'No hay ninguna colaboración con creadores a la vista con estos filtros. Las invitaciones que salen desde Publicar aparecen aquí, en violeta, con Rumi negociando el precio y el plazo.'
                : filtro === 'esperan'
                  ? 'No hay ninguna conversación esperando a una persona ahora mismo: Rumi está contestando todas. Cuando una se escale sola o se enfríe, aparece aquí arriba.'
                  : 'No hay ninguna conversación en la bandeja con estos filtros: vuelva a Todas para verlas todas.'}
            </div>
          ) : visibles.map(c => {
            const hilo = hilos[c.id] ?? c.msgs;
            const quien = control[c.id] ?? 'ia';
            /** El dato del back de esta fila: si existe, la fila se lee del back y nada más. */
            const cruda = delBack[c.id];
            return (
              <div key={c.id} className="notif" onClick={() => setSel(c.id)}
                style={{ cursor: 'pointer', background: c.id === sel ? 'var(--bg3)' : 'transparent', borderRadius: 10 }}
                title={`Abra la conversación de ${c.nombre} en el panel de la derecha`}>
                <div className="pv-av" style={{ background: c.color, width: 34, height: 34, fontSize: 12 }}>
                  {cruda ? <I_Whatsapp size={14} /> : c.nombre.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row spread">
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{c.nombre}</span>
                    <span className="tiny muted">{c.hora}</span>
                  </div>
                  <div className="tiny muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {hilo.length > 0 ? hilo[hilo.length - 1].txt : 'Todavía no hay mensajes en esta conversación.'}
                  </div>
                  <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {cruda ? (
                      /* Una conversación del back se lee como viene: teléfono, etapa, estado y puntaje.
                         Nada de insignias de la demo (cliente/creador, canal, quién atiende), que el
                         back todavía no distingue. */
                      <>
                        <span className="badge badge-green" style={{ fontSize: 9 }}
                          title="Le escribió a su WhatsApp: es de donde entran las conversaciones al motor.">
                          <I_Whatsapp size={9} /> WhatsApp
                        </span>
                        <span className="badge badge-purple" style={{ fontSize: 9 }}
                          title="En qué etapa va el lead, tal como la tiene el motor.">
                          {cruda.stage || 'sin etapa'}
                        </span>
                        <span className="badge badge-muted" style={{ fontSize: 9 }}
                          title="El estado de la conversación en el back.">
                          {cruda.status || 'sin estado'}
                        </span>
                        <span className={`badge ${cruda.lead_score >= 70 ? 'badge-green' : cruda.lead_score >= 40 ? 'badge-amber' : 'badge-muted'}`} style={{ fontSize: 9 }}
                          title="Qué tan caliente está el lead: lo puntúa el motor con lo que escribió, de 0 a 100.">
                          {cruda.lead_score} de 100
                        </span>
                      </>
                    ) : (<>
                    <span className={`badge ${c.tipo === 'creador' ? 'tg-creador' : 'tg-cliente'}`} style={{ fontSize: 9 }}
                      title={c.tipo === 'creador'
                        ? 'Es un creador: le produce una pieza, no le compra. Rumi negocia con él el precio, el plazo y qué entrega.'
                        : 'Es un cliente: le compró o le quiere comprar. Rumi le contesta con su historial de compras pegado.'}>
                      {c.tipo === 'creador' ? <I_Camera size={9} /> : <I_User size={9} />}
                      {' '}{c.tipo === 'creador' ? 'Creador' : 'Cliente'}
                    </span>
                    <span className={`badge ${c.canal === 'wa' ? 'badge-green' : 'badge-purple'}`} style={{ fontSize: 9 }}>
                      {c.canal === 'wa' ? 'WhatsApp' : 'Messenger'}
                    </span>
                    <span className={`badge ${quien === 'ia' ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: 9 }}
                      title={quien === 'ia' ? 'A esta la contesta Rumi sola' : 'A esta la está contestando usted: Rumi no escribe'}>
                      {quien === 'ia' ? 'Atiende Rumi (IA)' : 'Atiende usted'}
                    </span>
                    {espera[c.id] && (
                      <span className="badge badge-red" style={{ fontSize: 9 }}
                        title="Hace cuánto que el cliente está esperando una respuesta de una persona">
                        <I_Clock size={10} /> espera hace {espera[c.id]}
                      </span>
                    )}
                    {c.tipo === 'creador' && etapas[c.id] && (
                      <span className={`badge ${TONO_ETAPA[etapas[c.id]]}`} style={{ fontSize: 9 }}
                        title={AYUDA_ETAPA[etapas[c.id]]}>
                        {textoEtapa(etapas[c.id])}
                      </span>
                    )}
                    <span className="badge badge-muted" style={{ fontSize: 9 }}>{c.tag}</span>
                    </>)}
                  </div>
                </div>
              </div>
            );
          })}

          {/* De dónde vinieron los 128 mensajes de hoy es de la demo: con el back encendido sólo se
              muestra lo que el back tiene, que es la lista de arriba. */}
          {!d.real && (
            <div style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
              <div className="tiny muted" style={{ marginBottom: 7 }}>De dónde vinieron los 128 mensajes de clientes de hoy</div>
              <BarRow label="WhatsApp" valor={78} max={128} color="var(--green)" />
              <BarRow label="Messenger" valor={34} max={128} color="var(--purple2)" />
              <BarRow label="Instagram" valor={16} max={128} color="#e11d48" />
            </div>
          )}
          <div className="acc-why">
            El motor no escribe de <b>22:00 a 08:00</b>: es un freno duro que no se puede desactivar.
          </div>
        </Card>

        <Card
          title={
            <span className="row" style={{ gap: 10 }}>
              <Avatar name={conv.nombre} size={30} />{conv.nombre}
            </span>
          }
          action={
            <span className="row" style={{ gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {cruda ? (
                /* Lo que el back sabe de esta conversación, tal como viene: etapa, estado, puntaje y
                   cuándo llegó el último mensaje. Sin insignias de la demo. */
                <>
                  <span className="badge badge-green" title="Le escribió a su WhatsApp."><I_Whatsapp size={11} /> WhatsApp</span>
                  <span className="badge badge-purple" title="En qué etapa va el lead, tal como la tiene el motor.">{cruda.stage || 'sin etapa'}</span>
                  <span className="badge badge-muted" title="El estado de la conversación en el back.">{cruda.status || 'sin estado'}</span>
                  <Badge tone={cruda.lead_score >= 70 ? 'green' : cruda.lead_score >= 40 ? 'amber' : 'muted'}>
                    puntaje {cruda.lead_score} de 100
                  </Badge>
                  <Badge tone="muted">último mensaje {conv.hora}</Badge>
                </>
              ) : (<>
              <span className={`badge ${conv.tipo === 'creador' ? 'tg-creador' : 'tg-cliente'}`}
                title={conv.tipo === 'creador'
                  ? 'Esta conversación es de un creador: le produce una pieza. No hay compra ni historial de cliente: lo que importa es qué le pide, a qué precio y para cuándo.'
                  : 'Esta conversación es de un cliente: le compró o le quiere comprar. Rumi contesta con su historial pegado.'}>
                {conv.tipo === 'creador' ? <I_Camera size={11} /> : <I_User size={11} />}
                {' '}{conv.tipo === 'creador' ? 'Creador' : 'Cliente'}
              </span>
              {espera[conv.id] && <Badge tone="red">espera hace {espera[conv.id]}</Badge>}
              <Badge tone={atiende === 'ia' ? 'green' : 'amber'}>
                {atiende === 'ia' ? 'Atiende Rumi (IA)' : 'Atiende usted'}
              </Badge>
              </>)}
            </span>
          }
        >
          <div className="hilo">
            {msgs.map((m, i) => {
              const cliente = m.de === 'ellos';
              const mio = m.de === 'yo';
              return (
                <div key={i} style={{
                  alignSelf: cliente ? 'flex-start' : 'flex-end', maxWidth: '86%',
                  background: cliente ? 'var(--bg3)' : mio ? 'rgba(34,197,94,.15)' : 'rgba(168,85,247,.16)',
                  border: `1px solid ${cliente ? 'var(--border)' : mio ? 'rgba(34,197,94,.4)' : 'rgba(168,85,247,.35)'}`,
                  borderRadius: 13, padding: '10px 13px',
                }}>
                  <div style={{ fontSize: 13, lineHeight: 1.45 }}>{m.txt}</div>
                  <div className="tiny muted" style={{ marginTop: 4, textAlign: 'right' }}>
                    {mio ? 'Usted' : m.de === 'ia' ? 'Rumi · IA' : ''}{m.hora ? `${mio || m.de === 'ia' ? ' · ' : ''}${m.hora}` : ''}
                  </div>
                </div>
              );
            })}
          </div>

          {cruda ? (
            /* Una conversación del back no trae historial de compras ni ticket promedio: lo que hay
               es el teléfono, la etapa, el estado, el puntaje y la fecha del último mensaje. */
            <>
              <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
                <div className="dato"><span className="dato-l">Teléfono</span><span className="dato-v">{cruda.lead_phone || conv.nombre}</span></div>
                <div className="dato"><span className="dato-l">Etapa</span><span className="dato-v">{cruda.stage || '—'}</span></div>
                <div className="dato"><span className="dato-l">Estado</span><span className="dato-v">{cruda.status || '—'}</span></div>
                <div className="dato"><span className="dato-l">Puntaje del lead</span>
                  <span className="dato-v" style={{ color: cruda.lead_score >= 70 ? 'var(--green)' : 'var(--amber)' }}>{cruda.lead_score} de 100</span></div>
              </div>
              <div className="bs">
                Esto es lo que el motor sabe de esta conversación: el teléfono del lead, en qué etapa va
                y cuánto lo puntuó. Todavía no hay historial de compras ni ticket promedio que mostrar aquí.
              </div>
            </>
          ) : conv.tipo === 'creador' && conv.colab ? (
            /* Un creador no tiene compras ni ticket promedio: tiene una pieza que entregar, un
               precio y una fecha. Por eso el contexto de abajo es otro, no el del cliente. */
            <div className="colab">
              <div className="colab-head">
                <span className="colab-t"><I_Camera size={13} /> La colaboración</span>
                <span className={`badge ${TONO_ETAPA[etapa]}`} title={AYUDA_ETAPA[etapa]}>{textoEtapa(etapa)}</span>
              </div>
              <div className="colab-filas">
                <div className="colab-f">
                  <span className="colab-l">Qué le pide</span>
                  <span className="colab-v">{conv.colab.pedido}</span>
                </div>
                <div className="colab-f">
                  <span className="colab-l">Precio</span>
                  <span className="colab-v">{conv.colab.precio}</span>
                </div>
                <div className="colab-f">
                  <span className="colab-l">Plazo</span>
                  <span className="colab-v">{conv.colab.plazo}</span>
                </div>
                <div className="colab-f">
                  <span className="colab-l">Qué entrega</span>
                  <span className="colab-v">{conv.colab.entrega}</span>
                </div>
              </div>
              <div className="colab-acc">
                {etapa !== 'acordado' && (
                  <Button className="btn-sm"
                    title={etapa === 'invitado'
                      ? 'Marca la colaboración como «negociando», para cuando el creador ya contestó y están hablando de precio y plazo. No le manda ningún mensaje al creador y es reversible con Volver a invitación.'
                      : 'Marca la colaboración como «acordado», con el precio, el plazo y la entrega como quedaron. No le manda ningún mensaje al creador: el acuerdo se cuenta desde el compositor. Es reversible con Volver a negociación.'}
                    onClick={() => moverEtapa(conv.id, 1)}>
                    <I_Check size={13} /> {etapa === 'invitado' ? 'Pasó a negociar' : 'Cerrar el acuerdo'}
                  </Button>
                )}
                {etapa !== 'invitado' && (
                  <Button variant="ghost" className="btn-sm"
                    title={`Vuelve la colaboración un paso atrás, a «${textoEtapa(etapa === 'acordado' ? 'negociando' : 'invitado')}». Es reversible: puede volver a avanzarla cuando quiera, y no cambia nada de lo que ya se habló.`}
                    onClick={() => moverEtapa(conv.id, -1)}>
                    <I_ArrowLeft size={13} /> {etapa === 'acordado' ? 'Volver a negociación' : 'Volver a invitación'}
                  </Button>
                )}
              </div>
              <div className="bs">
                Aquí no hay compras ni ticket promedio: hay una pieza que se entrega. El precio, el plazo y la
                etapa son de esta colaboración, no de una venta.
              </div>
            </div>
          ) : (
            <>
              <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
                <div className="dato"><span className="dato-l">Cliente hace</span><span className="dato-v">4 meses</span></div>
                <div className="dato"><span className="dato-l">Compras</span><span className="dato-v" style={{ color: 'var(--green)' }}>3</span></div>
                <div className="dato"><span className="dato-l">Ticket promedio</span><span className="dato-v"><Dinero monto={8400} /></span></div>
              </div>
              <div className="bs">
                El agente ya sabe esto antes de contestar: cada conversación lleva el historial del cliente pegado.
              </div>
            </>
          )}

          {cruda ? (
            /* El texto que propone Rumi es de la demo: con el back encendido no hay ninguna propuesta
               escrita, y la pantalla no la inventa. */
            <div className="alarm" style={{ borderLeft: '3px solid var(--purple2)', background: 'rgba(168,85,247,.05)' }}>
              <div className="alarm-head">
                <span className="alarm-sev oportunidad">LO QUE PROPONE EL AGENTE</span>
                <span className="alarm-when">el motor todavía no la escribió</span>
              </div>
              <div className="alarm-sug" style={{ color: 'var(--txt)' }}>
                Esta conversación viene del back: aquí no hay un borrador escrito por Rumi y la pantalla
                no lo inventa. Cuando el motor escriba la propuesta, aparece en este mismo lugar, lista
                para bajar al compositor.
              </div>
            </div>
          ) : ignoradas.includes(conv.id) ? (
            <div className="composer-hint" style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg2)' }}>
              Descartó el borrador que había escrito Rumi en esta conversación. {conv.tipo === 'creador' ? 'El creador' : 'El cliente'} sigue sin
              respuesta: escriba usted abajo, o pida el borrador otra vez.
              <div className="row" style={{ gap: 8, marginTop: 9, flexWrap: 'wrap' }}>
                <Button variant="ghost" className="btn-sm" title="Vuelva a mostrar el borrador que Rumi había escrito. No manda nada al cliente."
                  onClick={() => setIgnoradas(p => p.filter(x => x !== conv.id))}><I_Edit size={13} /> Ver el borrador otra vez</Button>
              </div>
            </div>
          ) : (
            <div className="alarm" style={{ borderLeft: '3px solid var(--purple2)', background: 'rgba(168,85,247,.05)' }}>
              <div className="alarm-head">
                <span className="alarm-sev oportunidad">LO QUE PROPONE EL AGENTE</span>
                <span className="alarm-when">generado hace instantes</span>
              </div>
              <div className="alarm-sug" style={{ color: 'var(--txt)' }}>
                {propuestaDe(conv.id)}
              </div>
              <div className="alarm-acts">
                <Button className="btn-sm" title="No manda nada al cliente: baja este texto al compositor de abajo para que lo edite y lo envíe usted."
                  onClick={() => bajarAlBorrador(conv.id)}><I_Edit size={13} /> Bajar al borrador</Button>
                <Button variant="ghost" className="btn-sm" title="Saca el borrador de la pantalla. No le contesta al cliente y no se pierde: puede volver a verlo cuando quiera."
                  onClick={() => { setIgnoradas(p => [...p, conv.id]); setToast('Descartó el borrador de Rumi: el cliente sigue esperando'); }}>Ignorar</Button>
              </div>
              <div className="tiny muted" style={{ marginTop: 9 }}>
                Rumi no manda nada sola aquí: el borrador baja al compositor y sale recién cuando lo manda usted.
                {' '}
                {modo === 'auto' ? 'Está en Automático: en el resto de las conversaciones Rumi responde y le avisa en la bitácora.'
                  : modo === 'shared' ? 'Está en Compartido: Rumi prepara la respuesta y espera su OK.'
                  : 'Está en Manual: Rumi sólo sugiere, usted escribe.'}
              </div>
            </div>
          )}

          {/* ============ EL COMPOSITOR — de aquí salen TODOS los mensajes ============ */}
          <div className="composer" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="composer-strip">
              <span className={`composer-who ${atiende === 'ia' ? 'ia' : 'yo'}`}>
                {atiende === 'ia' ? <><I_Robot size={13} /> Atiende Rumi (IA)</> : <><I_User size={13} /> Atiende usted</>}
              </span>
              <span className="composer-hint">
                {atiende === 'ia'
                  ? 'Rumi está contestando. Si escribe, toma el control.'
                  : 'Está atendiendo usted · Rumi no contesta hasta que se la devuelva.'}
              </span>
              {atiende === 'ia' ? (
                <Button variant="ghost" className="btn-sm" title="Pase la conversación a sus manos: Rumi deja de contestar hasta que se la devuelva. Es reversible."
                  onClick={() => tomarControl(conv.id)}>Tomar el control</Button>
              ) : (
                <Button variant="ghost" className="btn-sm" title="Rumi vuelve a contestar sola en esta conversación. Es reversible: puede tomar el control otra vez."
                  onClick={() => devolverARumi(conv.id)}>Devolvérsela a Rumi</Button>
              )}
            </div>
            <div className="composer-row">
              <input
                id={`comp-${conv.id}`}
                ref={compositor}
                className="input"
                value={texto}
                placeholder={atiende === 'ia'
                  ? 'Rumi está contestando. Si escribe, toma el control.'
                  : `Escríbale a ${conv.nombre} y envíe…`}
                title={atiende === 'ia'
                  ? 'Escriba aquí y toma el control: Rumi deja de contestar. Después lo envía con Enviar.'
                  : `Escriba aquí la respuesta y envíela: sale por su WhatsApp real al instante.`}
                onChange={e => escribir(conv.id, e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') enviar(conv.id); }}
              />
              <Button title={texto.trim()
                ? 'Envía este texto al cliente por su WhatsApp real, al instante. No se puede deshacer.'
                : 'Escriba algo primero: no sale un mensaje vacío.'}
                onClick={() => enviar(conv.id)}><I_Send size={14} /> Enviar</Button>
            </div>
            <div className="tiny muted">
              Es el único lugar desde donde salen los mensajes: lo que propone Rumi baja aquí como
              borrador y sale cuando lo manda usted. Queda en el hilo marcado como suyo.
            </div>
          </div>
        </Card>
      </div>
      )}

      {/* ============ ESCALADOS Y CANAL ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--red)' }} /> Lo que escaló solo</span>}
          action={<Badge tone={cola.length ? 'red' : 'green'}>{cola.length}</Badge>}
        >
          {cola.length === 0 ? (
            <div className="bs">
              {d.real
                ? 'El back todavía no marca cuáles conversaciones están esperando a una persona: cuando lo haga, las urgentes aparecen aquí.'
                : 'Nadie está esperando a una persona ahora mismo: Rumi está contestando todo. Cuando detecte un cliente enojado o que quiere cancelar, frena y aparece aquí.'}
            </div>
          ) : cola.map(c => (
            <div key={c.id} className="alarm critico" style={{ marginBottom: 10, borderLeft: '3px solid var(--red)' }}>
              <div className="alarm-head">
                <span className="alarm-sev critico">ESCALÓ SOLO</span>
                <span className="alarm-when">espera hace {c.esperando}</span>
              </div>
              <div className="alarm-title" style={{ minWidth: 0 }}>{c.nombre}: {c.tag}</div>
              <div className="alarm-sug">{((hilos[c.id] ?? c.msgs).slice(-1)[0]?.txt ?? '').slice(0, 110)}</div>
              <div className="alarm-acts">
                <Button className="btn-sm" title="Abra la conversación y tome el control, con el cursor en el compositor. Rumi no contesta hasta que se la devuelva."
                  onClick={() => { setSel(c.id); setControl(p => ({ ...p, [c.id]: 'humano' })); setTimeout(() => compositor.current?.focus(), 0); }}>
                  <I_Chat size={13} /> Abrir y contestar
                </Button>
              </div>
            </div>
          ))}
          <div className="acc-why">
            El agente <b>no intenta retener a un cliente enojado</b>: cuando detecta intención de cancelar,
            frena y se lo pasa a usted. Escalar solo también es una decisión, y es la correcta.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--green)' }} /> Su propia API de WhatsApp</span>}
          action={<Badge tone={tokenCambiado ? 'purple' : 'green'}>{tokenCambiado ? 'token nuevo' : 'conectada'}</Badge>}
        >
          <div className="bs">
            Sinkroo no le da un número: conecta el suyo. Pegue su token de WhatsApp Business y el motor trabaja
            sobre su línea real, con sus plantillas y su historial.
          </div>
          <div className="datos-row" style={{ marginTop: 15 }}>
            <div className="dato"><span className="dato-l">Número</span><span className="dato-v">+57 300 555 2341</span></div>
            <div className="dato"><span className="dato-l">Mensajes hoy</span><span className="dato-v">128</span></div>
            <div className="dato"><span className="dato-l">Tiempo de respuesta</span><span className="dato-v" style={{ color: 'var(--green)' }}>4 s</span></div>
          </div>
          <div className="row" style={{ gap: 9, marginTop: 15, flexWrap: 'wrap' }}>
            <Button variant="outline" className="btn-sm"
              title="Pruebe que el token sigue activo, sin volver a pegarlo. Si falla, no cambia nada: le dice qué hacer."
              onClick={() => { setPrueba('probando'); setTimeout(() => setPrueba('ok'), 900); }}>
              <I_Check size={13} /> {prueba === 'probando' ? 'Probando…' : 'Probar conexión'}
            </Button>
            <Button variant="ghost" className="btn-sm" title="Reemplace el token por uno nuevo. Se pega aquí y el motor sigue con la misma línea, sin perder el historial."
              onClick={() => setReemplazando(true)}><I_Plus size={13} /> Reemplazar token</Button>
          </div>
          {prueba === 'ok' && (
            <div className="tiny" style={{ marginTop: 10, color: 'var(--green)', fontWeight: 700 }}>
              Última prueba: recién. El token responde en 0,4 s y siguen activos los 5 permisos de abajo.
            </div>
          )}
          {reemplazando && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input className="input" style={{ flex: '1 1 240px', minWidth: 0 }} placeholder="EAA… su token nuevo"
                value={tokenNuevo} onChange={e => setTokenNuevo(e.target.value)} />
              <Button className="btn-sm" disabled={!tokenNuevo.trim()}
                title="Guarde el token nuevo. Reversible: si algo falla, puede volver a pegar el anterior y nada se pierde."
                onClick={() => { setTokenCambiado(true); setReemplazando(false); setTokenNuevo(''); setToast('Token reemplazado: el motor sigue trabajando con su misma línea'); }}>
                Guardar token
              </Button>
              <Button variant="ghost" className="btn-sm" title="Cierre sin cambiar nada: el token que estaba sigue funcionando"
                onClick={() => { setReemplazando(false); setTokenNuevo(''); }}>Cancelar</Button>
            </div>
          )}
          {tokenCambiado && (
            <div className="tiny" style={{ marginTop: 10, color: 'var(--green)', fontWeight: 700 }}>
              Token reemplazado hace un momento: no se perdieron ni el historial ni las plantillas. El anterior quedó invalidado.
            </div>
          )}
          <div>
            <div className="bs" style={{ marginBottom: 9 }}>Qué habilita esta conexión en el motor:</div>
            <div className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
              {['enviar mensaje', 'leer respuestas', 'enviar plantillas', 'marcar etiquetas', 'derivar a un humano'].map(c => (
                <span key={c} className="badge badge-purple" style={{ fontSize: 9.5 }}>{c}</span>
              ))}
            </div>
          </div>
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Guardado</span><span className="dato-v">cifrado</span></div>
            <div className="dato"><span className="dato-l">Última prueba</span><span className="dato-v" style={{ color: 'var(--green)' }}>hace 2 min</span></div>
            <div className="dato"><span className="dato-l">Se revoca desde</span><span className="dato-v">su Meta</span></div>
          </div>
          <div className="acc-why">
            Su token se guarda cifrado y <b>se prueba antes de guardarse</b>. Ninguna pantalla de Sinkroo lo vuelve a mostrar.
          </div>
        </Card>
      </div>

      {/* ============ AUTOMATIZACIONES ============ */}
      <div className="csec">
        <span className="csec-n">1</span>
        <span className="csec-t">Automatizaciones</span>
        <span className="csec-s">Mensajes que salen solos en el momento justo. Enciéndalas, apáguelas y edite cada paso aquí mismo</span>
        {/* El alta de automatizaciones: agrega una tarjeta vacía al final de la grilla. */}
        <Button className="btn-sm csec-act"
          title="Agrega una automatización nueva al final de la lista, con el primer paso listo para escribir. Arranca en pausa y no sale ningún mensaje hasta que la guarde y la encienda. Mientras no la guarde, Descartar la saca de la lista."
          onClick={agregarFlujo}><I_Plus size={13} /> Nueva automatización</Button>
      </div>
      {/* Las automatizaciones se disparan con cosas de un CLIENTE (compró, abandonó el carrito, no
          compra hace 90 días). Con un creador no se disparan: eso se negocia en la conversación. */}
      <div className="aut-solo-cli">
        <I_User size={12} />
        <span>
          Estas automatizaciones son <b>para clientes</b>: se disparan con lo que hace un cliente (escribe
          por primera vez, deja el carrito, no compra hace 90 días). <b>No se aplican a los creadores</b>:
          con un creador el precio, el plazo y lo que entrega se negocian en la conversación, no le sale un
          mensaje automático.
        </span>
      </div>
      {/* Un borrado de algo ya guardado deja de ser reversible sólo cuando lo confirma: por eso el
          deshacer está aquí arriba, donde se ve aunque la tarjeta ya no esté. */}
      {borrados.length > 0 && (
        <div className="aut-borrados">
          <span className="aut-borrados-t">
            Sacó {borrados.length === 1 ? 'una automatización' : `${borrados.length} automatizaciones`} de la
            lista ({borrados.map(b => nombreOFrase(b.f)).join(', ')}). Todavía no se guardó el borrado.
          </span>
          <Button variant="ghost" className="btn-sm"
            title="Devuelve a la lista la automatización que borró, en el mismo lugar en el que estaba y con sus pasos intactos. Como el borrado todavía no se guardó, no se perdió nada."
            onClick={deshacerBorrados}>Deshacer</Button>
        </div>
      )}
      {flujos.length === 0 ? (
        <div className="bs">
          No hay ninguna automatización en la lista. Agregue una con el botón <b>Nueva automatización</b> de
          arriba: mientras no la guarde, no le sale nada a ningún cliente.
        </div>
      ) : (
        <div className="duo">
          {flujos.map(f => (
            <AutomatizacionCard key={f.id} flujo={f} sucio={estaSucio(f)} avisar={setToast}
              onCambio={cambiarFlujo} onGuardar={() => guardarFlujo(f)} onDescartar={() => descartarFlujo(f)}
              onBorrar={() => borrarFlujo(f)} />
          ))}
        </div>
      )}
    </div>
  );
}
