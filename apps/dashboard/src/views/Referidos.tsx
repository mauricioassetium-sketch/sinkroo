import { useState } from 'react';
import { Card, Badge, Button, Toast } from '../components/sinkroo/ui';
import { I_Copy, I_Gift } from '../components/sinkroo/icons';
import { REFERIDOS } from '../components/sinkroo/data';

export default function Referidos() {
  const link = 'https://sinkroo.ai/r/assettium';
  const [toast, setToast] = useState('');
  const copiar = async () => { try { await navigator.clipboard.writeText(link); setToast('🔗 Link copiado al portapapeles.'); } catch { setToast('Link: ' + link); } setTimeout(() => setToast(''), 2600); };
  return (
    <>
      <div className="hdr"><div><div className="hdr-t">Referidos</div><div className="hdr-s">Ganá créditos invitando a tu red.</div></div><Badge tone="green">+250 créditos</Badge></div>

      <div className="grid-2">
        <Card title="Tu link de referido" action={<I_Gift size={16} />}>
          <div className="row" style={{ gap: 8 }}>
            <input className="input" value={link} readOnly />
            <Button className="btn-sm" onClick={copiar}><I_Copy size={15} /> Copiar</Button>
          </div>
          <div className="ob-help" style={{ marginTop: 12 }}>Por cada referido que pague su primer mes, ganás <b>250 créditos</b>.</div>
        </Card>
        <Card title="Progreso de referidos">
          <div className="metric">2 <span className="metric-sub">pagados</span></div>
          <div className="small muted">1 pendiente · 1 invitación enviada</div>
        </Card>
      </div>

      <Card className="mt-16" title="Tu red">
        <div className="reftree">
          <div className="ref-node root"><div className="av" style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#a855f7,#7e22ce)' }}>AM</div><div style={{ flex: 1 }}><div className="small" style={{ fontWeight: 800 }}>{REFERIDOS.raiz.nombre}</div><div className="tiny muted">{REFERIDOS.raiz.estado}</div></div></div>
          {REFERIDOS.hijos.map(h => (
            <div key={h.nombre}>
              <div className="ref-node" style={{ marginLeft: 40 }}><div className="av" style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#22c55e,#15803d)', fontSize: 12 }}>{h.nombre.split(' ').map(w => w[0]).slice(0,2).join('')}</div><div style={{ flex: 1 }}><div className="small" style={{ fontWeight: 600 }}>{h.nombre}</div><div className="tiny muted">{h.estado}</div></div></div>
              {h.hijos?.map((s: any) => (
                <div key={s.nombre} className="ref-node" style={{ marginLeft: 80 }}><div className="av" style={{ width: 28, height: 28, background: 'linear-gradient(135deg,#6366f1,#3730a3)', fontSize: 11 }}>{s.nombre.split(' ').map((w: string) => w[0]).slice(0,2).join('')}</div><div style={{ flex: 1 }}><div className="small" style={{ fontWeight: 500 }}>{s.nombre}</div><div className="tiny muted">{s.estado}</div></div></div>
              ))}
            </div>
          ))}
        </div>
      </Card>
      <Toast show={!!toast} text={toast} />
    </>
  );
}
