import { useState } from 'react';
import { Card, Badge, Button, Toast, Modal } from '../components/sinkroo/ui';
import { I_Sparkle, I_Trend } from '../components/sinkroo/icons';
import type { ViewKey } from '../components/sinkroo/data';

type Estado = 'Conectado' | 'Por conectar' | 'Conectando';

const HERRAMIENTAS = [
  { key: 'whatsapp', nombre: 'WhatsApp Business', cat: 'Mensajería', rol: 'Cierre de ventas y fidelización', estado: 'Conectado' as Estado, icono: '💬', color: '#25d366', u12: 214, metric: '214 conversiones', uso: 92, nota: 'El canal que más convierte: 6 de cada 10 ventas se cierran acá.', destino: 'whatsapp' as ViewKey | null },
  { key: 'metaads', nombre: 'Meta Ads', cat: 'Publicidad', rol: 'Captación y retargeting', estado: 'Conectado' as Estado, icono: '📣', color: '#a855f7', u12: 48.5, metric: '48.5K alcance', uso: 78, nota: 'Principal fuente de tráfico nuevo. ROAS global 3.8x.', destino: 'campanas' as ViewKey | null },
  { key: 'instagram', nombre: 'Instagram', cat: 'Social', rol: 'Contenido orgánico y prueba social', estado: 'Conectado' as Estado, icono: '📸', color: '#e11d48', u12: 12.2, metric: '12.2K seguidores', uso: 64, nota: 'Donde se construye la confianza de marca con before/after.', destino: 'creatividades' as ViewKey | null },
  { key: 'klaviyo', nombre: 'Email (Klaviyo)', cat: 'Email', rol: 'Carrito abandonado y post-venta', estado: 'Por conectar' as Estado, icono: '✉️', color: '#f59e0b', u12: 0, metric: '— sin datos', uso: 0, nota: 'Si lo conectás, recuperás hasta un 15% de carritos abandonados.', destino: null },
  { key: 'tiktok', nombre: 'TikTok', cat: 'Social', rol: 'Alcance orgánico a audiencias nuevas', estado: 'Por conectar' as Estado, icono: '🎵', color: '#6366f1', u12: 0, metric: '— sin datos', uso: 0, nota: 'Formato corto ideal para el nicho skincare: alto CPC bajo en orgánico.', destino: null },
  { key: 'pixel', nombre: 'Pixel + eventos', cat: 'Tracking', rol: 'Medición y optimización de las campañas', estado: 'Por conectar' as Estado, icono: '📊', color: '#22c55e', u12: 0, metric: '— sin datos', uso: 0, nota: 'Sin pixel no hay optimización real de Meta: imprescindible antes de escalar.', destino: null },
];

const STACK_FLUJO = [
  { f: 'Captar', canal: 'Meta Ads + Instagram', d: 'Atraés tráfico calificado con anuncios y contenido orgánico.', color: '#a855f7' },
  { f: 'Medir', canal: 'Pixel + eventos', d: 'Todo evento queda registrado para saber qué convierte.', color: '#22c55e' },
  { f: 'Cerrar', canal: 'WhatsApp Business', d: 'La conversación convierte la captación en venta.', color: '#25d366' },
  { f: 'Fidelizar', canal: 'Email (Klaviyo)', d: 'Post-venta y referidos para que cada clienta vuelva y recomiende.', color: '#f59e0b' },
];

