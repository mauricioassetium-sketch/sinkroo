import { Card, Badge, Button } from '../components/ui';
import { I_Globe, I_Trend, I_Star, I_Eye, I_Zap, I_Check, I_ArrowRight, I_Plus } from '../components/icons';
import { COMPETIDORES, ANGULOS, TENDENCIAS } from '../data/demo';

export function ViewMercado({ setToast }: { setToast: (t: string) => void }) {
  return (
    <>
      {/* ============ HALLAZGO PRINCIPAL ============ */}
      <div className="alarm oportunidad">
        <div className="alarm-head">
          <span className="alarm-sev oportunidad">LO QUE ENCONTRÓ LUX HOY</span>
          <span className="alarm-title">Tu competidor más cercano bajó precios y se fue a video</span>
          <span className="alarm-when">hace 12 min · 47 anuncios leídos</span>
        </div>
        <div className="alarm-money">
          <span className="ico" style={{ color: 'var(--purple3)' }}><I_Trend size={14} /></span>
          <span><b style={{ color: 'var(--purple3)' }}>Por qué importa: </b>Tienda Norte pasó de 6 a 14 anuncios activos en 30 días y
            bajó de $34 a $29. Si te sigue en precio, te saca el tráfico frío que hoy te cuesta $2,10 el clic.</span>
        </div>
        <div className="alarm-sug"><b>Qué sugiere: </b>no bajar el precio — diferenciar con el ángulo "ingredientes limpios" y con prueba social, que es donde el panel dice que estás débil.</div>
        <div className="alarm-acts">
          <Button className="btn-sm" onClick={() => setToast('Nia prepara 6 variantes del ángulo limpio (demo)')}>
            <I_Plus size={13} /> Que Nia ataque por ahí
          </Button>
          <Button variant="ghost" className="btn-sm" onClick={() => setToast('Informe completo (demo)')}>Ver el informe completo</Button>
        </div>
      </div>

      {/* ============ COMPETENCIA ============ */}
      <div className="csec">
        <span className="csec-n">1</span>
        <span className="csec-t">Quién está pautando</span>
        <span className="csec-s">Datos de la biblioteca pública de anuncios de Meta — gratis, sin API key</span>
      </div>
      <Card action={<Badge tone="purple">47 anuncios analizados</Badge>}>
        {COMPETIDORES.map(c => (
          <div key={c.nombre} className="pv" style={{ background: c.propio ? 'rgba(168,85,247,.07)' : 'transparent', borderRadius: 10, paddingLeft: 10, paddingRight: 10 }}>
            <div className="pv-av" style={{ background: c.propio ? 'var(--purple2)' : 'var(--bg3)', border: c.propio ? 'none' : '1px solid var(--border2)', color: c.propio ? '#fff' : 'var(--muted)' }}>
              {c.propio ? '★' : c.nombre[0]}
            </div>
            <div className="pv-body">
              <div className="pv-head">
                <span className="pv-name">{c.nombre}</span>
                {c.propio && <Badge tone="purple">vos</Badge>}
                <Badge tone={c.gasto === 'alto' ? 'red' : c.gasto === 'medio' ? 'amber' : 'muted'}>gasto {c.gasto}</Badge>
                <span className="pv-score" style={{ fontSize: 15 }}>
                  {c.anuncios} <span className="tiny muted" style={{ fontWeight: 500 }}>anuncios</span>
                </span>
              </div>
              <div className="pv-bar"><span style={{ width: `${Math.min(c.anuncios * 7, 100)}%`, background: c.propio ? 'var(--purple2)' : 'var(--border2)' }} /></div>
              <div className="pv-why" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span>Precio típico: <b style={{ color: 'var(--txt)' }}>${c.precio}</b></span>
                <span>Leads/mes estimados: <b style={{ color: 'var(--txt)' }}>{c.leads}</b></span>
                <span style={{ color: c.tend === 'up' ? 'var(--red)' : c.tend === 'down' ? 'var(--green)' : 'var(--muted)' }}>
                  {c.tend === 'up' ? '↑ subiendo' : c.tend === 'down' ? '↓ bajando' : '→ estable'}
                </span>
              </div>
            </div>
          </div>
        ))}
        <div className="tiny muted" style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5 }}>
          <I_Check size={13} style={{ flexShrink: 0, marginTop: 2 }} />
          Esta pantalla antes pedía Google Maps con facturación de GCP. Se reemplazó por la biblioteca pública de
          anuncios de Meta: es gratis, no necesita API key y — a diferencia del mapa — dice qué está haciendo tu
          competencia, no dónde queda su oficina.
        </div>
      </Card>

      {/* ============ ÁNGULOS ============ */}
      <div className="csec">
        <span className="csec-n">2</span>
        <span className="csec-t">Qué ángulos están funcionando en tu nicho</span>
        <span className="csec-s">De qué habla el mercado cuando vende lo que vos vendés</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 13 }}>
        {ANGULOS.map(a => (
          <Card key={a.nombre}>
            <div className="row spread">
              <span style={{ fontWeight: 800, fontSize: 14 }}>{a.nombre}</span>
              <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--purple3)' }}>{a.pct}%</span>
            </div>
            <div className="pv-bar" style={{ marginTop: 10 }}><span style={{ width: `${a.pct * 2.2}%`, background: 'var(--grad)' }} /></div>
            <div className="pv-why" style={{ marginTop: 9 }}>«{a.ej}»</div>
          </Card>
        ))}
      </div>

      {/* ============ TENDENCIAS ============ */}
      <div className="csec">
        <span className="csec-n">3</span>
        <span className="csec-t">Para dónde va la demanda</span>
        <span className="csec-s">Últimos 30 días en tu zona</span>
      </div>
      <Card>
        {TENDENCIAS.map(t => (
          <div key={t.label} className="pv">
            <div className="pv-body">
              <div className="pv-head">
                <span className="pv-name">{t.label}</span>
                <Badge tone="muted">{t.tag}</Badge>
                <span className="pv-score" style={{ color: t.up ? 'var(--green)' : 'var(--amber)', fontSize: 16 }}>{t.num}</span>
              </div>
              <div className="pv-bar"><span style={{ width: t.width, background: t.up ? 'var(--green)' : 'var(--amber)' }} /></div>
            </div>
          </div>
        ))}
      </Card>

      {/* ============ SOBRE EL MAPA ============ */}
      <div className="csec">
        <span className="csec-n">?</span>
        <span className="csec-t">¿Y el mapa?</span>
        <span className="csec-s">La decisión de producto que tomamos</span>
      </div>
      <Card>
        <div className="strike-list">
          <div className="strike-item">
            <I_Eye size={14} />
            <span><b style={{ color: 'var(--txt)' }}>El mapa era lo más vistoso y lo menos accionable.</b> Saber dónde están las
              tiendas de tu competencia no cambia ninguna decisión de campaña. Saber que bajaron 15% y se fueron a video, sí.</span>
          </div>
          <div className="strike-item">
            <I_Zap size={14} />
            <span><b style={{ color: 'var(--txt)' }}>Costo cero contra costo mensual.</b> Google Maps exige cuenta de GCP con
              facturación activa; la biblioteca de anuncios de Meta es pública y gratis.</span>
          </div>
          <div className="strike-item">
            <I_Star size={14} />
            <span><b style={{ color: 'var(--txt)' }}>Si algún día querés el mapa, entra como integración BYO.</b> No se
              descarta para siempre: se saca del camino crítico. El usuario conecta su propia API de Google si la quiere.</span>
          </div>
        </div>
        <div className="row" style={{ marginTop: 14, gap: 9, flexWrap: 'wrap' }}>
          <Button variant="outline" className="btn-sm" onClick={() => setToast('Conectar Google Maps como integración BYO (demo)')}>
            <I_Globe size={13} /> Quiero conectarlo igual
          </Button>
          <Button variant="ghost" className="btn-sm" onClick={() => setToast('Tendencia de 90 días (demo)')}>
            Ver 90 días <I_ArrowRight size={13} />
          </Button>
        </div>
      </Card>
    </>
  );
}
