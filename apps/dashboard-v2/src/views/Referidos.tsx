import { useState } from 'react';
import { Card, Badge, Button } from '../components/ui';
import { ViewHead, BarRow } from '../components/viz';
import { I_Gift, I_Copy, I_Check, I_Whatsapp, I_Credit, I_Trophy, I_ArrowRight, I_Users, I_Mail } from '../components/icons';
import { TENANT } from '../data/demo';
import { usePerfil, inicialesDe } from '../lib/perfil';

const LINK = 'https://sinkroo.ai/r/skincare-natural';
const PREMIO = 250;

type Nodo = { nombre: string; estado: string; pago: boolean; nivel: 1 | 2; };
const RED: Nodo[] = [
  { nombre: 'Valeria Gómez', estado: 'pagó su primer mes · +250', pago: true, nivel: 1 },
  { nombre: 'Julián Díaz', estado: 'pagó su primer mes · +250', pago: true, nivel: 1 },
  { nombre: 'Camila Torres', estado: 'invitación enviada, todavía no entró', pago: false, nivel: 1 },
  { nombre: 'Martín Ruiz', estado: 'pagó su primer mes · +250 (invitado por Valeria)', pago: true, nivel: 2 },
  { nombre: 'Sofía Pérez', estado: 'entró, todavía no pagó', pago: false, nivel: 2 },
];

export function ViewReferidos({ setToast }: { setToast: (t: string) => void }) {
  const { perfil } = usePerfil();
  const [copiado, setCopiado] = useState(false);

  const pagados = RED.filter(r => r.pago).length;
  const pendientes = RED.filter(r => !r.pago).length;
  const ganados = pagados * PREMIO;
  const proximoHito = 5;
  const faltan = Math.max(0, proximoHito - pagados);

  const copiar = async () => {
    try { await navigator.clipboard.writeText(LINK); setCopiado(true); setToast('Link copiado'); }
    catch { setToast(LINK); }
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
          { v: String(pendientes), l: 'invitados sin pagar' },
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
            <Button variant="outline" className="btn-sm" title="Abre WhatsApp con el mensaje ya escrito y el link adentro"
              onClick={() => setToast('Abriendo WhatsApp con tu link (demo)')}><I_Whatsapp size={13} /> Mandarlo por WhatsApp</Button>
            <Button variant="ghost" className="btn-sm" title="Abre tu correo con la invitación escrita"
              onClick={() => setToast('Abriendo el correo con la invitación (demo)')}><I_Mail size={13} /> Por email</Button>
          </div>
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
            <div className="dato"><span className="dato-l">Invitados sin pagar</span><span className="dato-v" style={{ color: 'var(--amber)' }}>{pendientes}</span></div>
            <div className="dato"><span className="dato-l">Créditos ganados</span><span className="dato-v" style={{ color: 'var(--green)' }}>+{ganados.toLocaleString('es-AR')}</span></div>
            <div className="dato"><span className="dato-l">Tu saldo hoy</span><span className="dato-v">{TENANT.creditos.toLocaleString('es-AR')}</span></div>
          </div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button variant="outline" className="btn-sm" title="Les manda un recordatorio a los que se registraron y no pagaron"
              onClick={() => setToast(`Recordatorio enviado a ${pendientes} invitados (demo)`)}><I_ArrowRight size={13} /> Recordarles a los que no pagaron</Button>
          </div>
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
                <div className="tiny muted">vos · Plan {TENANT.plan}</div>
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
                    <div className="tiny muted">{r.estado}</div>
                  </div>
                  <Badge tone={r.pago ? 'green' : 'muted'}>{r.pago ? `+${PREMIO}` : 'sin pagar'}</Badge>
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
                  <div className="tiny muted">{r.estado}</div>
                </div>
                <Badge tone={r.pago ? 'green' : 'muted'}>{r.pago ? `+${PREMIO}` : 'sin pagar'}</Badge>
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
