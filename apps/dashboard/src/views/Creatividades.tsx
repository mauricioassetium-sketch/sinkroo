import { useState } from 'react';
import { Card, Badge, Button, Modal, Toast } from '../components/sinkroo/ui';
import { I_Sparkle, I_Edit, I_Trash } from '../components/sinkroo/icons';

type Creatividad = {
  titulo: string; tipo: 'Video' | 'Imagen' | 'Carrusel'; ctr: string; cpc: string; roas: string;
  hot: boolean; grad: [string, string]; emoji: string; alcance: string; conversiones: number;
};

const CREATIVIDADES: Creatividad[] = [
  { titulo: 'Antes y Después. Serum', tipo: 'Video', ctr: '4.8%', cpc: '$0.42', roas: '5.1x', hot: true, grad: ['#a855f7', '#7e22ce'], emoji: '✨', alcance: '48.5K', conversiones: 214 },
  { titulo: 'Ingredientes limpios', tipo: 'Imagen', ctr: '3.1%', cpc: '$0.58', roas: '3.2x', hot: false, grad: ['#22c55e', '#15803d'], emoji: '🌿', alcance: '31.2K', conversiones: 128 },
  { titulo: 'Testimonio Valeria', tipo: 'Video', ctr: '2.9%', cpc: '$0.61', roas: '2.8x', hot: false, grad: ['#06b6d4', '#0e7490'], emoji: '💬', alcance: '24.8K', conversiones: 96 },
  { titulo: 'Oferta 2x1 Lanzamiento', tipo: 'Imagen', ctr: '2.4%', cpc: '$0.70', roas: '2.1x', hot: false, grad: ['#f59e0b', '#b45309'], emoji: '🎁', alcance: '19.5K', conversiones: 71 },
  { titulo: 'Rutina 3 pasos', tipo: 'Carrusel', ctr: '1.8%', cpc: '$0.79', roas: '1.6x', hot: false, grad: ['#ec4899', '#be185d'], emoji: '🧖', alcance: '14.1K', conversiones: 44 },
];

const IDEAS_IA = [
  { titulo: 'UGC: rutina real mañana', tipo: 'Video', emoji: '🎥', grad: ['#8b5cf6', '#6d28d9'] as [string, string] },
  { titulo: 'Beneficios serum en 5s', tipo: 'Video', emoji: '⚡', grad: ['#6366f1', '#4338ca'] as [string, string] },
  { titulo: 'Carrusel ingredientes + dosis', tipo: 'Carrusel', emoji: '🧪', grad: ['#0ea5e9', '#075985'] as [string, string] },
];

