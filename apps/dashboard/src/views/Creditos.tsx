import { useState } from 'react';
import { Card, Badge, Button, Modal, Toast } from '../components/sinkroo/ui';
import { CREDITOS, CREDITOS_RESTANTES } from '../components/sinkroo/data';
import { I_Wallet, I_Credit, I_Check, I_Download, I_Zap, I_Cal, I_Shield, I_Plus } from '../components/sinkroo/icons';

type Factura = { id: string; fecha: string; concepto: string; monto: string; estado: 'Pagada' | 'Pendiente' };

const FACTURAS: Factura[] = [
  { id: 'INV-2041', fecha: '01 Sep 2026', concepto: 'Plan Pro. Septiembre', monto: '$79', estado: 'Pagada' },
  { id: 'INV-1987', fecha: '01 Ago 2026', concepto: 'Plan Pro. Agosto', monto: '$79', estado: 'Pagada' },
  { id: 'INV-1933', fecha: '01 Jul 2026', concepto: 'Plan Pro. Julio', monto: '$79', estado: 'Pagada' },
  { id: 'INV-1822', fecha: '15 Sep 2026', concepto: 'Recarga, paquete Pro', monto: '$39', estado: 'Pendiente' },
];

const PAQUETES = [
  { nombre: 'Mini', creditos: 500, precio: '$15', color: '#a855f7', popular: false },
  { nombre: 'Estándar', creditos: 1000, precio: '$25', color: '#8b5cf6', popular: false },
  { nombre: 'Pro', creditos: 1760, precio: '$39', color: '#7c3aed', popular: true },
  { nombre: 'Máximo', creditos: 5000, precio: '$99', color: '#6d28d9', popular: false },
];

const PLANES_ENRIQUECIDOS = [
  { nombre: 'Starter', precio: '$29', cred: '500/mes', desc: 'Para empezar tu tienda online', features: ['1 tienda', 'Análisis IA básico', 'Soporte por mail'], actual: false },
  { nombre: 'Pro', precio: '$79', cred: '1.760/mes', desc: 'Crecimiento acelerado con IA', features: ['Tiendas ilimitadas', 'IA de campañas completa', 'Automatizaciones WhatsApp', 'Soporte prioritario'], actual: true },
  { nombre: 'Enterprise', precio: 'Custom', cred: 'Ilimitados', desc: 'Operaciones a escala con soporte dedicado', features: ['Todo lo del plan Pro', 'Gerente de cuenta dedicado', 'API + SSO', 'SLA 99.9%'], actual: false },
];

