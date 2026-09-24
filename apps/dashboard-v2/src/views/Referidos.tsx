import { useState } from 'react';
import { Card, Badge, Button } from '../components/ui';
import { ViewHead, BarRow } from '../components/viz';
import { I_Gift, I_Copy, I_Check, I_Whatsapp, I_Credit, I_Trophy, I_ArrowRight, I_Refresh, I_Users, I_Mail, I_Send } from '../components/icons';
import { TENANT } from '../data/demo';
import { usePerfil, inicialesDe } from '../lib/perfil';
import { useDetalle } from '../components/Detalle';
import { usePlan } from '../lib/plan';

const LINK = 'https://sinkroo.ai/r/skincare-natural';
const PREMIO = 250;

/** La hora del envío: se calcula cuando mandás, no se escribe a mano. */
const horaAhora = () => new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
/** El recordatorio sale una vez por semana: el próximo se calcula, no se escribe. */
const enUnaSemana = () =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });

/** A quién le mandás la invitación: ya está en tu agenda y todavía no recibió el link. */
const INVITADA = { nombre: 'Lucía Fernández', whatsapp: '+54 9 11 5512-8890', email: 'lucia.fernandez@correo.com' };

type Canal = 'whatsapp' | 'email';

/** El mensaje de invitación: el mismo texto que sale por WhatsApp, con tu link adentro. */
const mensajeInvitacion = (de: string) =>
  `¡Hola ${INVITADA.nombre}! Soy ${de}, de ${TENANT.cuenta}. Te paso mi link de Sinkroo: entrás, probás el motor de marketing con IA y arrancás con ${PREMIO} créditos, sin tarjeta. Los créditos ya quedan en tu cuenta; yo gano los mismos ${PREMIO} recién si después pagás el primer mes, así que no te apuro. Es este: ${LINK}`;

const ASUNTO_INVITACION = `Te dejo mi link de ${TENANT.cuenta} en Sinkroo: arrancás con ${PREMIO} créditos`;
const cuerpoInvitacion = (de: string) =>
  `Hola ${INVITADA.nombre}: te escribo para pasarte mi link de ${TENANT.cuenta} en Sinkroo. Con ese link entrás y arrancás con ${PREMIO} créditos para probar el motor de marketing con IA, sin poner plata. Yo gano los mismos ${PREMIO} créditos sólo si después pagás el primer mes: no te apuro, probalo y ves. El link es este: ${LINK} — ${de} · ${TENANT.cuenta}`;

/** El recordatorio: uno por semana para el que se quedó en el camino. */
const mensajeRecordatorio = (nombre: string, de: string) =>
  `Hola ${nombre.split(' ')[0]}, soy ${de}, de ${TENANT.cuenta}. Te dejé la invitación a Sinkroo y todavía no la aprovechaste: son ${PREMIO} créditos para probar el motor de marketing con IA, sin tarjeta y sin compromiso. La retomás acá: ${LINK}`;

