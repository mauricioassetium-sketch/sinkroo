import { useEffect, useState } from 'react';
import { Card, Badge, Button } from './ui';
import { BarRow } from './viz';
import { I_Play, I_Eye, I_Zap, I_Trend, I_Check, I_Refresh, I_Credit, I_Pause } from './icons';

// =============================================================================================
// EN LÍNEA — el final del flujo: lo que se publicó y cómo está rindiendo AHORA.
// Monitoreo directo: los números se mueven solos mientras mirás.
// =============================================================================================

const PUBLICADAS = [
  { titulo: 'El problema primero', formato: 'Video vertical 15 s', red: 'Instagram + Facebook', alcance: 12480, clics: 412, roas: 4.2, color: '#4A7C59' },
  { titulo: 'Antes y después real', formato: 'Carrusel 5 placas', red: 'Instagram', alcance: 8930, clics: 268, roas: 3.6, color: '#F5EFE6' },
  { titulo: 'El testimonio solo', formato: 'Imagen', red: 'Facebook + WhatsApp', alcance: 5210, clics: 196, roas: 5.1, color: '#4A7C59' },
];

export function EnLinea({ setToast }: { setToast: (t: string) => void }) {
  // Monitoreo en vivo: los números se mueven mientras mirás
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 2200);
    return () => window.clearInterval(id);
  }, []);

  const alcance = PUBLICADAS.reduce((a, p) => a + p.alcance, 0) + tick * 47;
  const clics = PUBLICADAS.reduce((a, p) => a + p.clics, 0) + tick * 3;
  const ventas = 38 + Math.floor(tick / 2);
  const roas = (PUBLICADAS.reduce((a, p) => a + p.roas, 0) / PUBLICADAS.length + tick * 0.01).toFixed(1);

  return (
    <>
      <Card className="live-head">
        <div className="row spread" style={{ gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="row" style={{ gap: 11, flex: 1, minWidth: 240 }}>
            <span className="dot-live" />
            <div style={{ minWidth: 0 }}>
              <div className="bt">Monitoreo directo, en vivo</div>
              <div className="bs">Tus 3 piezas están en tus redes. <b>El motor las mira cada 15 minutos</b> y te avisa si alguna se enfría o si conviene moverle presupuesto.</div>
            </div>
          </div>
          <Badge tone="green">3 publicadas</Badge>
        </div>
      </Card>

      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Trend size={14} style={{ color: 'var(--green)' }} /> Cómo va todo junto</span>}
          action={<Badge tone="green">en vivo</Badge>}
        >
          <div className="live-nums">
            <div className="live-n">
              <span className="live-v" style={{ color: 'var(--green)' }}>{alcance.toLocaleString('es-AR')}</span>
              <span className="live-l">personas alcanzadas</span>
            </div>
            <div className="live-n">
              <span className="live-v" style={{ color: 'var(--purple3)' }}>{clics.toLocaleString('es-AR')}</span>
              <span className="live-l">clics al sitio</span>
            </div>
            <div className="live-n">
              <span className="live-v" style={{ color: 'var(--green)' }}>{ventas}</span>
              <span className="live-l">ventas desde que salieron</span>
            </div>
            <div className="live-n">
              <span className="live-v">{roas}x</span>
              <span className="live-l">ROAS combinado</span>
            </div>
          </div>
          <div>
            <div className="bs" style={{ marginBottom: 8 }}>Cuánto rinde cada pieza:</div>
            <BarRow label="El problema primero" valor={4.2} max={5.1} formato="4,2x" color="var(--green)" />
            <BarRow label="Testimonio" valor={5.1} max={5.1} formato="5,1x" color="var(--green)" />
            <BarRow label="Antes y después" valor={3.6} max={5.1} formato="3,6x" color="var(--amber)" />
          </div>
          <div className="acc-why">
            <b>Monitoreo directo quiere decir esto:</b> no es un informe de ayer, es lo que está pasando
            mientras mirás. Si un número se cae, el motor actúa o te avisa.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Check size={14} style={{ color: 'var(--green)' }} /> Lo que está publicado</span>}
          action={<Badge tone="purple">{PUBLICADAS.length} piezas</Badge>}
        >
          {PUBLICADAS.map((p, i) => (
            <div key={p.titulo} className="pub">
              <span className="pub-color" style={{ background: p.color }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="rank-t">{p.titulo}</span>
                <span className="rank-m">{p.formato} · {p.red}</span>
                <span className="pub-nums">
                  <span>{(p.alcance + tick * (12 + i * 4)).toLocaleString('es-AR')} alcance</span>
                  <span>{(p.clics + tick * (i + 1)).toLocaleString('es-AR')} clics</span>
                  <span style={{ color: 'var(--green)', fontWeight: 800 }}>{p.roas.toFixed(1)}x</span>
                </span>
              </span>
              <span className="row" style={{ gap: 6, flexShrink: 0 }}>
                <Button variant="ghost" className="btn-sm" title="Pausa esta pieza ahora. Es reversible: la reactivás cuando quieras."
                  onClick={() => setToast(`Pausar «${p.titulo}» (demo)`)}><I_Pause size={12} /></Button>
                <Button variant="ghost" className="btn-sm" title="Ver el detalle minuto a minuto de esta pieza"
                  onClick={() => setToast(`Detalle en vivo de «${p.titulo}» (demo)`)}><I_Eye size={12} /></Button>
              </span>
            </div>
          ))}
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button variant="outline" className="btn-sm" title="Pausa todas las piezas que están gastando sin devolver"
              onClick={() => setToast('Frenar las que no rinden (demo)')}><I_Zap size={13} /> Frenar las que no rinden</Button>
            <Button variant="ghost" className="btn-sm" title="Abre el informe con todo lo que pasó desde que salieron"
              onClick={() => setToast('Informe completo (demo)')}>Ver el informe completo</Button>
          </div>
          <div className="acc-why">
            Cada pieza se puede <b>pausar sin perder nada</b>: lo que ya rindió queda en la bitácora y la
            podés reactivar cuando quieras.
          </div>
        </Card>
      </div>

      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Credit size={14} style={{ color: 'var(--amber)' }} /> Lo que el motor está cuidando solo</span>}
          action={<Badge tone="green">cada 15 min</Badge>}
        >
          <div className="guards">
            <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="guard-lb">Rinde parejo<small>Ninguna pieza se enfrió: no hubo que tocar nada</small></span>
              <span className="guard-val" style={{ color: 'var(--green)' }}>todo bien</span></div>
            <div className="guard"><span style={{ color: 'var(--amber)', flexShrink: 0 }}><I_Trend size={14} /></span>
              <span className="guard-lb">«Antes y después» bajó un poco<small>Pasó de 4,0x a 3,6x: la frecuencia subió. Si sigue, el motor va a pedirte refrescar el creativo</small></span>
              <span className="guard-val" style={{ color: 'var(--amber)' }}>vigilando</span></div>
            <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Zap size={14} /></span>
              <span className="guard-lb">Presupuesto repartido solo<small>Le sacó $4/día a la que más rinde y ya tiene techo de gasto</small></span>
              <span className="guard-val">hace 20 min</span></div>
          </div>
          <div className="acc-why">
            Esto es lo que el motor hace <b>mientras no mirás</b>. Vos ves el resultado acá y te enterás
            de cada movimiento en la bitácora.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Refresh size={14} style={{ color: 'var(--purple3)' }} /> ¿Y después?</span>}
          action={<Badge tone="purple">el ciclo sigue</Badge>}
        >
          <div className="bs">
            Cuando una pieza se enfría, el ciclo arranca de nuevo <b>sin que hagas nada</b>:
            vuelve a MiroFish, se crean opciones nuevas y salen las mejores.
          </div>
          <div className="guards">
            <div className="guard"><span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Play size={14} /></span>
              <span className="guard-lb">Mira lo que está rindiendo<small>Cuál de tus piezas trae la gente más barata</small></span></div>
            <div className="guard"><span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Refresh size={14} /></span>
              <span className="guard-lb">Crea variantes de la que gana<small>Con el mismo ángulo y los colores que ya funcionaron</small></span></div>
            <div className="guard"><span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Eye size={14} /></span>
              <span className="guard-lb">Reemplaza la que se enfría<small>No se apaga nada hasta que la nueva rinde igual o mejor</small></span></div>
          </div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button variant="ghost" className="btn-sm" title="Vuelve al principio del flujo con una campaña nueva"
              onClick={() => setToast('Campaña nueva (demo)')}>Crear una campaña nueva</Button>
          </div>
          <div className="acc-why">
            El ciclo <b>no se corta</b>: lo que se publica alimenta lo que se crea después.
            Cuanto más corrés, mejor elige.
          </div>
        </Card>
      </div>
    </>
  );
}
