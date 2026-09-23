import { useState } from 'react';
import { Card, Badge, Button } from '../components/ui';
import { ViewHead, Gauge, BarRow } from '../components/viz';
import { I_Settings, I_Check, I_Shield, I_Lock, I_Plus, I_Zap, I_Credit, I_Link, I_Clock, I_Sun } from '../components/icons';
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
  const conectadas = CONEXIONES.filter(c => c.estado === 'conectada').length;
  const porConectar = CONEXIONES.filter(c => c.estado !== 'conectada').length;

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Settings size={19} />}
        titulo="Cuenta y autonomía"
        sub="Cuánto decide la IA y cuánto decidís vos. Se puede cambiar cuando quieras, sin perder nada."
        nums={[
          { v: NOMBRE[modo], l: 'modo actual', c: 'var(--purple3)' },
          { v: TENANT.creditos.toLocaleString('es-AR'), l: 'créditos disponibles' },
          { v: String(TENANT.diasAutonomia), l: 'días de autonomía', c: 'var(--amber)' },
          { v: `${conectadas}/${CONEXIONES.length}`, l: 'conexiones activas', c: 'var(--green)' },
        ]}
      />

      {/* ============ EL DIAL ============ */}
      <div className="csec" style={{ marginTop: 0 }}>
        <span className="csec-n">★</span>
        <span className="csec-t">¿Cuánto decide la IA?</span>
        <span className="csec-s">Una decisión tuya. El mismo vidrio del motor, tres comportamientos distintos</span>
      </div>
      <Card>
        <div className="dial-modes">
          {MODOS.map(m => (
            <div key={m.key} className={`dial-mode ${modo === m.key ? 'on' : ''}`}
              onClick={() => { setModo(m.key); setToast(`Modo ${m.nombre}: ${m.desc}`); }}>
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
          </div>
          <div className="alarm-sug">
            {modo === 'auto'
              ? <>En <b>Automático</b> el motor no te pregunta nada: hace y te lo cuenta en la bitácora. Vas a ver "hizo 3 acciones mientras no estabas". Lo que igual no puede tocar son los frenos de abajo.</>
              : modo === 'shared'
                ? <>En <b>Compartido</b> el motor prepara todo y se frena esperándote. Vas a ver "3 decisiones esperan tu OK" en la barra del motor, y podés resolverlas sin salir de Tu día.</>
                : <>En <b>Manual</b> el motor sólo sugiere y acumula propuestas. Vos escribís, publicás y respondés. No gasta nada por su cuenta.</>}
          </div>
        </div>

        <div className="row" style={{ gap: 20, marginTop: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <I_Credit size={22} style={{ color: 'var(--amber)' }} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <Gauge pct={pctCreditos} label="Días de autonomía restantes"
              detalle={`${TENANT.creditos.toLocaleString('es-AR')} de ${TENANT.creditosMes.toLocaleString('es-AR')} créditos`} />
            <div className="bs" style={{ marginTop: 8 }}>
              Con el modo actual el motor trabaja <b style={{ color: 'var(--purple3)' }}>{TENANT.diasAutonomia} días más</b> y se detiene el 5 de octubre.
              El modo Automático consume más: bajaría a 8 días.
            </div>
          </div>
          <Button variant="outline" className="btn-sm" title="Paga el próximo paquete automáticamente al bajar de 500 créditos"
            onClick={() => setToast('Activando auto-recarga (demo)')}><I_Zap size={13} /> Activar auto-recarga</Button>
        </div>
      </Card>

      {/* ============ EXCEPCIONES Y FRENOS ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Settings size={14} style={{ color: 'var(--purple3)' }} /> Excepciones por tipo de acción</span>}
          action={<Badge tone="purple">{EXCEPCIONES.length}</Badge>}
        >
          <div className="exc">
            {EXCEPCIONES.map(e => (
              <div key={e.key} className="exc-row">
                <div className="exc-top">
                  <span className="exc-lb">{e.etiqueta}</span>
                  {e.fijo && <span className="exc-fijo">no se puede apagar</span>}
                  <div className="seg-group">
                    {(['auto', 'shared', 'manual'] as Modo[]).map(m => (
                      <span key={m} className={`seg ${(niveles[e.key] ?? e.nivel) === m ? 'on' : ''} ${e.fijo && m !== 'auto' ? 'locked' : ''}`}
                        onClick={() => cambiar(e.key, m, e.fijo)}>{NOMBRE[m]}</span>
                    ))}
                  </div>
                </div>
                <div className="exc-nota">{e.nota}</div>
              </div>
            ))}
          </div>
          <div className="acc-why">
            No es una sola palanca: <b>el dinero y los clientes tienen su propio nivel</b>.
            Pausar una campaña que se quema va en Automático aunque todo lo demás te pregunte.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Shield size={14} style={{ color: 'var(--green)' }} /> Frenos</span>}
          action={<Badge tone="green">siempre activos</Badge>}
        >
          <div className="guards">
            {FRENOS.map(f => (
              <div key={f.key} className="guard">
                <I_Lock size={14} style={{ color: 'var(--purple3)', flexShrink: 0 }} />
                <span className="guard-lb">{f.etiqueta}<small>{f.porQue}</small></span>
                <span className="guard-val">{f.valor}</span>
              </div>
            ))}
          </div>
          <div className="acc-why">
            Aplican <b>incluso en Automático</b>. Si esto se pudiera desactivar, el modo Automático no debería existir:
            un bug que toca presupuestos sin techo cuesta plata real.
          </div>
          <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Badge tone="green">La autonomía es un techo, no un piso</Badge>
            <Badge tone="purple">La IA puede pedir más control, nunca tomarlo</Badge>
          </div>
        </Card>
      </div>

      {/* ============ CONEXIONES Y CRÉDITOS ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Link size={14} style={{ color: 'var(--green)' }} /> Conexiones</span>}
          action={<Badge tone={porConectar ? 'amber' : 'green'}>{conectadas} de {CONEXIONES.length}</Badge>}
        >
          <div className="bs" style={{ marginBottom: 12 }}>
            Todo lo externo es tuyo: conectás tu propia API, no la nuestra. Cada conexión declara qué <b>capacidades</b> habilita.
          </div>
          {CONEXIONES.map(c => (
            <div key={c.key} style={{ padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="row spread" style={{ marginBottom: 6 }}>
                <span className="row" style={{ gap: 9 }}>
                  <span style={{ fontSize: 17 }}>{c.emoji}</span>
                  <span>
                    <span className="bt">{c.nombre}</span>
                    <span className="tiny muted" style={{ display: 'block' }}>{c.rol}</span>
                  </span>
                </span>
                <Badge tone={c.estado === 'conectada' ? 'green' : c.estado === 'error' ? 'red' : 'muted'}>
                  {c.estado === 'conectada' ? 'conectada' : c.estado === 'error' ? 'vencida' : 'por conectar'}
                </Badge>
              </div>
              <div className="bs">{c.detalle}</div>
              <div className="row" style={{ gap: 7, marginTop: 9, flexWrap: 'wrap' }}>
                {c.capacidades.map(cap => <span key={cap} className="badge badge-muted" style={{ fontSize: 9.5 }}>{cap}</span>)}
              </div>
              <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {c.estado === 'conectada' ? (
                  <>
                    <Button variant="ghost" className="btn-sm" title="Prueba que el token siga vivo, sin guardarlo de nuevo"
                      onClick={() => setToast('Token probado ahora: sigue funcionando (demo)')}><I_Check size={13} /> Probar</Button>
                    <Button variant="ghost" className="btn-sm" title="Reemplaza el token por uno nuevo"
                      onClick={() => setToast('Reemplazar token (demo)')}>Reemplazar</Button>
                  </>
                ) : (
                  <Button className="btn-sm" title="Pegás tu token y lo probamos antes de guardarlo"
                    onClick={() => setToast(`Conectando ${c.nombre} (demo)`)}><I_Link size={13} /> Conectar mi API</Button>
                )}
              </div>
            </div>
          ))}
          <div className="acc-why">
            Las capacidades son lo que el negocio pide (<b>"enviar mensaje", "leer anuncios"</b>), no un proveedor concreto.
            Si mañana cambiás de herramienta, el motor sigue funcionando sin tocar una línea.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Credit size={14} style={{ color: 'var(--amber)' }} /> Créditos</span>}
          action={<Badge tone="amber">{TENANT.creditos.toLocaleString('es-AR')} disponibles</Badge>}
        >
          <div style={{ marginBottom: 16 }}>
            <Gauge pct={100 - pctCreditos} label="Consumo del mes" detalle={`${100 - pctCreditos}% usado`} color="var(--grad)" />
          </div>
          <div className="bs" style={{ marginBottom: 6 }}>Qué consume el motor, en claro:</div>
          <BarRow label="Campañas" valor={180} max={180} color="var(--purple2)" />
          <BarRow label="Análisis IA" valor={40} max={180} color="var(--green)" />
          <BarRow label="Conversaciones" valor={0} max={180} color="var(--muted)" />
          <div className="bs" style={{ marginTop: 8 }}>Las conversaciones no consumen créditos: están incluidas en el plan Pro.</div>

          <div className="guards" style={{ marginTop: 16 }}>
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
          </div>
          <div className="acc-why">
            <b>Días de autonomía</b> es la traducción de los créditos a algo que se entiende:
            cuánto puede seguir trabajando el motor si no recargás.
          </div>
        </Card>
      </div>

      <div className="card" style={{ marginTop: 16, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', background: 'linear-gradient(120deg, rgba(168,85,247,.09), transparent)' }}>
        <I_Sun size={20} style={{ color: 'var(--purple3)' }} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="bt">Podés cambiar el modo en cualquier momento</div>
          <div className="bs" style={{ marginTop: 4 }}>
            Si te cansa aprobar, pasás a Automático. Si algo te asusta, volvés a Compartido.
            <b> Nada de lo que el motor hizo se pierde al cambiar de modo.</b>
          </div>
        </div>
        <Button variant="outline" className="btn-sm" title="Muestra los cambios de modo que hiciste y cuándo"
          onClick={() => setToast('Historial de cambios de modo (demo)')}>Ver historial</Button>
      </div>
    </div>
  );
}