export default function Creatividades() {
  const [creas, setCreas] = useState(CREATIVIDADES);
  const [filtro, setFiltro] = useState<'Todas' | 'Video' | 'Imagen' | 'Carrusel'>('Todas');
  const [modalIA, setModalIA] = useState(false);
  const [toast, setToast] = useState('');

  const avisar = (t: string) => { setToast(t); setTimeout(() => setToast(''), 3000); };

  const visibles = filtro === 'Todas' ? creas : creas.filter(c => c.tipo === filtro);

  const roasNum = (r: string) => parseFloat(r.replace('x', ''));
  const ctrPromedio = (creas.reduce((a, c) => a + parseFloat(c.ctr.replace('%', '')), 0) / Math.max(creas.length, 1)).toFixed(1) + '%';
  const roasPromedio = (creas.reduce((a, c) => a + roasNum(c.roas), 0) / Math.max(creas.length, 1)).toFixed(1) + 'x';

  const efectividad = (r: string) => Math.min(100, Math.round((roasNum(r) / 5.1) * 100));

  const crearConIA = (idea: typeof IDEAS_IA[number]) => {
    const nueva: Creatividad = {
      titulo: idea.titulo, tipo: idea.tipo as any, ctr: '—', cpc: '—', roas: '—', hot: false,
      grad: idea.grad, emoji: idea.emoji, alcance: '0', conversiones: 0,
    };
    setCreas(prev => [nueva, ...prev]);
    setModalIA(false);
    avisar(`✨ Creatividad "${idea.titulo}" creada. Empezá a publicarla.`);
  };

  const duplicar = (c: Creatividad) => {
    setCreas(prev => [{ ...c, titulo: c.titulo + ' (copia)', hot: false }, ...prev]);
    avisar(`📋 "${c.titulo}" duplicada.`);
  };

  const eliminar = (c: Creatividad) => {
    setCreas(prev => prev.filter(x => x.titulo !== c.titulo));
    avisar(`🗑️ "${c.titulo}" eliminada.`);
  };


  return (
    <>
      <div className="hdr">
        <div><div className="hdr-t">Creatividades</div><div className="hdr-s">Tus anuncios y su rendimiento.</div></div>
        <Button onClick={() => setModalIA(true)}><I_Sparkle size={15} style={{ marginRight: 6 }} /> Crear con IA</Button>
      </div>

      {/* KPIs */}
      <div className="herr-stats" style={{ marginBottom: 16 }}>
        <div className="herr-stat"><div className="tiny muted" style={{ fontWeight: 600 }}>CTR promedio</div><div className="herr-stat-v" style={{ color: 'var(--purple4)' }}>{ctrPromedio}</div></div>
        <div className="herr-stat"><div className="tiny muted" style={{ fontWeight: 600 }}>ROAS promedio</div><div className="herr-stat-v" style={{ color: 'var(--green)' }}>{roasPromedio}</div></div>
        <div className="herr-stat"><div className="tiny muted" style={{ fontWeight: 600 }}>Creatividades activas</div><div className="herr-stat-v">{creas.length}</div></div>
      </div>

      {/* Filtro */}
      <div className="row" style={{ gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {(['Todas', 'Video', 'Imagen', 'Carrusel'] as const).map(f => (
          <button key={f} className={`chip ${filtro === f ? 'chip-on' : ''}`} onClick={() => setFiltro(f)}>{f}</button>
        ))}
      </div>

      <div className="grid-3">
        {visibles.map(c => (
          <Card key={c.titulo} className="crea-card">
            <div className="crea-thumb" style={{ background: `linear-gradient(135deg,${c.grad[0]},${c.grad[1]})` }}>
              <span style={{ fontSize: 38 }}>{c.emoji}</span>
              {c.hot && <span className="crea-hot"><I_Sparkle size={13} /> Ganadora</span>}
            </div>
            <div className="small" style={{ fontWeight: 700, marginTop: 12 }}>{c.titulo}</div>
            <div className="tiny muted" style={{ marginBottom: 10 }}>{c.tipo} · {c.alcance} · {c.conversiones} conv.</div>

            {/* Barra efectividad */}
            {c.roas !== '—' && (
              <div style={{ marginBottom: 10 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="tiny muted">Efectividad</span>
                  <span className="tiny" style={{ fontWeight: 700, color: c.hot ? 'var(--green)' : 'var(--purple4)' }}>{efectividad(c.roas)}%</span>
                </div>
                <div className="herr-bar" style={{ marginTop: 5 }}><div className="herr-bar-fill" style={{ width: `${efectividad(c.roas)}%`, background: `linear-gradient(90deg, ${c.grad[0]}, ${c.grad[1]})` }} /></div>
              </div>
            )}

            <div className="row small" style={{ justifyContent: 'space-between' }}>
              <span className="muted">CTR <b style={{ color: 'var(--txt)' }}>{c.ctr}</b></span>
              <span className="muted">CPC <b style={{ color: 'var(--txt)' }}>{c.cpc}</b></span>
              <Badge tone={c.hot ? 'green' : c.roas === '—' ? 'muted' : 'purple'}>{c.roas}</Badge>
            </div>

            {/* Acciones */}
            <div className="row" style={{ gap: 6, marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <Button variant="ghost" className="btn-sm" style={{ flex: 1 }} onClick={() => avisar(`✏️ Editando "${c.titulo}"…`)}><I_Edit size={13} /> Editar</Button>
              <Button variant="ghost" className="btn-sm" style={{ flex: 1 }} onClick={() => duplicar(c)}>Duplicar</Button>
              <button className="icon-btn" style={{ color: 'var(--red)' }} onClick={() => eliminar(c)} title="Eliminar"><I_Trash size={15} /></button>
            </div>
          </Card>
        ))}
      </div>

      {visibles.length === 0 && (
        <div className="empty-state"><span style={{ fontSize: 34 }}>🎬</span><div className="small muted" style={{ marginTop: 8 }}>No hay creatividades de este tipo. Creá una con IA.</div></div>
      )}

      {/* Modal crear con IA */}
      <Modal open={modalIA} onClose={() => setModalIA(false)} title="Crear con IA">
        <div className="tiny muted" style={{ marginTop: -4, marginBottom: 14, lineHeight: 1.5 }}>
          La IA te sugiere creatividades según lo que mejor rindió en tu cuenta. Elegí una para generarla.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {IDEAS_IA.map(idea => (
            <div key={idea.titulo} className="row" style={{ justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border2)', background: 'var(--bg2)' }}>
              <div className="row" style={{ gap: 12 }}>
                <span className="crea-thumb" style={{ width: 46, height: 46, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: `linear-gradient(135deg,${idea.grad[0]},${idea.grad[1]})` }}>{idea.emoji}</span>
                <div>
                  <div className="small" style={{ fontWeight: 700 }}>{idea.titulo}</div>
                  <div className="tiny muted">{idea.tipo} · generada por IA</div>
                </div>
              </div>
              <Button variant="outline" className="btn-sm" onClick={() => crearConIA(idea)}>Crear</Button>
            </div>
          ))}
        </div>
      </Modal>

      <Toast show={!!toast} text={toast} />
    </>
  );
}
