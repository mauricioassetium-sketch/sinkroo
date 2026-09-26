import { useState } from 'react';
import { Card, Badge } from '../components/ui';
import { ViewHead } from '../components/viz';
import { SecuenciaMensajesCard, flujoNuevo } from '../components/SecuenciaMensajesCard';
import { I_Whatsapp, I_Chat, I_Users } from '../components/icons';
/** El modo del motor (Automático, Compartido, Manual) es un ajuste del panel: catálogo, no dato de nadie. */
import { MODOS, type Modo } from '../data/demo';
import { useDatos } from '../api/datos';
import { EstadoVacio } from '../components/EstadoVacio';

// =============================================================================================
// CONVERSACIONES — la bandeja de WhatsApp, tal como está en el back
//
// Todo lo de esta pantalla sale de `d.conversaciones` (GET /api/conversaciones): teléfono, etapa,
// estado, puntaje del lead, fecha del último mensaje y el texto de ese último mensaje. No hay
// conversaciones de ejemplo, ni hilos, ni cifras de respuesta que nadie midió: sin conversaciones,
// la pantalla dice de dónde caen y qué hace falta para tener la primera.
//
// LO QUE EL BACK TODAVÍA NO TIENE (por eso no se dibuja): el historial completo de mensajes, quién
// atiende cada conversación, cuáles esperan a una persona y la ruta para mandar un mensaje desde el
// panel. Ninguna de esas cosas se simula acá.
// =============================================================================================

