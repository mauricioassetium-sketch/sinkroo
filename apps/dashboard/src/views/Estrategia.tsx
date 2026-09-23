import { Card, Badge } from '../components/sinkroo/ui';
import { I_Sparkle, I_Target, I_Star, I_Shield, I_Checklist, I_Trend, I_Zap } from '../components/sinkroo/icons';
import { LineChart } from '../components/sinkroo/charts';

// ===== Objetivo de la estrategia =====
const OBJETIVO = {
  titulo: 'Ser la marca de skincare natural accesible de referencia en Buenos Aires',
  porQue: 'El mercado valora los ingredientes limpios pero el precio premium lo deja fuera del alcance de la mayoría. Tu marca se ubica exactamente en ese hueco: calidad de premium a precio justo.',
  mision: 'Resultados reales con ingredientes limpios, a un precio que no castigue al cliente.',
  vision: 'En 12 meses, ser top 3 en recordación de marca D2C de skincare en tu zona.',
};

// ===== Modelo estratégico (marcos aplicados) =====
const MARCOS = [
  { t: 'Posicionamiento', f: 'Estrategia de nicho (Porter)', d: 'Competís por diferenciación, no por precio. Ingredientes limpios + precio justo te separan del premium y de lo económico.', icono: '🎯', pct: 100 },
  { t: 'Segmentación', f: 'Modelo STP', d: 'Segmentar (mujeres 25-45), elegir el Target (preocupadas por ingredientes y precio) y Posicionar (natural accesible).', icono: '👥', pct: 85 },
  { t: 'Propuesta de valor', f: 'Value Proposition Canvas', d: 'Dolores: miedo a ingredientes agresivos y a pagar de más. Tu oferta: fórmula limpia + garantía de 30 días.', icono: '💎', pct: 65 },
  { t: 'Crecimiento', f: 'Matriz de Ansoff', d: 'Penetración de mercado con el portfolio actual, luego desarrollo de producto (sérum, SPF) sobre la misma base de clientas.', icono: '📈', pct: 40 },
  { t: 'Ejecución', f: 'Funnel D2C', d: 'Meta Ads capta → WhatsApp cierra y fideliza → referidos crecen. Cada canal cumple un rol en la conversión.', icono: '🚀', pct: 25 },
];

const PILARES = [
  { t: 'Ingredientes limpios', d: 'Fórmulas sin parabenos, sin fragancias artificiales. El core de la promesa de marca.', pct: 90 },
  { t: 'Precio justo', d: 'Calidad premium a precio accesible. La barrera competitiva contra marcas caras.', pct: 80 },
  { t: 'Prueba social', d: 'Testimonios y before/after reales. Lo que convierte la promesa en confianza.', pct: 45 },
  { t: 'Comunidad', d: 'Clientas que recomiendan. El motor de referidos y retención a largo plazo.', pct: 20 },
];

const KPIS = [
  { t: 'Madurez de la estrategia', v: '54%', nota: 'A mitad del M2: posicionamiento definido, ejecución y canales por arrancar.', up: true },
  { t: 'Claridad de posicionamiento', v: 'Alta', nota: 'El gap "natural accesible" está bien diferenciado del resto de la competencia.', up: true },
  { t: 'Riesgo de commoditización', v: 'Medio', nota: 'Tienda Norte tira el precio abajo. Mitigación: diferenciar por historia, no por precio.', up: false },
  { t: 'Ventaja competitiva sostenible', v: 'Débil', nota: 'La fórmula y la comunidad aún no son fosos defensivos. Requieren foco urgente.', up: false },
];

// ===== Acciones estratégicas (protagonistas) =====
const ACCIONES = [
  { n: 1, t: 'Lanzar campaña de "ingredientes limpios"', d: 'Subir el precio percibido con storytelling de fórmula limpia. Es la acción que más impacto tiene hoy en el posicionamiento.', canal: 'Meta Ads', impacto: 'Alto', plazo: '1-2 semanas', color: '#a855f7' },
  { n: 2, t: 'Definir los 3 mensajes clave de marca', d: 'Un solo mensaje central y dos de soporte que se repitan en todos los canales, para fijar la promesa en la mente.', canal: 'Brand + IA', impacto: 'Alto', plazo: '1 semana', color: '#a855f7' },
  { n: 3, t: 'Armar prueba social (20 testimonios)', d: 'Antes de escalar ads, juntar before/after y reseñas reales. Es lo que convierte la promesa en confianza.', canal: 'WhatsApp + email', impacto: 'Medio', plazo: '2-3 semanas', color: '#c084fc' },
  { n: 4, t: 'Configurar cierre por WhatsApp', d: 'Plantilla de oferta + seguimiento automático para convertir la captación en venta.', canal: 'WhatsApp', impacto: 'Medio', plazo: '1-2 días', color: '#c084fc' },
];

