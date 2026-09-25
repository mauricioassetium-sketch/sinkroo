import { useState } from 'react';
import { Card, Badge, Button } from '../components/ui';
import { ViewHead, BarRow } from '../components/viz';
import { I_Gift, I_Copy, I_Check, I_Whatsapp, I_Credit, I_Trophy, I_ArrowRight, I_Refresh, I_Users, I_Mail, I_Send } from '../components/icons';
import { TENANT } from '../data/demo';
import { usePerfil, inicialesDe } from '../lib/perfil';
import { useDetalle } from '../components/Detalle';
import { usePlan } from '../lib/plan';
import { useDatos } from '../api/datos';
import { EstadoVacio } from '../components/EstadoVacio';

const LINK = 'https://sinkroo.ai/r/skincare-natural';
const PREMIO = 250;

/** El código del link de referido sale del nombre del negocio: no se escribe a mano ni queda uno de ejemplo. */
const codigoDe = (nombre: string) =>
  nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** La hora del envío: se calcula cuando manda, no se escribe a mano. */
const horaAhora = () => new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
/** El recordatorio sale una vez por semana: el próximo se calcula, no se escribe. */
const enUnaSemana = () =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });

/** A quién le manda la invitación: ya está en su agenda y todavía no recibió el link. */
const INVITADA = { nombre: 'Lucía Fernández', whatsapp: '+57 300 512 8890', email: 'lucia.fernandez@correo.com' };

type Canal = 'whatsapp' | 'email';

/** El mensaje de invitación: el mismo texto que sale por WhatsApp, con su link adentro. */
const mensajeInvitacion = (de: string) =>
  `Hola ${INVITADA.nombre}: soy ${de}, de ${TENANT.cuenta}. Le paso mi link de Sinkroo: entre, pruebe el motor de marketing con IA y empiece con ${PREMIO} créditos, sin tarjeta. Los créditos quedan en su cuenta; yo gano los mismos ${PREMIO} sólo si después paga el primer mes, así que no lo apuro. Es este: ${LINK}`;

const ASUNTO_INVITACION = `Le dejo mi link de ${TENANT.cuenta} en Sinkroo: ${PREMIO} créditos para empezar`;
const cuerpoInvitacion = (de: string) =>
  `Hola ${INVITADA.nombre}: le escribo para pasarle mi link de ${TENANT.cuenta} en Sinkroo. Con ese link entra y empieza con ${PREMIO} créditos para probar el motor de marketing con IA, sin poner dinero. Yo gano los mismos ${PREMIO} créditos sólo si después paga el primer mes: no lo apuro, pruébelo y decida. El link es este: ${LINK} — ${de} · ${TENANT.cuenta}`;

/** El recordatorio: uno por semana para el que se quedó en el camino. */
const mensajeRecordatorio = (nombre: string, de: string) =>
  `Hola ${nombre.split(' ')[0]}, soy ${de}, de ${TENANT.cuenta}. Le dejé la invitación a Sinkroo y todavía no la ha aprovechado: son ${PREMIO} créditos para probar el motor de marketing con IA, sin tarjeta y sin compromiso. La puede retomar aquí: ${LINK}`;

type Nodo = { nombre: string; estado: string; pago: boolean; nivel: 1 | 2; };
// La red de la demostración: queda como respaldo del link de revisión, no se muestra con el back encendido.
const RED_DEMO: Nodo[] = [
  { nombre: 'Valeria Gómez', estado: 'pagó su primer mes · +250', pago: true, nivel: 1 },
  { nombre: 'Julián Díaz', estado: 'pagó su primer mes · +250', pago: true, nivel: 1 },
  { nombre: 'Camila Torres', estado: 'invitación enviada, todavía no entró', pago: false, nivel: 1 },
  { nombre: 'Martín Ruiz', estado: 'pagó su primer mes · +250 (invitado por Valeria)', pago: true, nivel: 2 },
  { nombre: 'Sofía Pérez', estado: 'entró, todavía no pagó', pago: false, nivel: 2 },
];

