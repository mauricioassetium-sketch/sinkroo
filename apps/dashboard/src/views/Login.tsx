import { useState } from 'react';
import { SinkrooMark, I_Lock, I_Mail, I_ArrowRight } from '../components/sinkroo/icons';

export default function Login({ onEnter }: { onEnter: () => void }) {
  const [email, setEmail] = useState('mauricio@sinkroo.ai');
  const [pass, setPass] = useState('');

  return (
    <div className="ob-shell">
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 36 }}>
        <div className="row" style={{ marginBottom: 6 }}>
          <SinkrooMark size={40} radius={11} />
          <span className="wordmark">Sinkroo</span>
        </div>
        <p className="muted small" style={{ marginBottom: 24 }}>Tu operación D2C, potenciada por IA.</p>

        <div className="ob-fields">
          <div>
            <label className="label">Email</label>
            <div style={{ position: 'relative' }}>
              <input className="input" placeholder="tu@empresa.com" value={email} onChange={e => setEmail(e.target.value)} style={{ paddingLeft: 40 }} />
              <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', display: 'flex' }}><I_Mail size={17} /></span>
            </div>
          </div>
          <div>
            <label className="label">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && onEnter()} style={{ paddingLeft: 40 }} />
              <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', display: 'flex' }}><I_Lock size={17} /></span>
            </div>
          </div>
        </div>

        <button className="btn btn-primary" style={{ width: '100%', marginTop: 24 }} onClick={onEnter}>Entrar <I_ArrowRight size={16} /></button>

        <div className="ob-oauth">
          <button className="ob-oauth-btn" onClick={onEnter}><span className="ob-g"></span>Continuar con Google</button>
          <button className="ob-oauth-btn" onClick={onEnter}><span className="ob-f">f</span>Continuar con Facebook</button>
        </div>
        <p className="muted small" style={{ textAlign: 'center', marginTop: 18 }}>Demo, el onboarding arranca al entrar.</p>
      </div>
    </div>
  );
}