const RIESGOS = [
  { t: 'Guerra de precios', d: 'Tienda Norte baja precios (-15%). Si la seguís, perdés margen y te commoditizás.', nivel: 'Alto', color: '#ef4444' },
  { t: 'Dependencia de Meta Ads', d: 'Todo el tráfico sale de un solo canal. Diversificar a TikTok y orgánico.', nivel: 'Medio', color: '#f59e0b' },
  { t: 'Falta de prueba social', d: 'Sin testimonios suficientes, la promesa de "30 días" no genera confianza.', nivel: 'Medio', color: '#f59e0b' },
];

export default function Estrategia() {
  return (
    <>
      <div className="hdr"><div><div className="hdr-t">Estrategia</div><div className="hdr-s">Módulo M2: posicionamiento y roadmap.</div></div><Badge tone="green">En curso</Badge></div>

      {/* Acciones estratégicas (protagonistas) */}
      <Card title="Acciones estratégicas" action={<I_Checklist size={17} />}>
        <div className="tiny muted" style={{ marginTop: -2, marginBottom: 16, lineHeight: 1.5 }}>
          Las <strong style={{ color: '#c084fc' }}>4 jugadas clave</strong> que se van a ejecutar para cerrar el M2. Cada una con su prioridad, canal e impacto esperado.
        </div>
        <div className="estra-acc-grid">
          {ACCIONES.map(a => (
            <div key={a.n} className="estra-acc-card" style={{ borderColor: `${a.color}44` }}>
              <div className="estra-acc-num" style={{ background: `linear-gradient(135deg, ${a.color}, #7c3aed)`, boxShadow: `0 6px 18px ${a.color}55` }}>{a.n}</div>
              <div className="small" style={{ fontWeight: 700, lineHeight: 1.3 }}>{a.t}</div>
              <div className="tiny muted" style={{ lineHeight: 1.45, marginTop: 6, flex: 1 }}>{a.d}</div>
              <div className="estra-acc-meta">
                <span className="estra-pill">{a.canal}</span>
                <span className="estra-pill" style={{ color: a.impacto === 'Alto' ? 'var(--green)' : 'var(--amber)' }}>Impacto {a.impacto}</span>
                <span className="estra-pill">{a.plazo}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Objetivo de la estrategia */}
      <Card title="Qué busca tu estrategia" action={<I_Target size={16} />}>
        <div className="estra-obj">
          <div className="estra-obj-main">
            <div className="estra-obj-titulo">{OBJETIVO.titulo}</div>
            <p className="small muted" style={{ lineHeight: 1.6, marginTop: 8 }}>{OBJETIVO.porQue}</p>
          </div>
          <div className="estra-obj-cols">
            <div className="estra-obj-col">
              <div className="tiny muted" style={{ fontWeight: 700 }}>Misión</div>
              <div className="small" style={{ marginTop: 4, lineHeight: 1.45 }}>{OBJETIVO.mision}</div>
            </div>
            <div className="estra-obj-col">
              <div className="tiny muted" style={{ fontWeight: 700 }}>Visión (12 meses)</div>
              <div className="small" style={{ marginTop: 4, lineHeight: 1.45 }}>{OBJETIVO.vision}</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid-2 mt-16">
        {/* Modelo estratégico */}
        <Card title="Modelo estratégico" action={<I_Star size={16} />}>
          <div className="tiny muted" style={{ marginTop: -2, marginBottom: 14, lineHeight: 1.5 }}>
            Los marcos reales que aplica Sinkroo para armar tu estrategia, con el avance de cada decisión.
          </div>
          <div className="estra-list">
            {MARCOS.map(m => (
              <div key={m.t} className="estra-step">
                <div className="estra-step-top">
                  <span className="estra-ico" style={{ background: 'rgba(168,85,247,.14)', color: '#c084fc' }}>{m.icono}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="small" style={{ fontWeight: 700 }}>{m.t}</div>
                    <div className="tiny" style={{ color: '#c084fc', fontWeight: 600, marginTop: 1 }}>{m.f}</div>
                    <div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 3 }}>{m.d}</div>
                  </div>
                </div>
                <div className="estra-bar"><div className="estra-bar-fill" style={{ width: `${m.pct}%` }} /></div>
                <div className="tiny muted" style={{ textAlign: 'right', marginTop: 2 }}>{m.pct}%</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid-col">
          {/* Pilares de marca */}
          <Card title="Pilares de tu marca">
            <div className="tiny muted" style={{ marginTop: -2, marginBottom: 14, lineHeight: 1.5 }}>
              Los 4 pilares que sostienen el posicionamiento. La barra muestra cuán desarrollados están hoy.
            </div>
            {PILARES.map(p => (
              <div key={p.t} style={{ marginBottom: 14 }}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="small" style={{ fontWeight: 600 }}>{p.t}</span>
                  <span className="tiny muted">{p.pct}%</span>
                </div>
                <div className="estra-bar"><div className="estra-bar-fill" style={{ width: `${p.pct}%` }} /></div>
                <div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 4 }}>{p.d}</div>
              </div>
            ))}
          </Card>

          {/* Análisis IA */}
          <Card title="Análisis IA" action={<I_Sparkle size={16} />}>
            <div className="ai-result">
              <div className="row"><I_Sparkle size={18} /><span style={{ fontWeight: 700 }}>Resumen estratégico</span></div>
              <p className="small muted" style={{ lineHeight: 1.6, marginTop: 8 }}>
                Tu marca tiene un <b style={{ color: 'var(--purple4)' }}>gap claro</b>: competís por debajo del premium pero con calidad superior a lo económico.
                La IA recomienda <b>subir el precio percibido</b> con storytelling de ingredientes y prueba social, sin tocar el precio real.
              </p>
            </div>

            <div className="ai-sec-t">Recomendaciones priorizadas</div>
            <div className="ai-recs">
              <div className="ai-rec"><span className="ai-rec-n">1</span><div><div className="small" style={{ fontWeight: 700 }}>Subir el precio percibido</div><div className="tiny muted" style={{ lineHeight: 1.45 }}>Storytelling de fórmula limpia en todas las piezas de marca. Sin tocar el precio real.</div></div></div>
              <div className="ai-rec"><span className="ai-rec-n">2</span><div><div className="small" style={{ fontWeight: 700 }}>Cerrar con prueba social</div><div className="tiny muted" style={{ lineHeight: 1.45 }}>20 testimonios y before/after antes de escalar la inversión en ads.</div></div></div>
              <div className="ai-rec"><span className="ai-rec-n">3</span><div><div className="small" style={{ fontWeight: 700 }}>Fidelizar por WhatsApp</div><div className="tiny muted" style={{ lineHeight: 1.45 }}>Seguimiento post-compra con guía de uso. Es el canal con mejor conversión.</div></div></div>
            </div>

            <div className="ai-sec-t">Lectura de tu posición</div>
            <div className="ai-grid-2">
              <div className="ai-box ai-box-pos">
                <div className="ai-box-t"><I_Trend size={13} /> Fortalezas</div>
                <div className="ai-li">Fórmula limpia diferenciada</div>
                <div className="ai-li">Precio justo vs premium</div>
                <div className="ai-li">Canal directo con margen</div>
              </div>
              <div className="ai-box ai-box-neg">
                <div className="ai-box-t"><I_Shield size={13} /> A reforzar</div>
                <div className="ai-li">Prueba social escasa</div>
                <div className="ai-li">Comunidad por activar</div>
                <div className="ai-li">Dependencia de Meta Ads</div>
              </div>
            </div>

            <div className="ai-foot"><I_Zap size={13} /><span className="tiny muted">Análisis sobre tu diagnóstico, competencia y pilares. Se actualiza al completar cada módulo.</span></div>
          </Card>
        </div>
      </div>

      {/* Métricas + gráfico */}
      <div className="grid-2 mt-16">
        <Card title="Madurez del posicionamiento">
          <div className="tiny muted" style={{ marginTop: -2, marginBottom: 12, lineHeight: 1.5 }}>
            Evolución de la claridad de tu posicionamiento a medida que avanzás en el M2.
          </div>
          <LineChart data={[15, 22, 30, 42, 54]} stroke="#a855f7" height={170} />
          <div className="tiny muted" style={{ marginTop: 8 }}>
            Punto actual: <strong style={{ color: '#c084fc' }}>54% de madurez</strong>. Posicionamiento definido, canales por ejecutar.
          </div>
        </Card>

        <Card title="Métricas clave">
          <div className="estra-kpis-col">
            {KPIS.map(k => (
              <div key={k.t} className="estra-kpi-row">
                <div style={{ flex: 1 }}>
                  <div className="small" style={{ fontWeight: 600 }}>{k.t}</div>
                  <div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 2 }}>{k.nota}</div>
                </div>
                <div className="estra-kpi-v" style={{ color: k.up ? 'var(--green)' : 'var(--amber)' }}>{k.v}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Riesgos */}
      <Card title="Riesgos de la estrategia" action={<I_Shield size={16} />} className="mt-16">
          <div className="tiny muted" style={{ marginTop: -2, marginBottom: 14, lineHeight: 1.5 }}>
            Lo que puede descarrilar tu posicionamiento si no se gestiona a tiempo.
          </div>
          {RIESGOS.map(r => (
            <div key={r.t} className="estra-riesgo">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="small" style={{ fontWeight: 700 }}>{r.t}</span>
                <span className="estra-nivel" style={{ color: r.color, borderColor: `${r.color}55`, background: `${r.color}14` }}>{r.nivel}</span>
              </div>
              <div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 4 }}>{r.d}</div>
            </div>
          ))}
        </Card>
    </>
  );
}