export function ViewReferidos({ setToast }: { setToast: (t: string) => void }) {
  const detalle = useDetalle();
  const { perfil } = usePerfil();
  const { plan } = usePlan();
  // De dónde salen los datos: del back cuando hay back, de la demostración cuando no. Nunca de los dos.
  const d = useDatos();
  const esReal = d.real;
  // Con el back encendido la red y los créditos ganados son los del negocio: un negocio nuevo tiene
  // 0 referidos y 0 créditos ganados, y eso es lo que se muestra, sin cifras de ejemplo.
  const RED: Nodo[] = esReal ? [] : RED_DEMO;
  const link = esReal ? `https://sinkroo.ai/r/${codigoDe(d.negocio?.name || '') || 'mi-negocio'}` : LINK;
  const saldoHoy = esReal ? (d.creditos?.saldo ?? 0) : TENANT.creditos;
  const [copiado, setCopiado] = useState(false);
  // Lo que se mandó por cada canal: queda a la vista con el texto, el destinatario y la hora,
  // y se puede volver a mandar. Un aviso que se va solo no sirve: el envío tiene que quedar.
  const [envios, setEnvios] = useState<Record<Canal, { a: string; destino: string; cuando: string; veces: number } | null>>({ whatsapp: null, email: null });
  // El recordatorio a los que no pagaron: marca a los pendientes y deja el registro de cuándo salió.
  const [recordatorio, setRecordatorio] = useState<{ cuando: string; veces: number; a: string[] } | null>(null);

  const pagados = RED.filter(r => r.pago).length;
  const pendientes = RED.filter(r => !r.pago).length;
  const pendientesNombres = RED.filter(r => !r.pago).map(r => r.nombre);
  const ganados = pagados * PREMIO;
  const proximoHito = 5;
  const faltan = Math.max(0, proximoHito - pagados);

  const copiar = async () => {
    try { await navigator.clipboard.writeText(link); setCopiado(true); setToast('Link copiado'); }
    catch { setToast(link); }
  };

  const nombreCanal = (c: Canal) => (c === 'whatsapp' ? 'WhatsApp' : 'correo');
  const destinoDe = (c: Canal) => (c === 'whatsapp' ? INVITADA.whatsapp : INVITADA.email);

  /** El envío real: guarda destinatario, hora y cuántas veces salió, y eso queda escrito en la tarjeta. */
  const enviar = (canal: Canal) => {
    setEnvios(p => ({
      ...p,
      [canal]: { a: INVITADA.nombre, destino: destinoDe(canal), cuando: horaAhora(), veces: (p[canal]?.veces ?? 0) + 1 },
    }));
    setToast(`Invitación enviada por ${nombreCanal(canal)} a ${INVITADA.nombre}`);
  };

  /** Antes de mandar: el mensaje exacto, a quién le llega y por dónde. Nada sale sin confirmar. */
  const abrirInvitacion = (canal: Canal) => {
    const ya = envios[canal];
    detalle({
      titulo: `${ya ? 'Volver a mandar' : 'Mandar'} la invitación por ${nombreCanal(canal)}`,
      sub: 'Este es el mensaje que sale, con su link de referido adentro. Nada se manda hasta que lo confirme, y el envío queda a la vista en Su link.',
      bloques: [
        { tipo: 'datos', filas: [
          { k: 'Destinatario', v: INVITADA.nombre, s: `${destinoDe(canal)} · contacto de su agenda, todavía no recibió el link` },
          { k: 'Por dónde sale', v: canal === 'whatsapp' ? 'Su WhatsApp conectado' : 'Su correo conectado', s: canal === 'whatsapp' ? 'desde el número de su negocio' : `desde ${TENANT.cuenta}` },
          { k: 'Lo que recibe', v: `+${PREMIO} créditos`, s: 'para probar el motor sin poner dinero' },
          { k: 'Lo que gana usted', v: `+${PREMIO} créditos`, s: 'cuando paga su primer mes, no cuando entra' },
        ] },
        canal === 'whatsapp'
          ? { tipo: 'texto', texto: `El mensaje, tal cual sale: «${mensajeInvitacion(perfil.nombre)}»` }
          : { tipo: 'texto', texto: `Asunto: ${ASUNTO_INVITACION}` },
        canal === 'email'
          ? { tipo: 'texto', texto: `El cuerpo del correo: «${cuerpoInvitacion(perfil.nombre)}»` }
          : { tipo: 'texto', texto: 'El link que va adentro es el suyo, el mismo que copia arriba: cada uno que entra queda a su nombre y lo ve abajo, en Su red.' },
        { tipo: 'aviso', texto: `Si no confirma, no sale nada y ${INVITADA.nombre} no recibe el mensaje. Cuando lo envíe, el envío queda escrito en la tarjeta con la hora y puede volver a enviarlo cuando quiera.` },
      ],
      fuente: `Su link de referido: ${LINK} · ${PREMIO} créditos por cada uno que paga su primer mes.`,
      acciones: [
        { label: ya ? 'Mandar otra vez' : 'Mandar la invitación', variante: 'primary', onClick: () => enviar(canal) },
        { label: 'Dejarlo para después', onClick: () => setToast('No se mandó nada: la invitación queda aquí') },
      ],
    });
  };

  /** El recordatorio sí cambia el estado: los pendientes quedan marcados y el contador lo dice. */
  const mandarRecordatorio = () => {
    setRecordatorio(p => ({ cuando: horaAhora(), veces: (p?.veces ?? 0) + 1, a: pendientesNombres }));
    setToast(`Recordatorio enviado hoy a ${pendientes} invitados: ${pendientesNombres.join(' y ')}`);
  };

  const abrirRecordatorio = () => {
    detalle({
      titulo: `Recordarles a los ${pendientes} que no pagaron`,
      sub: 'El motor les recuerda una vez por semana. Aquí ve el mensaje, a quién le llega y desde dónde, antes de que salga.',
      bloques: [
        { tipo: 'texto', texto: `El mensaje que les llega, con el nombre de cada uno: «${mensajeRecordatorio(pendientesNombres[0], perfil.nombre)}»` },
        { tipo: 'filas', items: RED.filter(r => !r.pago).map(r => ({ t: r.nombre, s: r.estado, etiqueta: 'le llega hoy', tono: 'amber' })) },
        { tipo: 'datos', filas: [
          { k: 'Cuántos lo reciben', v: String(pendientes), s: `de ${RED.length} personas en su red` },
          { k: 'Cada cuánto', v: 'una vez por semana', s: `el próximo sale el ${enUnaSemana()}` },
          { k: 'Cuándo se frena solo', v: 'cuando la persona paga', s: 'o cuando le pide que no le escriban más' },
          { k: 'Lo que cuesta', v: '0 créditos', s: 'los recordatorios no gastan su saldo' },
          { k: 'Por dónde sale', v: 'Su WhatsApp conectado', s: `desde el número de ${TENANT.cuenta}` },
        ] },
        { tipo: 'aviso', tono: 'amber', texto: `Van sólo a los ${pendientes} que no pagaron: los ${pagados} que ya pagan no reciben nada. Después de mandarlo, cada pendiente queda marcado como «recordado hoy» abajo, en Su red.` },
      ],
      fuente: `Sale de su red de hoy: ${RED.length} personas, ${pagados} pagando y ${pendientes} sin pagar.`,
      acciones: [
        { label: recordatorio ? 'Mandar otra vez' : `Mandar los ${pendientes} recordatorios`, variante: 'primary', onClick: mandarRecordatorio },
        { label: 'Dejarlo para después', onClick: () => setToast('No se mandó ningún recordatorio') },
      ],
    });
  };

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Gift size={19} />}
        titulo="Referidos"
        sub="Cada persona que usted trae y paga su primer mes le devuelve créditos. No es un descuento: son créditos que el motor usa para trabajar."
        nums={[
          { v: `+${ganados.toLocaleString('es-CO')}`, l: 'créditos ganados', c: 'var(--green)' },
          { v: String(pagados), l: 'referidos que pagaron', c: 'var(--purple3)' },
          { v: String(pendientes), l: recordatorio ? `invitados sin pagar · recordados hoy ${recordatorio.cuando}` : 'invitados sin pagar', c: recordatorio ? 'var(--amber)' : undefined },
          { v: `+${PREMIO}`, l: 'por cada uno que paga' },
        ]}
      />

      {/* ============ EL LINK Y EL PROGRESO ============ */}
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Gift size={14} style={{ color: 'var(--purple3)' }} /> Su link</span>}
          action={<Badge tone="green">+{PREMIO} créditos por referido</Badge>}
        >
          <div className="bs">
            Pase este link a quien le pueda servir. <b>Gana créditos cuando la otra persona paga</b>,
            no cuando se registra: así nadie llena la red de cuentas vacías.
          </div>
          <div className="row link-row" style={{ gap: 8 }}>
            <input className="input" value={link} readOnly style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }} />
            <Button className="btn-sm" title="Copie el link al portapapeles" onClick={copiar}>
              <I_Copy size={14} /> {copiado ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          {/* Mandar la invitación a un contacto concreto sólo tiene sentido con la agenda de la
              demostración: con el back encendido no se inventa un destinatario. */}
          {!esReal && (
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button variant="outline" className="btn-sm"
              title="Le muestra el mensaje exacto que sale por su WhatsApp, con su link adentro, antes de enviarlo. Reversible: si no lo confirma, no se envía nada."
              onClick={() => abrirInvitacion('whatsapp')}><I_Whatsapp size={13} /> Mandarlo por WhatsApp</Button>
            <Button variant="ghost" className="btn-sm"
              title="Le muestra el correo con la invitación escrita, con su link adentro, antes de enviarlo. Reversible: si no lo confirma, no se envía nada."
              onClick={() => abrirInvitacion('email')}><I_Mail size={13} /> Por correo</Button>
          </div>
          )}

          {/* El envío no se va solo: queda el mensaje, el destinatario, la hora y el botón para repetirlo. */}
          {(Object.keys(envios) as Canal[]).map(c => {
            const e = envios[c];
            if (!e) return null;
            return (
              <div key={c} style={{ marginTop: 11, paddingTop: 11, borderTop: '1px solid var(--border)' }}>
                <div className="row spread" style={{ gap: 9, flexWrap: 'wrap' }}>
                  <span className="tiny" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--green)', fontWeight: 800 }}>
                    <I_Check size={13} /> Invitación enviada por {nombreCanal(c)} a {e.a} · {e.destino} · hoy {e.cuando}
                    {e.veces > 1 ? ` · ${e.veces}º envío` : ''}
                  </span>
                  <Button variant="ghost" className="btn-sm"
                    title={`Vuelve a abrir el mensaje con ${e.a} para enviarlo otra vez. Reversible: se envía sólo si lo confirma.`}
                    onClick={() => abrirInvitacion(c)}><I_Send size={12} /> Volver a enviarlo</Button>
                </div>
                <div className="acc-why">
                  <b>{c === 'whatsapp' ? 'El mensaje que se envió: ' : 'El correo que se envió: '}</b>
                  {c === 'whatsapp'
                    ? `«${mensajeInvitacion(perfil.nombre)}»`
                    : `«${ASUNTO_INVITACION}» — ${cuerpoInvitacion(perfil.nombre)}`}
                </div>
              </div>
            );
          })}

          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">El que entra recibe</span><span className="dato-v" style={{ color: 'var(--green)' }}>+250 créditos</span></div>
            <div className="dato"><span className="dato-l">Usted recibe</span><span className="dato-v" style={{ color: 'var(--green)' }}>+250 créditos</span></div>
          </div>
          <div className="acc-why">
            Ganan los dos: <b>el que llega empieza con créditos para probar</b> y usted sigue cargando el motor
            sin poner dinero. Los créditos de referidos no vencen mientras su plan esté activo.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Trophy size={14} style={{ color: 'var(--amber)' }} /> Cómo va su red</span>}
          action={<Badge tone="amber">{pagados} pagando</Badge>}
        >
          <div className="row" style={{ gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: -1.4, lineHeight: 1 }}>{pagados}</div>
              <div className="tiny muted">referidos que pagan</div>
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <div className="bs">
                {faltan > 0
                  ? <>Le faltan <b style={{ color: 'var(--purple3)' }}>{faltan}</b> para llegar a {proximoHito} y desbloquear el premio de 1.000 créditos.</>
                  : <>Ya llegó a {proximoHito}: <b style={{ color: 'var(--green)' }}>desbloqueó 1.000 créditos extra</b>.</>}
              </div>
              <div style={{ marginTop: 9 }}>
                <BarRow label="" valor={pagados} max={proximoHito} formato={`${pagados} de ${proximoHito}`} color="var(--purple2)" />
              </div>
            </div>
          </div>
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato">
              <span className="dato-l">Invitados sin pagar</span>
              <span className="dato-v" style={{ color: 'var(--amber)' }}>{pendientes}</span>
              {recordatorio && <span className="tiny" style={{ color: 'var(--amber)', fontWeight: 700 }}>recordados hoy {recordatorio.cuando}</span>}
            </div>
            <div className="dato"><span className="dato-l">Créditos ganados</span><span className="dato-v" style={{ color: 'var(--green)' }}>+{ganados.toLocaleString('es-CO')}</span></div>
            <div className="dato"><span className="dato-l">Su saldo hoy</span><span className="dato-v">{saldoHoy.toLocaleString('es-CO')}</span></div>
          </div>
          {/* El recordatorio sólo tiene sentido si hay a quién recordarle: sin invitados sin pagar,
              el botón no se muestra. */}
          {pendientes > 0 && (
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button variant="outline" className="btn-sm"
              title="Le muestra el recordatorio que les llega a los que no pagaron, con el mensaje y a quiénes, antes de enviarlo. Reversible: queda el registro de cuándo salió y se puede volver a enviar."
              onClick={abrirRecordatorio}>
              {recordatorio ? <I_Refresh size={13} /> : <I_ArrowRight size={13} />}
              {recordatorio ? 'Volver a recordarles' : 'Recordarles a los que no pagaron'}
            </Button>
          </div>
          )}

          {/* El registro del recordatorio: quiénes, cuándo, cuántas veces y cuándo sale el próximo. */}
          {recordatorio && (
            <div style={{ marginTop: 11, paddingTop: 11, borderTop: '1px solid var(--border)' }}>
              <div className="tiny" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--green)', fontWeight: 800 }}>
                <I_Check size={13} /> Recordatorio enviado hoy {recordatorio.cuando} a {recordatorio.a.join(' y ')}
                {' '}· {recordatorio.a.length} de {pendientes} pendientes{recordatorio.veces > 1 ? ` · ${recordatorio.veces}º envío` : ''}
              </div>
              <div className="acc-why">
                <b>El próximo sale el {enUnaSemana()}.</b> Los que no pagaron quedan marcados abajo, en Su red,
                como «recordado hoy»: el contador de invitados sin pagar no baja hasta que paguen.
              </div>
            </div>
          )}

          <div className="acc-why">
            Un referido que no paga también sirve: <b>le dejó su contacto</b>. El motor se lo recuerda
            una vez por semana, para cuando le sirva.
          </div>
        </Card>
      </div>

      {/* ============ LA RED Y LAS REGLAS ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--purple3)' }} /> Su red</span>}
          action={<Badge tone="purple">{RED.length} personas</Badge>}
        >
          {esReal && RED.length === 0 ? (
            <EstadoVacio
              titulo="Su red está en cero"
              texto="Todavía no trajo a nadie: 0 referidos que hayan pagado y 0 créditos ganados. Los créditos entran cuando la otra persona paga su primer mes, no cuando se registra, y el que llega empieza con 250 créditos. Pase su link y el primero que pague le devuelve 250."
              accion="Copiar mi link"
              onAccion={copiar}
            />
          ) : (
          <div className="reftree">
            <div className="ref-node root">
              <div className="av" style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${perfil.color}, ${perfil.color}bb)` }}>{inicialesDe(perfil.nombre)}</div>
              <div style={{ flex: 1 }}>
                <div className="bt">{perfil.nombre}</div>
                <div className="tiny muted">usted · Plan {plan.nombre}</div>
              </div>
              <Badge tone="purple">+{ganados.toLocaleString('es-CO')}</Badge>
            </div>

            {RED.filter(r => r.nivel === 1).map(r => (
              <div key={r.nombre}>
                <div className="ref-node" style={{ marginLeft: 34 }}>
                  <div className="av" style={{ width: 30, height: 30, background: r.pago ? 'linear-gradient(135deg,#22c55e,#15803d)' : 'linear-gradient(135deg,#64748b,#334155)', fontSize: 11 }}>
                    {r.nombre.split(' ').map(w => w[0]).slice(0, 2).join('')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="bt" style={{ fontWeight: 600 }}>{r.nombre}</div>
                    <div className="tiny muted">
                      {r.estado}{recordatorio && !r.pago ? ` · recordatorio enviado hoy ${recordatorio.cuando}` : ''}
                    </div>
                  </div>
                  {r.pago
                    ? <Badge tone="green">+{PREMIO}</Badge>
                    : <span className="row" style={{ gap: 6 }}>
                        <Badge tone="muted">sin pagar</Badge>
                        {recordatorio && <Badge tone="amber">recordado hoy</Badge>}
                      </span>}
                </div>
              </div>
            ))}

            {RED.filter(r => r.nivel === 2).map(r => (
              <div key={r.nombre} className="ref-node" style={{ marginLeft: 68 }}>
                <div className="av" style={{ width: 26, height: 26, background: r.pago ? 'linear-gradient(135deg,#6366f1,#3730a3)' : 'linear-gradient(135deg,#64748b,#334155)', fontSize: 10 }}>
                  {r.nombre.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="bt" style={{ fontWeight: 500 }}>{r.nombre}</div>
                  <div className="tiny muted">
                    {r.estado}{recordatorio && !r.pago ? ` · recordatorio enviado hoy ${recordatorio.cuando}` : ''}
                  </div>
                </div>
                {r.pago
                  ? <Badge tone="green">+{PREMIO}</Badge>
                  : <span className="row" style={{ gap: 6 }}>
                      <Badge tone="muted">sin pagar</Badge>
                      {recordatorio && <Badge tone="amber">recordado hoy</Badge>}
                    </span>}
              </div>
            ))}
          </div>
          )}
          <div className="acc-why">
            {esReal && RED.length === 0
              ? <>Su primer referido aparece aquí con su estado: <b>si ya pagó, si todavía no</b> y los créditos que dejó.</>
              : <>Los de segundo nivel <b>son los que trajeron sus invitados</b>. También suman: así funciona una red, no una lista.</>}
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Credit size={14} style={{ color: 'var(--green)' }} /> Las reglas, sin letra menuda</span>}
          action={<Badge tone="green">claras</Badge>}
        >
          <div className="guards">
            <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="guard-lb">Se paga cuando el otro paga<small>No cuando se registra. Así nadie infla la red con cuentas vacías.</small></span>
              <span className="guard-val">{PREMIO}</span></div>
            <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="guard-lb">Sin límite de referidos<small>Cuantos más trae, más créditos. No hay techo mensual.</small></span>
              <span className="guard-val">∞</span></div>
            <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="guard-lb">Los créditos no vencen<small>Mientras su plan esté activo, quedan en su saldo y puede juntarlos.</small></span>
              <span className="guard-val">12 meses</span></div>
            <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="guard-lb">El que entra también gana<small>Empieza con 250 créditos: puede probar el motor sin pagar nada.</small></span>
              <span className="guard-val">{PREMIO}</span></div>
            <div className="guard"><span style={{ color: 'var(--amber)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="guard-lb">Hito de {proximoHito} referidos<small>Al llegar, se suman 1.000 créditos extra de una sola vez.</small></span>
              <span className="guard-val" style={{ color: 'var(--amber)' }}>1.000</span></div>
          </div>
          <div className="acc-why">
            Todas las reglas son las mismas para todos y <b>no hay condiciones ocultas</b>:
            si algo cambia, le avisamos antes de que cambie y lo que ya ganó se respeta con las reglas anteriores.
          </div>
        </Card>
      </div>
    </div>
  );
}