type Nodo = { nombre: string; estado: string; pago: boolean; nivel: 1 | 2; };
const RED: Nodo[] = [
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
    try { await navigator.clipboard.writeText(LINK); setCopiado(true); setToast('Link copiado'); }
    catch { setToast(LINK); }
  };

  const nombreCanal = (c: Canal) => (c === 'whatsapp' ? 'WhatsApp' : 'email');
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
      sub: 'Este es el mensaje que sale, con tu link de referido adentro. Nada se manda hasta que lo confirmes, y el envío queda a la vista en Tu link.',
      bloques: [
        { tipo: 'datos', filas: [
          { k: 'Destinatario', v: INVITADA.nombre, s: `${destinoDe(canal)} · contacto de tu agenda, todavía no recibió el link` },
          { k: 'Por dónde sale', v: canal === 'whatsapp' ? 'Tu WhatsApp conectado' : 'Tu correo conectado', s: canal === 'whatsapp' ? 'desde el número de tu negocio' : `desde ${TENANT.cuenta}` },
          { k: 'Lo que recibe', v: `+${PREMIO} créditos`, s: 'para probar el motor sin poner plata' },
          { k: 'Lo que ganás vos', v: `+${PREMIO} créditos`, s: 'cuando paga su primer mes, no cuando entra' },
        ] },
        canal === 'whatsapp'
          ? { tipo: 'texto', texto: `El mensaje, tal cual sale: «${mensajeInvitacion(perfil.nombre)}»` }
          : { tipo: 'texto', texto: `Asunto: ${ASUNTO_INVITACION}` },
        canal === 'email'
          ? { tipo: 'texto', texto: `El cuerpo del email: «${cuerpoInvitacion(perfil.nombre)}»` }
          : { tipo: 'texto', texto: 'El link que va adentro es el tuyo, el mismo que copiás arriba: cada uno que entra queda a tu nombre y lo ves abajo, en Tu red.' },
        { tipo: 'aviso', texto: `Si no confirmás, no sale nada y ${INVITADA.nombre} no recibe el mensaje. Cuando lo mandes, el envío queda escrito en la tarjeta con la hora y podés volver a mandarlo cuando quieras.` },
      ],
      fuente: `Tu link de referido: ${LINK} · ${PREMIO} créditos por cada uno que paga su primer mes.`,
      acciones: [
        { label: ya ? 'Mandar otra vez' : 'Mandar la invitación', variante: 'primary', onClick: () => enviar(canal) },
        { label: 'Dejarlo para después', onClick: () => setToast('No se mandó nada: la invitación queda acá') },
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
      sub: 'El motor les recuerda una vez por semana. Acá ves el mensaje, a quién le llega y desde dónde, antes de que salga.',
      bloques: [
        { tipo: 'texto', texto: `El mensaje que les llega, con el nombre de cada uno: «${mensajeRecordatorio(pendientesNombres[0], perfil.nombre)}»` },
        { tipo: 'filas', items: RED.filter(r => !r.pago).map(r => ({ t: r.nombre, s: r.estado, etiqueta: 'le llega hoy', tono: 'amber' })) },
        { tipo: 'datos', filas: [
          { k: 'Cuántos lo reciben', v: String(pendientes), s: `de ${RED.length} personas en tu red` },
          { k: 'Cada cuánto', v: 'una vez por semana', s: `el próximo sale el ${enUnaSemana()}` },
          { k: 'Cuándo se frena solo', v: 'cuando la persona paga', s: 'o cuando te pide que no le escribas más' },
          { k: 'Lo que cuesta', v: '0 créditos', s: 'los recordatorios no gastan tu saldo' },
          { k: 'Por dónde sale', v: 'Tu WhatsApp conectado', s: `desde el número de ${TENANT.cuenta}` },
        ] },
        { tipo: 'aviso', tono: 'amber', texto: `Van sólo a los ${pendientes} que no pagaron: los ${pagados} que ya pagan no reciben nada. Después de mandarlo, cada pendiente queda marcado como «recordado hoy» abajo, en Tu red.` },
      ],
      fuente: `Sale de tu red de hoy: ${RED.length} personas, ${pagados} pagando y ${pendientes} sin pagar.`,
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
        sub="Cada persona que traés y paga su primer mes te devuelve créditos. No es un descuento: son créditos que el motor usa para trabajar."
        nums={[
          { v: `+${ganados.toLocaleString('es-AR')}`, l: 'créditos ganados', c: 'var(--green)' },
          { v: String(pagados), l: 'referidos que pagaron', c: 'var(--purple3)' },
          { v: String(pendientes), l: recordatorio ? `invitados sin pagar · recordados hoy ${recordatorio.cuando}` : 'invitados sin pagar', c: recordatorio ? 'var(--amber)' : undefined },
          { v: `+${PREMIO}`, l: 'por cada uno que paga' },
        ]}
      />

      {/* ============ EL LINK Y EL PROGRESO ============ */}
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Gift size={14} style={{ color: 'var(--purple3)' }} /> Tu link</span>}
          action={<Badge tone="green">+{PREMIO} créditos por referido</Badge>}
        >
          <div className="bs">
            Pasale este link a quien le pueda servir. <b>Gana créditos cuando la otra persona paga</b>,
            no cuando se registra: así nadie llena la red de cuentas vacías.
          </div>
          <div className="row link-row" style={{ gap: 8 }}>
            <input className="input" value={LINK} readOnly style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }} />
            <Button className="btn-sm" title="Copia el link al portapapeles" onClick={copiar}>
              <I_Copy size={14} /> {copiado ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button variant="outline" className="btn-sm"
              title="Te muestra el mensaje exacto que sale por tu WhatsApp, con tu link adentro, antes de mandarlo. Reversible: si no lo confirmás, no se manda nada."
              onClick={() => abrirInvitacion('whatsapp')}><I_Whatsapp size={13} /> Mandarlo por WhatsApp</Button>
            <Button variant="ghost" className="btn-sm"
              title="Te muestra el email con la invitación escrita, con tu link adentro, antes de mandarlo. Reversible: si no lo confirmás, no se manda nada."
              onClick={() => abrirInvitacion('email')}><I_Mail size={13} /> Por email</Button>
          </div>

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
                    title={`Vuelve a abrir el mensaje con ${e.a} para mandarlo otra vez. Reversible: se manda sólo si lo confirmás.`}
                    onClick={() => abrirInvitacion(c)}><I_Send size={12} /> Volver a mandarlo</Button>
                </div>
                <div className="acc-why">
                  <b>{c === 'whatsapp' ? 'El mensaje que se mandó: ' : 'El email que se mandó: '}</b>
                  {c === 'whatsapp'
                    ? `«${mensajeInvitacion(perfil.nombre)}»`
                    : `«${ASUNTO_INVITACION}» — ${cuerpoInvitacion(perfil.nombre)}`}
                </div>
              </div>
            );
          })}

          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">El que entra recibe</span><span className="dato-v" style={{ color: 'var(--green)' }}>+250 créditos</span></div>
            <div className="dato"><span className="dato-l">Vos recibís</span><span className="dato-v" style={{ color: 'var(--green)' }}>+250 créditos</span></div>
          </div>
          <div className="acc-why">
            Ganan los dos: <b>el que llega arranca con créditos para probar</b> y vos seguís cargando el motor
            sin poner plata. Los créditos de referidos no vencen mientras tu plan esté activo.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Trophy size={14} style={{ color: 'var(--amber)' }} /> Cómo va tu red</span>}
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
                  ? <>Te faltan <b style={{ color: 'var(--purple3)' }}>{faltan}</b> para llegar a {proximoHito} y desbloquear el premio de 1.000 créditos.</>
                  : <>Ya llegaste a {proximoHito}: <b style={{ color: 'var(--green)' }}>desbloqueaste 1.000 créditos extra</b>.</>}
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
            <div className="dato"><span className="dato-l">Créditos ganados</span><span className="dato-v" style={{ color: 'var(--green)' }}>+{ganados.toLocaleString('es-AR')}</span></div>
            <div className="dato"><span className="dato-l">Tu saldo hoy</span><span className="dato-v">{TENANT.creditos.toLocaleString('es-AR')}</span></div>
          </div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button variant="outline" className="btn-sm"
              title="Te muestra el recordatorio que les llega a los que no pagaron, con el mensaje y a quiénes, antes de mandarlo. Reversible: queda el registro de cuándo salió y se puede volver a mandar."
              onClick={abrirRecordatorio}>
              {recordatorio ? <I_Refresh size={13} /> : <I_ArrowRight size={13} />}
              {recordatorio ? 'Volver a recordarles' : 'Recordarles a los que no pagaron'}
            </Button>
          </div>

          {/* El registro del recordatorio: quiénes, cuándo, cuántas veces y cuándo sale el próximo. */}
          {recordatorio && (
            <div style={{ marginTop: 11, paddingTop: 11, borderTop: '1px solid var(--border)' }}>
              <div className="tiny" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--green)', fontWeight: 800 }}>
                <I_Check size={13} /> Recordatorio enviado hoy {recordatorio.cuando} a {recordatorio.a.join(' y ')}
                {' '}· {recordatorio.a.length} de {pendientes} pendientes{recordatorio.veces > 1 ? ` · ${recordatorio.veces}º envío` : ''}
              </div>
              <div className="acc-why">
                <b>El próximo sale el {enUnaSemana()}.</b> Los que no pagaron quedan marcados abajo, en Tu red,
                como «recordado hoy»: el contador de invitados sin pagar no baja hasta que paguen.
              </div>
            </div>
          )}

          <div className="acc-why">
            Un referido que no paga igual sirve: <b>te dejó su contacto</b>. El motor se lo recuerda
            una vez por semana y para cuando le sirva.
          </div>
        </Card>
      </div>

      {/* ============ LA RED Y LAS REGLAS ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--purple3)' }} /> Tu red</span>}
          action={<Badge tone="purple">{RED.length} personas</Badge>}
        >
          <div className="reftree">
            <div className="ref-node root">
              <div className="av" style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${perfil.color}, ${perfil.color}bb)` }}>{inicialesDe(perfil.nombre)}</div>
              <div style={{ flex: 1 }}>
                <div className="bt">{perfil.nombre}</div>
                <div className="tiny muted">vos · Plan {plan.nombre}</div>
              </div>
              <Badge tone="purple">+{ganados.toLocaleString('es-AR')}</Badge>
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
          <div className="acc-why">
            Los de segundo nivel <b>son los que trajeron tus invitados</b>. También suman:
            así funciona una red, no una lista.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Credit size={14} style={{ color: 'var(--green)' }} /> Las reglas, sin letra chica</span>}
          action={<Badge tone="green">claras</Badge>}
        >
          <div className="guards">
            <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="guard-lb">Se paga cuando el otro paga<small>No cuando se registra. Así nadie infla la red con cuentas vacías.</small></span>
              <span className="guard-val">{PREMIO}</span></div>
            <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="guard-lb">Sin límite de referidos<small>Cuantos más traés, más créditos. No hay techo mensual.</small></span>
              <span className="guard-val">∞</span></div>
            <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="guard-lb">Los créditos no vencen<small>Mientras tu plan esté activo, quedan en tu saldo y podés juntarlos.</small></span>
              <span className="guard-val">12 meses</span></div>
            <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="guard-lb">El que entra también gana<small>Arranca con 250 créditos: puede probar el motor sin pagar nada.</small></span>
              <span className="guard-val">{PREMIO}</span></div>
            <div className="guard"><span style={{ color: 'var(--amber)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="guard-lb">Hito de {proximoHito} referidos<small>Al llegar, se suman 1.000 créditos extra de una sola vez.</small></span>
              <span className="guard-val" style={{ color: 'var(--amber)' }}>1.000</span></div>
          </div>
          <div className="acc-why">
            Todas las reglas son las mismas para todos y <b>no hay condiciones ocultas</b>:
            si algo cambia, te avisamos antes de que cambie y lo cobrás con las reglas viejas.
          </div>
        </Card>
      </div>
    </div>
  );
}
