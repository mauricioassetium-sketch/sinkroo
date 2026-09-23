import { useState } from 'react';
import { Card, Badge, Button, Progress } from '../components/ui';
import { I_Check, I_Shield, I_Lock, I_Plus, I_Zap, I_Credit, I_Link, I_Clock, I_Sun } from '../components/icons';
import { MODOS, EXCEPCIONES, FRENOS, CONEXIONES, CREDITOS_MOV, TENANT, type Modo } from '../data/demo';

const NOMBRE: Record<Modo, string> = { auto: 'Automático', shared: 'Compartido', manual: 'Manual' };

export function ViewCuenta({ setToast, modo, setModo }: { setToast: (t: string) => void; modo: Modo; setModo: (m: Modo) => void }) {
  const [niveles, setNiveles] = useState<Record<string, Modo>>(
    Object.fromEntries(EXCEPCIONES.map(e => [e.key, e.nivel])),
  );

  const cambiar = (key: string, m: Modo, fijo?: boolean) => {
    if (fijo) { setToast('La vigilancia no se puede apagar: es lo que hace que el motor nunca esté quieto.'); return; }
    setNiveles({ ...niveles, [key]: m });
    setToast(`"${EXCEPCIONES.find(e => e.key === key)?.etiqueta}" ahora trabaja en modo ${NOMBRE[m]}`);
  };

  const pctCreditos = Math.round((TENANT.creditos / TENANT.creditosMes) * 100);

  return (
    <>
      {/* ============ EL DIAL ============ */}
      <div className="csec" style={{ marginTop: 0 }}>
        <span className="csec-n">★</span>
        <span className="csec-t">¿Cuánto decide la IA?</span>
        <span className="csec-s">Una decisión tuya. Se puede cambiar cuando quieras, sin perder nada.</span>
      </div>

      <Card>
        <div className="dial-modes">
          {MODOS.map(m => (
            <div key={m.key} className={`dial-mode ${modo === m.key ? 'on' : ''}`} onClick={() => { setModo(m.key); setToast(`Modo ${m.nombre}: ${m.desc}`); }}>
              <div className="dial-mode-top">
                <span className="dial-radio" />
                <span className="dial-mode-nm">{m.nombre}</span>
                {m.key === 'shared' && <span className="badge badge-purple" style={{ marginLeft: 'auto', fontSize: 9 }}>recomendado</span>}
              </div>
              <div className="dial-mode-ds">{m.desc}</div>
              <code className="dial-vidrio">{m.vidrio}</code>
            </div>
          ))}
        </div>

        <div className="alarm" style={{ marginTop: 15, borderLeft: '3px solid var(--purple2)', background: 'rgba(168,85,247,.05)' }}>
          <div className="alarm-head">
            <span className="alarm-sev oportunidad">CÓMO SE VE EN EL MOTOR</span>
            <span className="alarm-title">El mismo vidrio, tres comportamientos distintos</span>
          </div>
          <div className="alarm-sug">
            {modo === 'auto'
              ? <>En <b>Automático</b> el motor no te pregunta nada: hace y te lo cuenta en la bitácora. Vas a ver "hizo 3 acciones mientras no estabas". Lo que igual no puede tocar son los frenos de abajo.</>
              : modo === 'shared'
                ? <>En <b>Compartido</b> el motor prepara todo y se frena esperándote. Vas a ver "2 decisiones esperan tu OK" en la barra del motor, y podés resolverlas sin salir de Tu día.</>
                : <>En <b>Manual</b> el motor sólo sugiere y acumula propuestas. Vos escribís, publicás y respondés. No gasta nada por su cuenta.</>}
          </div>
        </div>

        <div className="gauge-wrap" style={{ marginTop: 16 }}>
          <I_Credit size={20} style={{ color: 'var(--amber)' }} />
          <div className="gauge">
            <div className="row spread" style={{ marginBottom: 7 }}>
              <span className="tiny" style={{ fontWeight: 700 }}>Días de autonomía restantes</span>
              <span className="tiny muted">{TENANT.creditos.toLocaleString('es-AR')} de {TENANT.creditosMes.toLocaleString('es-AR')} créditos</span>
            </div>
            <div className="gauge-bar"><div className="gauge-fill" style={{ width: `${pctCreditos}%` }} /></div>
            <div className="tiny muted" style={{ marginTop: 7 }}>
              Con el modo actual el motor trabaja <b style={{ color: 'var(--purple3)' }}>{TENANT.diasAutonomia} días más</b> y se detiene el 5 de octubre.
              El modo Automático consume más: bajaría a 8 días.
            </div>
          </div>
          <Button variant="outline" className="btn-sm" onClick={() => setToast('Activando auto-recarga (demo)')}>
            <I_Zap size={13} /> Activar auto-recarga
          </Button>
        </div>
      </Card>

      {/* ============ EXCEPCIONES ============ */}
      <div className="csec">
        <span className="csec-n">1</span>
        <span className="csec-t">Excepciones</span>
        <span className="csec-s">No todo puede ser igual: el dinero y los clientes tienen su propio nivel</span>
      </div>
      <div className="exc">
        {EXCEPCIONES.map(e => (
          <div key={e.key} className="exc-row">
            <div className="exc-top">
              <span className="exc-lb">{e.etiqueta}</span>
              {e.fijo && <span className="exc-fijo">no se puede apagar</span>}
              <div className="seg-group">
                {(['auto', 'shared', 'manual'] as Modo[]).map(m => (
                  <span key={m}
                    className={`seg ${(niveles[e.key] ?? e.nivel) === m ? 'on' : ''} ${e.fijo && m !== 'auto' ? 'locked' : ''}`}
                    onClick={() => cambiar(e.key, m, e.fijo)}>
                    {NOMBRE[m]}
                  </span>
                ))}
              </div>
            </div>
            <div className="exc-nota">{e.nota}</div>
          </div>
        ))}
      </div>

      {/* ============ FRENOS ============ */}
      <div className="csec">
        <span className="csec-n">2</span>
        <span className="csec-t">Frenos</span>
        <span className="csec-c">siempre activos</span>
        <span className="csec-s">Aplican incluso en Automático. Si esto se puede desactivar, el modo Automático no debería existir.</span>
      </div>
      <div className="guards">
        {FRENOS.map(f => (
          <div key={f.key} className="guard">
            <I_Lock size={14} style={{ color: 'var(--purple3)', flexShrink: 0 }} />
            <span className="guard-lb">{f.etiqueta}<small>{f.porQue}</small></span>
            <span className="guard-val">{f.valor}</span>
          </div>
        ))}
      </div>
      <div className="row" style={{ marginTop: 11, gap: 9, flexWrap: 'wrap' }}>
        <Badge tone="green"><I_Shield size={11} /> El nivel de autonomía es un techo, no un piso</Badge>
        <Badge tone="purple">La IA puede pedir más control, nunca tomarlo</Badge>
        <Badge tone="amber">Toda acción reversible se puede deshacer 24 h</Badge>
      </div>

      {/* ============ CONEXIONES ============ */}
      <div className="csec">
        <span className="csec-n">3</span>
        <span className="csec-t">Conexiones</span>
        <span className="csec-s">Todo lo externo es tuyo: conectás tu propia API, no la nuestra</span>
      </div>
      <div className="duo">
        {CONEXIONES.map(c => (
          <Card key={c.key}
            title={<span className="row" style={{ gap: 9 }}><span style={{ fontSize: 17 }}>{c.emoji}</span>{c.nombre}</span>}
            action={<Badge tone={c.estado === 'conectada' ? 'green' : c.estado === 'error' ? 'red' : 'muted'}>
              {c.estado === 'conectada' ? 'conectada' : c.estado === 'error' ? 'vencida' : 'por conectar'}
            </Badge>}>
            <div className="tiny muted">{c.rol}</div>
            <div style={{ fontSize: 12.5, marginTop: 7, lineHeight: 1.45 }}>{c.detalle}</div>
            <div className="row" style={{ gap: 6, marginTop: 11, flexWrap: 'wrap' }}>
              {c.capacidades.map(cap => <span key={cap} className="badge badge-muted" style={{ fontSize: 9.5 }}>{cap}</span>)}
            </div>
            <div className="row" style={{ gap: 8, marginTop: 13 }}>
              {c.estado === 'conectada' ? (
                <>
                  <Button variant="ghost" className="btn-sm" onClick={() => setToast('Token probado ahora: sigue funcionando (demo)')}>
                    <I_Check size={13} /> Probar
                  </Button>
                  <Button variant="ghost" className="btn-sm" onClick={() => setToast('Reemplazar token (demo)')}>Reemplazar token</Button>
                </>
              ) : (
                <Button className="btn-sm" onClick={() => setToast(`Conectando ${c.nombre}: pegás tu token y lo probamos antes de guardarlo (demo)`)}>
                  <I_Link size={13} /> Conectar mi API
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      <div className="tiny muted" style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <I_Check size={13} /> Tu token se guarda cifrado y se prueba antes de guardarse. Ninguna pantalla de Sinkroo lo vuelve a mostrar.
      </div>

      {/* ============ CRÉDITOS ============ */}
      <div className="csec">
        <span className="csec-n">4</span>
        <span className="csec-t">Créditos</span>
        <span className="csec-s">Qué consume el motor, en claro</span>
      </div>
      <Card action={<Badge tone="amber">{TENANT.creditos.toLocaleString('es-AR')} disponibles</Badge>}>
        {CREDITOS_MOV.map((m, i) => (
          <div key={i} className="guard">
            <span style={{ color: m.tipo === 'entrada' ? 'var(--green)' : 'var(--muted)', flexShrink: 0 }}>
              {m.tipo === 'entrada' ? <I_Plus size={14} /> : <I_Clock size={14} />}
            </span>
            <span className="guard-lb">{m.detalle}<small>{m.fecha}</small></span>
            <span className="guard-val" style={{ color: m.tipo === 'entrada' ? 'var(--green)' : 'var(--muted)' }}>
              {m.cantidad > 0 ? '+' : ''}{m.cantidad}
            </span>
          </div>
        ))}
        <div style={{ marginTop: 14 }}>
          <div className="row spread tiny muted" style={{ marginBottom: 6 }}>
            <span>Consumo del mes</span><span>{100 - pctCreditos}%</span>
          </div>
          <Progress pct={100 - pctCreditos} color="amber" />
        </div>
      </Card>

      <div className="card" style={{ marginTop: 14, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', background: 'linear-gradient(120deg, rgba(168,85,247,.09), transparent)' }}>
        <I_Sun size={20} style={{ color: 'var(--purple3)' }} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontWeight: 800, fontSize: 13.5 }}>Podés cambiar el modo en cualquier momento</div>
          <div className="tiny muted" style={{ marginTop: 4, lineHeight: 1.5 }}>
            Si te cansa aprobar, pasás a Automático. Si algo te asusta, volvés a Compartido.
            <b> Nada de lo que el motor hizo se pierde al cambiar de modo.</b>
          </div>
        </div>
        <Button variant="outline" className="btn-sm" onClick={() => setToast('Historial de cambios de modo (demo)')}>Ver historial</Button>
      </div>
    </>
  );
}