export default function Herramientas({ onNav }: { onNav: (v: ViewKey) => void }) {
  const [tools, setTools] = useState(HERRAMIENTAS);
  const [toast, setToast] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const connect = (key: string) => {
    setTools(prev => prev.map(t => t.key === key ? { ...t, estado: 'Conectando' as Estado } : t));
    setTimeout(() => {
      setTools(prev => prev.map(t => {
        if (t.key !== key) return t;
        const esPixel = key === 'pixel';
        return { ...t, estado: 'Conectado' as Estado, uso: esPixel ? 100 : t.uso || 45, metric: esPixel ? 'Eventos activos' : t.metric, destino: t.destino };
      }));
      const nombre = tools.find(t => t.key === key)?.nombre || '';
      setToast(`✅ ${nombre} conectado correctamente.`);
      setTimeout(() => setToast(''), 2600);
    }, 900);
  };

  const configurar = (destino: ViewKey | null) => { if (destino) onNav(destino); };

  const conectadas = tools.filter(t => t.estado === 'Conectado').length;

  return (
    <>
      <div className="hdr"><div><div className="hdr-t">Herramientas</div><div className="hdr-s">Módulo M3: tu stack de operación.</div></div><Button onClick={() => setModalOpen(true)}>+ Conectar</Button></div>

      {/* Resumen del stack */}
      <div className="herr-stats">
        <div className="herr-stat"><div className="tiny muted" style={{ fontWeight: 600 }}>Herramientas conectadas</div><div className="herr-stat-v" style={{ color: 'var(--green)' }}>{conectadas} / {tools.length}</div><div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 4 }}>El {Math.round(conectadas / tools.length * 100)}% del stack operativo ya está activo.</div></div>
        <div className="herr-stat"><div className="tiny muted" style={{ fontWeight: 600 }}>Concentración de tráfico</div><div className="herr-stat-v" style={{ color: 'var(--amber)' }}>Meta Ads</div><div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 4 }}>Todo el tráfico pagado sale de un solo canal: riesgo a diversificar.</div></div>
        <div className="herr-stat"><div className="tiny muted" style={{ fontWeight: 600 }}>Herramienta más crítica</div><div className="herr-stat-v" style={{ color: 'var(--amber)' }}>{tools.find(t => t.key === 'pixel')?.estado === 'Conectado' ? 'Connectada' : 'Pixel'}</div><div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 4 }}>Sin pixel no podés optimizar ni escalar Meta. Conectalo primero.</div></div>
      </div>

      {/* Grid de herramientas */}
      <div className="grid-3 mt-16 herr-grid">
        {tools.map(h => (
          <Card key={h.key}>
            <div className="spread">
              <div className="row" style={{ gap: 10 }}>
                <span className="herr-ico" style={{ background: `${h.color}22`, color: h.color }}>{h.icono}</span>
                <div>
                  <div className="small" style={{ fontWeight: 700 }}>{h.nombre}</div>
                  <div className="tiny muted" style={{ marginTop: 1 }}>{h.rol}</div>
                </div>
              </div>
              <Badge tone={h.estado === 'Conectado' ? 'green' : h.estado === 'Conectando' ? 'amber' : 'muted'}>{h.estado}</Badge>
            </div>

            <div className="herr-metric">
              <span className="tiny muted">{h.metric}</span>
              {h.uso > 0 && <span className="tiny" style={{ color: h.color, fontWeight: 700 }}>{h.uso}% uso</span>}
            </div>

            <div className="herr-bar"><div className="herr-bar-fill" style={{ width: `${h.uso}%`, background: `linear-gradient(90deg, ${h.color}, ${h.color}99)`, transition: 'width .5s ease' }} /></div>

            <div className="tiny muted" style={{ lineHeight: 1.45, margin: '10px 0 14px' }}>{h.nota}</div>

            {h.estado === 'Conectado' ? (
              <Button variant="ghost" className="btn-sm" style={{ width: '100%' }} onClick={() => configurar(h.destino)}>
                Configurar {h.cat} →
              </Button>
            ) : h.estado === 'Conectando' ? (
              <Button className="btn-sm" style={{ width: '100%' }} disabled>Conectando…</Button>
            ) : (
              <Button variant="outline" className="btn-sm" style={{ width: '100%' }} onClick={() => connect(h.key)}>
                Conectar {h.cat}
              </Button>
            )}
          </Card>
        ))}
      </div>

      {/* Cómo funciona tu stack */}
      <div className="grid-2 mt-16">
        <Card title="Cómo funciona tu stack" action={<I_Trend size={16} />}>
          <div className="tiny muted" style={{ marginTop: -2, marginBottom: 16, lineHeight: 1.5 }}>
            El flujo completo de tu operación, de la captación a la fidelización. Cada herramienta cumple un rol preciso.
          </div>
          <div className="herr-flujo">
            {STACK_FLUJO.map((f, i) => (
              <div key={f.f} className="herr-flujo-item">
                <div className="herr-flujo-num" style={{ background: `linear-gradient(135deg, ${f.color}, #7c3aed)` }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="small" style={{ fontWeight: 700 }}>{f.f}</span>
                    <span className="tiny" style={{ color: f.color, fontWeight: 600 }}>{f.canal}</span>
                  </div>
                  <div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 3 }}>{f.d}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Análisis IA" action={<I_Sparkle size={16} />}>
          <div className="tiny muted" style={{ marginTop: -2, marginBottom: 16, lineHeight: 1.5 }}>
            La IA evalúa tu stack y te dice qué conectar primero para destrabar el crecimiento.
          </div>
          <div className="ai-result">
            <div className="row"><I_Sparkle size={18} /><span style={{ fontWeight: 700 }}>Resumen del stack</span></div>
            <p className="small muted" style={{ lineHeight: 1.6, marginTop: 8 }}>
              Tu stack está <b style={{ color: 'var(--purple4)' }}>subutilizado</b>: con {conectadas} de {tools.length} conectadas, dejás de recuperar carritos
              (Email) y de optimizar el gasto de ads (Pixel). La IA recomienda conectar <b>Pixel + eventos</b> y <b>Klaviyo</b> cuanto antes.
            </p>
          </div>
          <div className="ai-sec-t">Orden de prioridad</div>
          <div className="herr-prioridad">
            
            {['Pixel + eventos', 'Email (Klaviyo)', 'TikTok'].map((n, i) => {
              const t = tools.find(x => x.nombre.startsWith(n) || (n.startsWith('Pixel') && x.key === 'pixel'));
              const conectado = t?.estado === 'Conectado';
              return (
                <div key={n} className="herr-prio-row">
                  <span className="herr-prio-num" style={conectado ? { background: 'rgba(34,197,94,.16)', color: 'var(--green)' } : {}}>{conectado ? '✓' : i + 1}</span>
                  <span className="small" style={conectado ? { color: 'var(--green)' } : {}}>{n}</span>
                  <span className="tiny muted" style={{ marginLeft: 'auto' }}>{conectado ? 'Listo' : i === 0 ? 'Bloqueante' : i === 1 ? 'Alto impacto' : 'Oportunidad'}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Modal conectar */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Conectar una herramienta">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tools.filter(t => t.estado !== 'Conectado').map(t => (
            <div key={t.key} className="row" style={{ justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg2)' }}>
              <div className="row" style={{ gap: 10 }}>
                <span className="herr-ico" style={{ width: 36, height: 36, background: `${t.color}22`, color: t.color, fontSize: 16 }}>{t.icono}</span>
                <div>
                  <div className="small" style={{ fontWeight: 700 }}>{t.nombre}</div>
                  <div className="tiny muted">{t.rol}</div>
                </div>
              </div>
              <Button variant="outline" className="btn-sm" onClick={() => { connect(t.key); setModalOpen(false); }}>Conectar</Button>
            </div>
          ))}
          {tools.filter(t => t.estado !== 'Conectado').length === 0 && (
            <div className="tiny muted" style={{ textAlign: 'center', padding: '20px 0' }}>🎉 Tenés todo el stack conectado.</div>
          )}
        </div>
      </Modal>

      <Toast show={!!toast} text={toast} />
    </>
  );
}
