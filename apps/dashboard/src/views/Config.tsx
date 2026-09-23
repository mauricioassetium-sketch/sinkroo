import { useState } from 'react';
import { Card, Badge, Button, Toast } from '../components/sinkroo/ui';
import { CANALES } from '../components/sinkroo/data';

export default function Config() {
  const [nombre, setNombre] = useState('Assettium');
  const [email, setEmail] = useState('mauricio@sinkroo.ai');
  const [toast, setToast] = useState('');
  const avisar = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2600); };

  return (
    <>
      <div className="hdr"><div><div className="hdr-t">Configuración</div><div className="hdr-s">Tu cuenta, canales y preferencias.</div></div></div>

      <div className="grid-2">
        <Card title="Perfil">
          <div className="ob-fields">
            <div><label className="label">Nombre de la cuenta</label><input className="input" value={nombre} onChange={e => setNombre(e.target.value)} /></div>
            <div><label className="label">Email</label><input className="input" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div><label className="label">Moneda</label><select className="input"><option>USD ($)</option><option>ARS ($)</option><option>AED (د.إ)</option></select></div>
          </div>
          <Button className="mt-16" onClick={() => avisar('✅ Cambios guardados.')}>Guardar cambios</Button>
        </Card>

        <Card title="Canales conectados">
          {CANALES.map(c => (
            <div key={c.nombre} className="spread small" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="row"><span className="camp-mod-ico" style={{ background: c.color, width: 30, height: 30, fontSize: 11 }}>{c.icono}</span><div><div style={{ fontWeight: 600 }}>{c.nombre}</div><div className="tiny muted">{c.cuenta}</div></div></div>
              <Badge tone={c.conectado ? 'green' : 'muted'}>{c.conectado ? 'Conectado' : 'Desconectado'}</Badge>
            </div>
          ))}
        </Card>
      </div>
      <Toast show={!!toast} text={toast} />
    </>
  );
}
