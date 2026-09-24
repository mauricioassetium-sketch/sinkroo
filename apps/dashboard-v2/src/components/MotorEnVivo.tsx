import { useEffect, useState } from 'react';
import { Card, Badge, Button } from './ui';
import { I_Zap, I_Check, I_ArrowRight } from './icons';
import { ETAPAS_MOTOR, PIEZAS_MOTOR, CHAT_MOTOR, VOTOS_MOTOR } from '../data/demo';

// =============================================================================================
// EL MOTOR ANDANDO — mercado secundario predictivo (portado del dashboard original)
//
// Es el vidrio del motor: la propuesta se prueba en un mercado simulado ANTES de gastar un peso.
// Se ve la etapa, el sentimiento, el score en vivo, los votos y las reacciones.
// =============================================================================================

const COLOR: Record<string, string> = { positivo: '#34d399', negativo: '#f87171', analisis: '#a855f7' };

export function MotorEnVivo({ setToast }: { setToast: (t: string) => void }) {
  const [pos, setPos] = useState(0);
  const [paso, setPaso] = useState(4); // arranca en Ranking (etapa 5/6) para que se vea trabajando
  const [chat, setChat] = useState<{ id: number; t: string; m: string }[]>(
    CHAT_MOTOR.slice(0, 8).map((c, i) => ({ id: 120 + i * 37, ...c })),
  );
  const [score, setScore] = useState(47);
  const [votos, setVotos] = useState<{ id: number; v: string }[]>([
    { id: 349, v: 'Aprueba' }, { id: 412, v: 'Aprueba con reserva' },
    { id: 178, v: 'Rechaza' }, { id: 265, v: 'Aprueba' }, { id: 490, v: 'Neutro' },
  ]);
  const [hist, setHist] = useState<number[]>([41, 44, 42, 46, 45, 47]);
  const [sent, setSent] = useState({ pos: 19, neg: 5, ana: 3 });

  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      n++;
      const cuantos = Math.random() < 0.5 ? 1 : 2;
      const nuevos: { id: number; t: string; m: string }[] = [];
      for (let k = 0; k < cuantos; k++) {
        const c = CHAT_MOTOR[Math.floor(Math.random() * CHAT_MOTOR.length)];
        nuevos.push({ id: 100 + Math.floor(Math.random() * 400), t: c.t, m: c.m });
      }
      setChat(prev => [...nuevos, ...prev].slice(0, 14));
      setSent(s => {
        let { pos: p, neg: g, ana: a } = s;
        nuevos.forEach(c => { if (c.t === 'positivo') p++; else if (c.t === 'negativo') g++; else a++; });
        return { pos: p, neg: g, ana: a };
      });
      if (n % 4 === 0) {
        setPaso(p => {
          if (p < 5) return p + 1;
          setPos(x => (x + 1) % PIEZAS_MOTOR.length);
          const s2 = 40 + Math.floor(Math.random() * 30);
          setHist(h => [...h, s2].slice(-20));
          setScore(s2);
          setVotos([0, 1, 2, 3, 4].map(() => ({ id: 100 + Math.floor(Math.random() * 400), v: VOTOS_MOTOR[Math.floor(Math.random() * VOTOS_MOTOR.length)] })));
          return 0;
        });
      }
    }, 1100);
    return () => clearInterval(id);
  }, []);

  const pieza = PIEZAS_MOTOR[pos];
  const total = sent.pos + sent.neg + sent.ana;
  const aprueba = score >= 80;

  const cuentaVotos: Record<string, number> = {};
  votos.forEach(v => { cuentaVotos[v.v] = (cuentaVotos[v.v] || 0) + 1; });
  const filasVoto: [string, string][] = [['Aprueba', '#34d399'], ['Con reserva', '#a855f7'], ['Neutro', '#9ca3af'], ['Rechaza', '#f87171']];

  return (
    <Card
      title={<><I_Zap size={15} style={{ marginRight: 8, color: 'var(--purple4)' }} /> El motor andando: mercado secundario predictivo</>}
      action={<span className="badge badge-green" style={{ fontSize: 10 }}>en vivo</span>}
    >
      <div className="small muted" style={{ marginBottom: 14, lineHeight: 1.5 }}>
        Tu propuesta se prueba acá antes de salir a internet. Esto es lo que pasa <b>ahora mismo</b>:
      </div>

      <div className="motor-split">
        {/* ============ IZQUIERDA: el proceso ============ */}
        <div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(168,85,247,.35)', background: 'rgba(124,58,237,.08)' }}>
            <span style={{ fontSize: 22 }}>{pieza.e}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="small" style={{ fontWeight: 700 }}>En el filtro: {pieza.n}</div>
              <div className="tiny muted">{pieza.t}</div>
            </div>
            <Badge tone="purple">Etapa {paso + 1}/6</Badge>
          </div>

          <div className="motor-kpis">
            {/* sentimiento */}
            <div style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg2)' }}>
              <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 6 }}>Sentimiento del mercado</div>
              <div style={{ display: 'flex', height: 44, borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ width: (sent.pos / total) * 100 + '%', background: 'linear-gradient(180deg,#34d399,#059669)', transition: 'width .5s ease' }} />
                <div style={{ width: (sent.neg / total) * 100 + '%', background: 'linear-gradient(180deg,#f87171,#dc2626)', transition: 'width .5s ease' }} />
                <div style={{ width: (sent.ana / total) * 100 + '%', background: 'linear-gradient(180deg,#a855f7,#7c3aed)', transition: 'width .5s ease' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <span className="tiny" style={{ color: '#34d399' }}>▲ {sent.pos}</span>
                <span className="tiny" style={{ color: '#f87171' }}>▼ {sent.neg}</span>
                <span className="tiny" style={{ color: '#a855f7' }}>● {sent.ana}</span>
              </div>
            </div>

            {/* score en vivo */}
            <div style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg2)' }}>
              <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 6 }}>Score en vivo</div>
              <svg width="100%" height="44" viewBox="0 0 100 40" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="v2spark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {(() => {
                  const datos = hist;
                  const min = 30, max = 75;
                  const pts = datos.map((v, i) => [8 + (i / Math.max(1, datos.length - 1)) * 84, 36 - ((v - min) / (max - min)) * 32]);
                  const line = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
                  const area = line + ' L ' + pts[pts.length - 1][0].toFixed(1) + ' 38 L ' + pts[0][0].toFixed(1) + ' 38 Z';
                  const last = pts[pts.length - 1];
                  return (<g>
                    <path d={area} fill="url(#v2spark)" />
                    <path d={line} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx={last[0]} cy={last[1]} r="3" fill="#a855f7" />
                  </g>);
                })()}
              </svg>
              <div className="tiny" style={{ color: '#a855f7', fontWeight: 800, marginTop: 2 }}>{score}/100</div>
            </div>

            {/* distribución de votos */}
            <div style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg2)' }}>
              <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 6 }}>Distribución de votos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {filasVoto.map(([lab, col]) => {
                  const n = cuentaVotos[lab] || 0;
                  return (
                    <div key={lab} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="tiny" style={{ width: 58, color: col, flexShrink: 0, fontSize: 10 }}>{lab}</span>
                      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg3)', overflow: 'hidden' }}>
                        <div style={{ width: (n / (votos.length || 1)) * 100 + '%', height: '100%', background: col, transition: 'width .5s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* las 6 etapas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ETAPAS_MOTOR.map((f, i) => {
              const fase = paso > i ? 'hecho' : paso === i ? 'activo' : 'pendiente';
              return (
                <div key={i} style={{
                  display: 'flex', gap: 10, alignItems: 'center', padding: '9px 12px', borderRadius: 10, transition: 'all .3s ease',
                  border: '1px solid ' + (fase === 'activo' ? '#a855f7' : fase === 'hecho' ? 'rgba(52,211,153,.4)' : 'var(--border2)'),
                  background: fase === 'activo' ? 'rgba(124,58,237,.10)' : fase === 'hecho' ? 'rgba(52,211,153,.06)' : 'var(--bg2)',
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, flexShrink: 0, color: '#fff',
                    background: fase === 'pendiente' ? 'var(--bg3)' : fase === 'activo' ? 'linear-gradient(90deg,#7c3aed,#a855f7)' : '#34d399',
                    boxShadow: fase === 'activo' ? '0 0 14px rgba(168,85,247,.55)' : 'none',
                  }}>
                    {fase === 'hecho' ? <I_Check size={15} /> : i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="small" style={{ fontWeight: 700, color: fase === 'activo' ? '#a855f7' : 'inherit' }}>{f.t}</div>
                    {fase === 'activo' && <div className="tiny muted" style={{ marginTop: 1 }}>{f.d}</div>}
                  </div>
                  {fase === 'activo' && <span className="tiny" style={{ color: '#a855f7', fontWeight: 700 }}>● ahora</span>}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', padding: '12px 14px', borderRadius: 12, background: 'rgba(124,58,237,.10)', border: '1px solid rgba(124,58,237,.25)' }}>
            <div style={{ fontSize: 26 }}>🧠</div>
            <div style={{ flex: 1 }}>
              <div className="small" style={{ fontWeight: 700 }}>Score: {score}/100</div>
              <div className="tiny muted">{aprueba ? 'El mercado sugiere PUBLICAR esta propuesta.' : 'El mercado aún debate si vale publicarla.'}</div>
            </div>
            <Badge tone={aprueba ? 'green' : 'amber'}>{aprueba ? 'Aprobada' : 'En debate'}</Badge>
          </div>
        </div>

        {/* ============ DERECHA: el mercado reaccionando ============ */}
        <div style={{ border: '1px solid var(--border2)', borderRadius: 12, background: 'var(--bg2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 12px', borderBottom: '1px solid var(--border2)', background: 'var(--bg3)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,.25)', animation: 'livepulse 1.5s infinite' }} />
            <span className="small" style={{ fontWeight: 700 }}>El público, reacción en vivo</span>
            <span className="tiny muted" style={{ marginLeft: 'auto' }}>500 agentes del público</span>
          </div>
          <div style={{ flex: 1, maxHeight: 380, overflowY: 'auto', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {chat.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 11.5, lineHeight: 1.35 }}>
                <span style={{ fontWeight: 800, color: COLOR[m.t], flexShrink: 0 }}>#{m.id}</span>
                <span style={{ color: 'var(--txt)', overflowWrap: 'anywhere' }}>{m.m}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border2)', padding: '8px 10px', background: 'var(--bg3)' }}>
            <div className="tiny" style={{ fontWeight: 700, marginBottom: 4 }}>Lo que está reaccionando ahora</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {votos.map((v, i) => (
                <span key={i} className="tiny" style={{
                  padding: '2px 8px', borderRadius: 999,
                  background: v.v === 'Aprueba' ? 'rgba(52,211,153,.16)' : v.v === 'Rechaza' ? 'rgba(248,113,113,.16)' : 'rgba(168,85,247,.16)',
                  color: v.v === 'Aprueba' ? '#34d399' : v.v === 'Rechaza' ? '#f87171' : '#a855f7',
                }}>
                  #{v.id} · {v.v}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============ CIERRE: el filtro + qué hace cada botón ============ */}
      <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 12, background: 'rgba(34,211,238,.08)', border: '1px solid rgba(34,211,238,.25)' }}>
        <div className="tiny muted"><b style={{ color: '#22d3ee' }}>🔒 El filtro antes de salir live:</b> solo lo que convence acá se publica; lo que no, se descarta y enseña al sistema.</div>
      </div>

      <div className="row" style={{ gap: 9, marginTop: 12, flexWrap: 'wrap' }}>
        <Button variant={aprueba ? 'primary' : 'outline'} className="btn-sm"
          title="Saca la pieza del filtro y la deja lista para publicar"
          onClick={() => setToast(aprueba ? `"${pieza.n}" aprobada y lista para publicar (demo)` : 'El score no llega a 80: no se publica y el motor aprende de esto (demo)')}>
          <I_Check size={13} /> {aprueba ? 'Sacar del filtro y publicar' : 'Pedir otra ronda al motor'}
        </Button>
        <Button variant="ghost" className="btn-sm"
          title="Abre el detalle de cómo votó cada observador"
          onClick={() => setToast('Detalle de la votación, observador por observador (demo)')}>
          <I_ArrowRight size={13} /> Ver por qué votaron así
        </Button>
        <Button variant="ghost" className="btn-sm"
          title="Nia reescribe la pieza con las objeciones del mercado y la vuelve a probar"
          onClick={() => setToast('Nia reescribe con las objeciones y la vuelve a meter al filtro (demo)')}>
          Corregir lo que objetaron
        </Button>
      </div>
      <div className="acc-why">
        <b>Publicar</b> es lo único que gasta dinero y necesita tu OK si estás en modo Compartido.{' '}
        <b>Ver por qué votaron así</b> no cambia nada, solo abre el detalle. <b>Corregir</b> crea una pieza nueva: la actual queda intacta.
      </div>
    </Card>
  );
}