export default function Creditos() {
  const [saldo, setSaldo] = useState(CREDITOS_RESTANTES);
  const [movs, setMovs] = useState(CREDITOS);
  const [facturas, setFacturas] = useState(FACTURAS);
  const [planes, setPlanes] = useState(PLANES_ENRIQUECIDOS);
  const [modalRecarga, setModalRecarga] = useState(false);
  const [modalPlan, setModalPlan] = useState<string | null>(null);
  const [modalFactura, setModalFactura] = useState(false);
  const [autoRecarga, setAutoRecarga] = useState(false);
  const [metodoPago, setMetodoPago] = useState('Visa terminada en 4242');
  const [toast, setToast] = useState('');

  const totalPlan = 1760;
  const pctConsumo = Math.min(100, Math.max(0, Math.round(((totalPlan - Math.max(saldo, 0)) / totalPlan) * 100)));

  const avisar = (t: string) => { setToast(t); setTimeout(() => setToast(''), 3200); };

  const recargar = (p: typeof PAQUETES[number]) => {
    setSaldo(s => s + p.creditos);
    setMovs(prev => [{ detalle: `Recarga, paquete ${p.nombre}`, fecha: 'Hoy', cantidad: p.creditos, tipo: 'entrada' as const }, ...prev]);
    setFacturas(prev => [{ id: `INV-${2100 + Math.floor(Math.random() * 80)}`, fecha: 'Hoy', concepto: `Recarga, paquete ${p.nombre}`, monto: p.precio, estado: 'Pagada' as const }, ...prev]);
    setModalRecarga(false);
    avisar(`✅ ${p.creditos.toLocaleString('es-AR')} créditos recargados con ${metodoPago}.`);
  };

  const confirmarPlan = (nombre: string) => {
    const plan = PLANES_ENRIQUECIDOS.find(p => p.nombre === nombre)!;
    setPlanes(prev => prev.map(p => ({ ...p, actual: p.nombre === nombre })));
    setModalPlan(null);
    avisar(`✅ Cambiaste al plan ${nombre} (${plan.precio}). Se aplica al próximo ciclo.`);
  };

  const descargarFactura = (f: Factura) => avisar(`📄 Descargando factura ${f.id} (${f.monto})…`);

  const entradas = movs.filter(m => m.tipo === 'entrada').reduce((a, b) => a + b.cantidad, 0);
  const salidas = movs.filter(m => m.tipo === 'salida').reduce((a, b) => a + Math.abs(b.cantidad), 0);
  const planActual = planes.find(p => p.actual)!;

  return (
    <>
      <div className="hdr">
        <div><div className="hdr-t">Créditos</div><div className="hdr-s">Un <b style={{ color: 'var(--purple4)' }}>crédito</b> equivale a una unidad de trabajo de GAIA: cada análisis, publicación o conversación consume créditos. Acá ves tu saldo, facturación y planes.</div></div>
        <Button onClick={() => setModalRecarga(true)}><I_Plus size={16} style={{ marginRight: 6 }} /> Recargar</Button>
      </div>

      <div className="grid-2">
        {/* Saldo */}
        <Card>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="row" style={{ gap: 10 }}><span className="stat-ico" style={{ color: 'var(--purple4)' }}><I_Wallet size={20} /></span><span className="card-title">Saldo disponible</span></div>
            <Badge tone="purple">{planActual.nombre}</Badge>
          </div>
          <div className="metric" style={{ marginTop: 12 }}>{saldo.toLocaleString('es-AR')}<span className="metric-sub" style={{ fontSize: 16 }}> créditos</span></div>
          <div className="tiny muted" style={{ marginTop: 2 }}>Vencen el 30 Sep · equivalen a ~{(saldo / 100).toLocaleString('es-AR')} días de campaña</div>

          <div style={{ margin: '18px 0 8px' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="tiny muted">Consumo del plan {planActual.nombre}</span>
              <span className="tiny" style={{ fontWeight: 700, color: pctConsumo > 75 ? 'var(--red)' : 'var(--purple4)' }}>{pctConsumo}%</span>
            </div>
            <div className="herr-bar" style={{ marginTop: 6 }}><div className="herr-bar-fill" style={{ width: `${pctConsumo}%`, background: `linear-gradient(90deg, ${pctConsumo > 75 ? '#ef4444' : '#7c3aed'}, ${pctConsumo > 75 ? '#f87171' : '#a855f7'})` }} /></div>
            <div className="tiny muted" style={{ marginTop: 6, textAlign: 'right' }}>{Math.min(saldo, totalPlan).toLocaleString('es-AR')} de {totalPlan.toLocaleString('es-AR')} restantes</div>
          </div>

          <div className="divider" />

          {/* Auto-recarga */}
          <div className="row" style={{ justifyContent: 'space-between', padding: '4px 0' }}>
            <div className="row" style={{ gap: 10 }}>
              <span className="herr-ico" style={{ background: 'rgba(168,85,247,.14)', color: 'var(--purple4)' }}><I_Zap size={16} /></span>
              <div>
                <div className="small" style={{ fontWeight: 600 }}>Auto-recarga</div>
                <div className="tiny muted">Recarga automática al bajar de 500 créditos</div>
              </div>
            </div>
            <button className={`toggle ${autoRecarga ? 'on' : ''}`} onClick={() => { setAutoRecarga(!autoRecarga); avisar(autoRecarga ? 'Auto-recarga desactivada.' : '⚡ Auto-recarga activada.'); }}>
              <span className="toggle-knob" />
            </button>
          </div>

          {/* Método de pago */}
          <div className="row" style={{ justifyContent: 'space-between', padding: '10px 0 4px' }}>
            <div className="row" style={{ gap: 10 }}>
              <span className="herr-ico" style={{ background: 'rgba(99,102,241,.14)', color: '#818cf8' }}><I_Credit size={16} /></span>
              <div>
                <div className="small" style={{ fontWeight: 600 }}>Método de pago</div>
                <div className="tiny muted">{metodoPago}</div>
              </div>
            </div>
            <Button variant="ghost" className="btn-sm" onClick={() => { setMetodoPago(m => m.startsWith('Visa') ? 'Mastercard terminada en 8801' : 'Visa terminada en 4242'); avisar('💳 Método de pago actualizado.'); }}>Cambiar</Button>
          </div>

          <div className="divider" style={{ margin: '10px 0 12px' }} />
          <Button style={{ width: '100%' }} onClick={() => setModalRecarga(true)}>+ Recargar créditos</Button>
        </Card>

        {/* Movimientos */}
        <Card title={<span className="row" style={{ gap: 8 }}><I_Credit size={15} /> Movimientos recientes</span>}>
          <div className="tiny muted" style={{ marginTop: -2, marginBottom: 10 }}>
            <b style={{ color: 'var(--green)' }}>+{entradas.toLocaleString('es-AR')}</b> ingresados · <b style={{ color: 'var(--red)' }}>−{salidas.toLocaleString('es-AR')}</b> consumidos
          </div>
          {movs.map((c, i) => (
            <div key={i} className="spread small" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="row" style={{ gap: 10, minWidth: 0 }}>
                <span className={`mov-ico ${c.tipo === 'entrada' ? 'in' : 'out'}`}>{c.tipo === 'entrada' ? '↓' : '↑'}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{c.detalle}</div>
                  <div className="tiny muted">{c.fecha}</div>
                </div>
              </div>
              <span style={{ fontWeight: 800, color: c.tipo === 'entrada' ? 'var(--green)' : 'var(--red)' }}>
                {c.tipo === 'entrada' ? '+' : ''}{c.cantidad.toLocaleString('es-AR')}
              </span>
            </div>
          ))}
          <div style={{ marginTop: 12 }}>
            <Button variant="ghost" className="btn-sm" style={{ width: '100%' }} onClick={() => setModalFactura(true)}>
              <I_Download size={14} style={{ marginRight: 6 }} /> Ver facturas e historial completo
            </Button>
          </div>
        </Card>
      </div>

      {/* Planes */}
      <div className="section-head"><div className="card-title">Planes disponibles</div><div className="tiny muted">Actualizá o degradá cuando quieras, el cambio se aplica al próximo ciclo.</div></div>
      <div className="grid-3">
        {planes.map(p => {
          const elegido = p.nombre === planActual.nombre;
          return (
            <Card key={p.nombre} className={elegido ? 'plan-card-selected' : ''}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="card-title">{p.nombre}</div>
                {elegido && <Badge tone="purple">Plan actual</Badge>}
              </div>
              <div className="metric" style={{ fontSize: 26, margin: '8px 0 2px' }}>{p.precio}<span className="tiny muted" style={{ fontWeight: 400 }}>{p.nombre === 'Enterprise' ? '' : '/mes'}</span></div>
              <div className="tiny" style={{ color: 'var(--purple4)', fontWeight: 600 }}>{p.cred} créditos</div>
              <ul className="plan-feats">
                {p.features.map(f => <li key={f}><I_Check size={12} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 2 }} /> {f}</li>)}
              </ul>
              <Button variant={elegido ? 'ghost' : 'outline'} className="btn-sm" style={{ width: '100%', marginTop: 8 }} disabled={elegido} onClick={() => setModalPlan(p.nombre)}>
                {elegido ? 'Actual' : p.nombre === 'Enterprise' ? 'Hablar con ventas' : 'Elegir plan'}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Modal recarga */}
      <Modal open={modalRecarga} onClose={() => setModalRecarga(false)} title="Recargar créditos">
        <div className="tiny muted" style={{ marginTop: -4, marginBottom: 6 }}>Pagás con {metodoPago}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          {PAQUETES.map(p => (
            <div key={p.nombre} className="row" style={{ justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, border: p.popular ? '1px solid var(--purple4)' : '1px solid var(--border2)', background: 'var(--bg2)', position: 'relative' }}>
              {p.popular && <span className="badge badge-purple" style={{ position: 'absolute', top: -9, right: 12 }}>Más popular</span>}
              <div className="row" style={{ gap: 12 }}>
                <span className="herr-ico" style={{ background: `${p.color}22`, color: '#fff', fontSize: 12, fontWeight: 700, width: 44, height: 44 }}>{p.creditos.toLocaleString('es-AR')}</span>
                <div>
                  <div className="small" style={{ fontWeight: 700 }}>{p.nombre}</div>
                  <div className="tiny muted">{p.precio} · ${(p.precio === '$15' ? 0.030 : p.precio === '$25' ? 0.025 : p.precio === '$39' ? 0.022 : 0.020).toFixed(3)} por crédito</div>
                </div>
              </div>
              <Button variant="outline" className="btn-sm" onClick={() => recargar(p)}>Recargar</Button>
            </div>
          ))}
        </div>
        <Button style={{ width: '100%' }} onClick={() => avisar(`💳 Compra simulada con ${metodoPago}. En producción se procesa con tu pasarela.`)}>Confirmar compra</Button>
      </Modal>

      {/* Modal cambio de plan */}
      <Modal open={!!modalPlan} onClose={() => setModalPlan(null)} title={`Cambiar a ${modalPlan || ''}`}>
        <div className="tiny muted" style={{ marginTop: -4, marginBottom: 14, lineHeight: 1.5 }}>
          Vas a pasar al plan {modalPlan}. El cambio se aplica al próximo ciclo de facturación ({metodoPago}). Podés seguir usando tu plan actual hasta entonces.
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button variant="outline" style={{ flex: 1 }} onClick={() => setModalPlan(null)}>Cancelar</Button>
          <Button style={{ flex: 1 }} onClick={() => modalPlan && confirmarPlan(modalPlan)}>Confirmar cambio</Button>
        </div>
      </Modal>

      {/* Modal facturas */}
      <Modal open={modalFactura} onClose={() => setModalFactura(false)} title="Facturación e historial">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {facturas.map(f => (
            <div key={f.id} className="row" style={{ justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg2)' }}>
              <div className="row" style={{ gap: 10 }}>
                <span className="herr-ico" style={{ background: 'rgba(99,102,241,.14)', color: '#818cf8' }}><I_Cal size={15} /></span>
                <div>
                  <div className="small" style={{ fontWeight: 600 }}>{f.concepto}</div>
                  <div className="tiny muted">{f.fecha} · {f.id}</div>
                </div>
              </div>
              <div className="row" style={{ gap: 10 }}>
                <Badge tone={f.estado === 'Pagada' ? 'green' : 'amber'}>{f.estado}</Badge>
                <span className="small" style={{ fontWeight: 700 }}>{f.monto}</span>
                <button className="icon-btn" style={{ color: 'var(--purple4)' }} onClick={() => descargarFactura(f)} title="Descargar factura"><I_Download size={16} /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="tiny muted" style={{ marginTop: 12, textAlign: 'center' }}><I_Shield size={12} style={{ verticalAlign: '-1px', marginRight: 4 }} />Tus datos de pago están cifrados y protegidos.</div>
      </Modal>

      <Toast show={!!toast} text={toast} />
    </>
  );
}