/** Hace cuánto, en corto: «hace un instante», «hace 20 min», «hace 3 h», «hace 2 días». */
const cuandoDe = (iso?: string | null) => {
  if (!iso) return '';
  const f = new Date(iso);
  if (isNaN(+f)) return String(iso);
  const min = Math.round((Date.now() - f.getTime()) / 60000);
  if (min < 1) return 'hace un instante';
  if (min < 60) return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.floor(min / 60)} h`;
  const dias = Math.floor(min / 1440);
  return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
};

export function ViewConversaciones({ setToast, modo }: { setToast: (t: string) => void; modo: Modo }) {
  const d = useDatos();
  /** El modo del motor que el dueño tiene puesto: es un ajuste del panel, no un dato del negocio. */
  const modoNombre = MODOS.find(m => m.key === modo)?.nombre ?? '';
  /** La bandeja del back, tal cual: ninguna fila se arma en el panel. */
  const bandeja = d.conversaciones;
  const [sel, setSel] = useState('');
  const conv = bandeja.find(c => c.id === sel) ?? bandeja[0];
  /** La conexión de WhatsApp, tal como está en el servidor (para saber si hay número o no). */
  const wa = (d.integraciones?.redes ?? []).find(r => r.red === 'whatsapp');
  const ultimoMovimiento = bandeja.reduce<string | null>(
    (max, c) => (c.last_message_at && (!max || c.last_message_at > max) ? c.last_message_at : max), null);
  const sinMensajes = bandeja.filter(c => !c.ultimo).length;
  /** La secuencia de mensajes vacía: la tarjeta sólo dibuja su estado vacío, sin pasos de ejemplo. */
  const [flujoVacio] = useState(() => flujoNuevo());

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Whatsapp size={19} />}
        titulo="Conversaciones"
        sub="Su WhatsApp, tal como está en el back: cada conversación con su teléfono, su etapa, su estado y su puntaje. Acá no se muestra ninguna conversación que no exista."
        nums={d.real ? [
          { v: String(bandeja.length), l: 'conversaciones en la bandeja' },
          { v: cuandoDe(ultimoMovimiento) || 'todavía no', l: 'último mensaje', c: 'var(--purple4)' },
          { v: String(sinMensajes), l: 'sin mensaje cargado', c: sinMensajes ? 'var(--amber)' : undefined },
        ] : [
          { v: '—', l: 'conversaciones en la bandeja' },
          { v: '—', l: 'último mensaje' },
          { v: '—', l: 'sin mensaje cargado' },
        ]}
      />

      {d.cargando && bandeja.length === 0 ? (
        /* El panel está trayendo la bandeja: todavía no se sabe si hay conversaciones o no. */
        <EstadoVacio
          icono={<I_Whatsapp size={22} />}
          titulo="Leyendo sus conversaciones…"
          texto="Un segundo: el panel está trayendo del servidor lo que este negocio tiene en la bandeja." />
      ) : bandeja.length === 0 ? (
        /* ---------- SIN CONVERSACIONES: de dónde caen y qué hace falta ---------- */
        <EstadoVacio
          icono={<I_Whatsapp size={22} />}
          titulo="Todavía no hay conversaciones"
          texto={wa?.cuenta
            ? 'Cuando entre un mensaje de WhatsApp, la conversación aparece aquí, con su teléfono, su etapa, su estado y su puntaje, y el motor empieza a trabajarla. No hay ninguna inventada esperando.'
            : 'Cuando entre un mensaje de WhatsApp, la conversación aparece aquí, con su teléfono, su etapa, su estado y su puntaje. Para que entre, primero hay que conectar el número del negocio: se hace en Cuenta → Integraciones.'}
          accion={wa?.cuenta ? undefined : 'Conectar mi WhatsApp'}
          onAccion={wa?.cuenta ? undefined : () => setToast('Su WhatsApp se conecta en Cuenta → Integraciones: en cuanto quede conectado, las conversaciones empiezan a caer en esta bandeja')}
        />
      ) : (
        <div className="duo">
          {/* ============ LA BANDEJA: una fila por conversación, con lo que el back tiene ============ */}
          <Card
            title={<span className="row" style={{ gap: 8 }}><I_Chat size={14} style={{ color: 'var(--purple3)' }} /> La bandeja</span>}
            action={<Badge tone={bandeja.length ? 'green' : 'muted'}>{bandeja.length === 1 ? '1 conversación' : `${bandeja.length} conversaciones`}</Badge>}
          >
            {bandeja.map(c => (
              <div key={c.id} className="notif" onClick={() => setSel(c.id)}
                style={{ cursor: 'pointer', background: c.id === conv?.id ? 'var(--bg3)' : 'transparent', borderRadius: 10 }}
                title={`Abra la conversación de ${c.lead_phone || 'este lead'} en el panel de la derecha`}>
                <div className="pv-av" style={{ background: 'var(--bg3)', width: 34, height: 34, fontSize: 12 }}>
                  <I_Whatsapp size={14} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row spread">
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{c.lead_phone || 'sin teléfono'}</span>
                    <span className="tiny muted">{cuandoDe(c.last_message_at)}</span>
                  </div>
                  <div className="tiny muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.ultimo
                      ? c.ultimo
                      : c.last_message_at
                        ? `Sin el texto del mensaje: la conversación se movió ${cuandoDe(c.last_message_at)}`
                        : 'El back todavía no tiene el texto de ningún mensaje.'}
                  </div>
                  <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    <span className="badge badge-green" style={{ fontSize: 9 }}
                      title="Le escribió a su WhatsApp: es de donde entran las conversaciones al motor.">
                      <I_Whatsapp size={9} /> WhatsApp
                    </span>
                    <span className="badge badge-purple" style={{ fontSize: 9 }}
                      title="En qué etapa va el lead, tal como la tiene el motor.">
                      {c.stage || 'sin etapa'}
                    </span>
                    <span className="badge badge-muted" style={{ fontSize: 9 }}
                      title="El estado de la conversación en el back.">
                      {c.status || 'sin estado'}
                    </span>
                    <span className={`badge ${c.lead_score >= 70 ? 'badge-green' : c.lead_score >= 40 ? 'badge-amber' : 'badge-muted'}`} style={{ fontSize: 9 }}
                      title="Qué tan caliente está el lead: lo puntúa el motor con lo que escribió, de 0 a 100.">
                      {c.lead_score} de 100
                    </span>
                  </div>
                </div>
              </div>
            ))}
            <div className="acc-why">
              Cada fila es una conversación del back, con su teléfono, su etapa, su estado y su puntaje.
              <b> No hay ninguna fila de ejemplo</b>: lo que el back no tiene, esta bandeja no lo muestra.
            </div>
          </Card>

          {/* ============ LA CONVERSACIÓN ELEGIDA: lo que el back sabe de ella, y nada más ============ */}
          {conv && (
            <Card
              title={<span className="row" style={{ gap: 10 }}>
                <span className="pv-av" style={{ background: 'var(--bg3)', width: 30, height: 30, fontSize: 11 }}><I_Whatsapp size={14} /></span>
                {conv.lead_phone || 'sin teléfono'}
              </span>}
              action={
                <span className="row" style={{ gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <span className="badge badge-green" title="Le escribió a su WhatsApp."><I_Whatsapp size={11} /> WhatsApp</span>
                  <span className="badge badge-purple" title="En qué etapa va el lead, tal como la tiene el motor.">{conv.stage || 'sin etapa'}</span>
                  <span className="badge badge-muted" title="El estado de la conversación en el back.">{conv.status || 'sin estado'}</span>
                  <Badge tone={conv.lead_score >= 70 ? 'green' : conv.lead_score >= 40 ? 'amber' : 'muted'}>
                    puntaje {conv.lead_score} de 100
                  </Badge>
                </span>
              }
            >
              <div className="hilo">
                {conv.ultimo ? (
                  <div style={{
                    alignSelf: 'flex-start', maxWidth: '86%', background: 'var(--bg3)',
                    border: '1px solid var(--border)', borderRadius: 13, padding: '10px 13px',
                  }}>
                    <div style={{ fontSize: 13, lineHeight: 1.45 }}>{conv.ultimo}</div>
                    <div className="tiny muted" style={{ marginTop: 4, textAlign: 'right' }}>
                      último mensaje del lead{conv.last_message_at ? ` · ${cuandoDe(conv.last_message_at)}` : ''}
                    </div>
                  </div>
                ) : (
                  <div className="bs">
                    El back todavía no mandó el texto del último mensaje de esta conversación. Lo que sí
                    tiene es cuándo se movió y cómo está el lead: eso es lo de abajo.
                  </div>
                )}
              </div>

              <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
                <div className="dato"><span className="dato-l">Teléfono</span><span className="dato-v">{conv.lead_phone || '—'}</span></div>
                <div className="dato"><span className="dato-l">Etapa</span><span className="dato-v">{conv.stage || '—'}</span></div>
                <div className="dato"><span className="dato-l">Estado</span><span className="dato-v">{conv.status || '—'}</span></div>
                <div className="dato"><span className="dato-l">Puntaje del lead</span>
                  <span className="dato-v" style={{ color: conv.lead_score >= 70 ? 'var(--green)' : 'var(--amber)' }}>{conv.lead_score} de 100</span></div>
                <div className="dato"><span className="dato-l">Último movimiento</span>
                  <span className="dato-v">{cuandoDe(conv.last_message_at) || 'sin fecha en el back'}</span></div>
              </div>

              <div className="bs">
                Esto es lo que el motor sabe de esta conversación: el teléfono del lead, en qué etapa va,
                cómo está y cuándo se movió por última vez. El historial completo de mensajes todavía no
                está en el back, así que acá no se dibuja.
              </div>

              {/* ---------- LO QUE PROPONE EL AGENTE ----------
                  El back no manda ningún borrador escrito: se dice tal cual, no se inventa el texto. */}
              <div className="alarm" style={{ borderLeft: '3px solid var(--purple2)', background: 'rgba(168,85,247,.05)' }}>
                <div className="alarm-head">
                  <span className="alarm-sev oportunidad">LO QUE PROPONE EL AGENTE</span>
                  <span className="alarm-when">el motor todavía no la escribió</span>
                </div>
                <div className="alarm-sug" style={{ color: 'var(--txt)' }}>
                  Esta conversación viene del back: acá no hay un borrador escrito por Rumi y la pantalla no
                  lo inventa. Cuando el motor escriba la propuesta, aparece en este mismo lugar.
                </div>
                <div className="tiny muted" style={{ marginTop: 9 }}>
                  El motor no manda ningún mensaje que usted no haya visto{modoNombre ? <>: está en modo <b>{modoNombre}</b></> : null},
                  y esta pantalla no escribe por él.
                </div>
              </div>

              {/* ---------- CONTESTAR DESDE EL PANEL ----------
                  Todavía no hay ruta para mandar un mensaje desde acá: se dice, en vez de simularlo. */}
              <div className="bs" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
                <b>Contestar desde el panel todavía no está conectado.</b> El back todavía no tiene la ruta para
                mandar un mensaje desde acá, así que esta pantalla no muestra una caja de texto que no envía nada:
                mientras tanto, la conversación se contesta por su WhatsApp y el panel muestra lo que el back tiene.
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ============ LAS SECUENCIAS DE MENSAJES Y SU CONEXIÓN DE WHATSAPP ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <SecuenciaMensajesCard
          flujo={flujoVacio}
          sucio={false}
          onCambio={() => { /* la tarjeta muestra el estado vacío: todavía no hay pasos que editar */ }}
          onGuardar={() => setToast('Todavía no hay ninguna secuencia de mensajes que guardar: se configuran sobre una campaña ya armada y el envío todavía no está conectado')}
          onDescartar={() => { /* no hay cambios sin guardar */ }}
          onBorrar={() => setToast('Todavía no hay ninguna secuencia de mensajes en la lista')}
          avisar={setToast}
        />

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--green)' }} /> Su propia API de WhatsApp</span>}
          action={<Badge tone={wa?.cuenta ? 'green' : 'muted'}>{wa?.cuenta ? 'conectada' : 'sin conectar'}</Badge>}
        >
          <div className="bs">
            Sinkroo no le da un número: conecta el suyo. Con su token de WhatsApp Business el motor trabaja
            sobre su línea real, con sus plantillas y su historial.
          </div>
          {!d.real ? (
            /* ---------- SIN BACK: no se lee ninguna conexión, así que no se muestran cifras ---------- */
            <div className="bs" style={{ marginTop: 12 }}>
              El número, su estado y la última lectura salen del servidor de Sinkroo: en cuanto el panel lea su
              cuenta, aparecen acá. Mientras tanto no se muestra ningún número ni ningún tiempo de respuesta
              que nadie haya medido.
            </div>
          ) : !d.integraciones ? (
            <div className="bs" style={{ marginTop: 12 }}>
              No se pudo leer la conexión de su WhatsApp en el servidor. Vuelva a leer el panel y aparece con
              su número y su estado: acá no se muestra ninguna cifra que nadie haya medido.
            </div>
          ) : (
            <>
              <div className="datos-row" style={{ marginTop: 15 }}>
                <div className="dato"><span className="dato-l">Número</span>
                  <span className="dato-v">{wa?.cuenta?.external_id || wa?.cuenta?.nombre || 'sin conectar'}</span></div>
                <div className="dato"><span className="dato-l">Estado en el servidor</span>
                  <span className="dato-v">{wa?.cuenta?.estado || 'sin cuenta conectada'}</span></div>
                <div className="dato"><span className="dato-l">Última lectura</span>
                  <span className="dato-v">{wa?.ultima_sincronizacion ? cuandoDe(wa.ultima_sincronizacion.created_at) : 'todavía no'}</span></div>
              </div>
              {!wa?.cuenta && (
                <div className="bs" style={{ marginTop: 10 }}>
                  Todavía no hay un número conectado para este negocio. Se conecta desde <b>Cuenta → Integraciones</b>:
                  cuando quede conectado, las conversaciones empiezan a caer en esta bandeja.
                </div>
              )}
              {(wa?.cuenta?.permisos ?? []).length > 0 && (
                <>
                  <div className="bs" style={{ marginTop: 12, marginBottom: 9 }}>Los permisos que quedaron guardados en el servidor:</div>
                  <div className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
                    {(wa?.cuenta?.permisos ?? []).map(p => (
                      <span key={p} className="badge badge-purple" style={{ fontSize: 9.5 }}>{p}</span>
                    ))}
                  </div>
                </>
              )}
              <div className="bs" style={{ marginTop: 12 }}>
                Probar la conexión y reemplazar el token se hace desde <b>Cuenta → Integraciones</b>: ahí el
                resultado sale del servidor, no de una simulación.
                {wa?.ultima_sincronizacion
                  ? <> Última lectura registrada: {wa.ultima_sincronizacion.que} · {wa.ultima_sincronizacion.ok ? 'salió bien' : 'falló'} · {cuandoDe(wa.ultima_sincronizacion.created_at)}.</>
                  : null}
              </div>
            </>
          )}
          <div className="acc-why">
            Su token vive cifrado en el servidor y ninguna pantalla de Sinkroo lo vuelve a mostrar:
            esta tarjeta lee el estado de la conexión, nunca el token.
          </div>
        </Card>
      </div>
    </div>
  );
}
