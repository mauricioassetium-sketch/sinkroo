import { useState, useEffect, useRef } from 'react';
import { Card, Badge } from '../components/sinkroo/ui';
import { LineChart } from '../components/sinkroo/charts';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ===== Productos del cliente (en campana) =====
const PRODUCTOS = [
  { id: 'p1', nombre: 'Crema Facial Hidratante', emoji: '🧴', precio: '$34', cat: 'Skincare' },
  { id: 'p2', nombre: 'Serum Vitamina C', emoji: '✨', precio: '$42', cat: 'Skincare' },
  { id: 'p3', nombre: 'Gel Limpiador', emoji: '🧼', precio: '$26', cat: 'Skincare' },
  { id: 'p4', nombre: 'Protector Solar SPF50', emoji: '🌞', precio: '$31', cat: 'Skincare' },
];

// ===== Comercios similares / competidores en el mapa (offsets lat/lng) =====
const COMERCIOS = [
  { id: 't', nombre: 'Tu local', tipo: 'Tu', dlat: 0, dlng: 0, dist: 0 },
  { id: 'c1', nombre: 'Tienda Norte', tipo: 'Competidor', dlat: 0.012, dlng: -0.016, dist: 1.2 },
  { id: 'c2', nombre: 'Belleza & Co', tipo: 'Competidor', dlat: 0.020, dlng: 0.014, dist: 1.8 },
  { id: 'c3', nombre: 'Green Beauty', tipo: 'Competidor', dlat: -0.010, dlng: 0.022, dist: 2.4 },
  { id: 'c4', nombre: 'DermaMarket', tipo: 'Competidor', dlat: -0.018, dlng: -0.024, dist: 2.9 },
  { id: 'c5', nombre: 'Farmacia Central', tipo: 'Similar', dlat: -0.024, dlng: 0.006, dist: 1.5 },
  { id: 'c6', nombre: 'Glow Studio', tipo: 'Similar', dlat: 0.024, dlng: -0.008, dist: 2.2 },
];

// ===== Ciudad seleccionada (prioridad = la del negocio) =====
const CIUDADES = ['Buenos Aires', 'Cordoba', 'Rosario', 'Mendoza'];

// Coordenadas del local segun ciudad ([lat, lng])
const COORDENADAS: Record<string, [number, number]> = {
  'Buenos Aires': [-34.6037, -58.3816],
  'Cordoba': [-31.4201, -64.1888],
  'Rosario': [-32.9442, -60.6505],
  'Mendoza': [-32.8895, -68.8458],
};

// ===== Competencia: precios + leads + contexto =====
const COMPETENCIA = [
  { nombre: 'Tu marca', precio: 34, leads: 48, propio: true, tend: 'up', varP: '+2%', pos: '4°', nota: 'Precio competitivo en gama media-baja. Buen margen para subir leads.' },
  { nombre: 'Marca A', precio: 39, leads: 82, tend: 'up', varP: '+4%', pos: '1°', nota: 'Lider absoluto en leads. Precio $5 mayor pero invierte mas en ads.' },
  { nombre: 'Marca B', precio: 29, leads: 61, tend: 'flat', varP: '0%', pos: '2°', nota: 'El mas barato del mercado. Gana por precio, pierde por margen.' },
  { nombre: 'Marca C', precio: 59, leads: 22, tend: 'down', varP: '-3%', pos: '5°', nota: 'Lujo boutique. Pocos leads pero alto valor por venta.' },
  { nombre: 'Marca D', precio: 44, leads: 37, tend: 'up', varP: '+1%', pos: '3°', nota: 'Crecimiento lento. Capta leads de nicho premium.' },
];

// ===== Publicaciones en redes con mayor lead =====
const PUBLICACIONES = [
  { red: 'Instagram', color: '#e11d48', autor: '@glow.studio', detalle: 'Reel "Rutina 3 pasos"', leads: 1240, cpl: '$3.10', ctr: '3.2%', tend: 'up', nota: 'Reel corto de rutina. Formato con mayor CTR del top. Ideal de replicar.', img: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400&q=80', url: 'https://instagram.com/glow.studio' },
  { red: 'TikTok', color: '#6366f1', autor: '@tienda.norte', detalle: 'Before/after serum C', leads: 980, cpl: '$3.80', ctr: '2.9%', tend: 'up', nota: 'Contenido de transformacion. Muy compartido en TikTok.', img: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&q=80', url: 'https://tiktok.com/@tienda.norte' },
  { red: 'Instagram', color: '#e11d48', autor: '@belleza.co', detalle: 'Carrusel "Top 5 hidratantes"', leads: 760, cpl: '$4.20', ctr: '2.4%', tend: 'flat', nota: 'Carrusel educativo. Buen volumen, conversion media.', img: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&q=80', url: 'https://instagram.com/belleza.co' },
  { red: 'Facebook', color: '#2563eb', autor: '@dermamarket', detalle: 'Anuncio 20% OFF', leads: 640, cpl: '$5.10', ctr: '1.8%', tend: 'down', nota: 'Promo de descuento. Atrae volumen pero lead caro y de menor calidad.', img: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80', url: 'https://facebook.com/dermamarket' },
];

// ===== Tendencias del sector (enriquecida) =====
const TENDENCIAS = [
  { label: 'Demanda de "serum vitamina C"', num: '+32%', up: true, width: '78%', detalle: 'El termino que mas crece en busquedas de la zona. Impulsado por reels de rutina y contenido de transformacion.', tag: 'Busqueda' },
  { label: 'Crecimiento D2C skincare (interanual)', num: '+24%', up: true, width: '62%', detalle: 'Las marcas directas al consumidor ganan terreno frente al retail tradicional en LATAM.', tag: 'Mercado' },
  { label: 'Tamano del mercado LATAM', num: '$1.2B', up: true, width: '70%', detalle: 'Valor total del mercado de skincare en la region, con proyeccion de crecimiento sostenido.', tag: 'Mercado' },
  { label: 'Precio promedio de Tienda Norte', num: '-15%', up: false, width: '55%', detalle: 'Tu competidor directo bajo precios hoy. Vigilar: puede reactivar su guerra de descuentos.', tag: 'Competencia' },
  { label: 'Formato "before/after" en alza', num: '+41%', up: true, width: '88%', detalle: 'El contenido de transformacion es el que mas engagement genera. 3.1x mas CTR que los carruseles.', tag: 'Formato' },
  { label: 'Busquedas de "protector solar SPF"', num: '+19%', up: true, width: '48%', detalle: 'Crece la conversacion sobre SPF. Tu competencia aun no lo capitaliza: oportunidad clara.', tag: 'Busqueda' },
];

// ===== Logos SVG de redes sociales =====
function RedLogo({ red, size = 24 }: { red: string; size?: number }) {
  // Logos oficiales a todo color (fondo de marca + icono blanco)
  if (red === 'Instagram') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Instagram">
        <defs>
          <linearGradient id="igGrad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#f9ce34" />
            <stop offset="30%" stopColor="#ee2a7b" />
            <stop offset="65%" stopColor="#6228d7" />
          </linearGradient>
        </defs>
        <rect width="24" height="24" rx="6" fill="url(#igGrad)" />
        <rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="#fff" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.4" fill="none" stroke="#fff" strokeWidth="1.8" />
        <circle cx="16.4" cy="7.6" r="1.15" fill="#fff" />
      </svg>
    );
  }
  if (red === 'TikTok') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-label="TikTok">
        <rect width="24" height="24" rx="6" fill="#010101" />
        <path d="M16.7 4.2c.4 2 1.8 3.4 3.8 3.7v2.7c-1.5 0-2.8-.5-3.8-1.3v5.9c0 3.2-2.2 5.3-5.2 5.3-2.9 0-5.1-2.1-5.1-4.9 0-2.7 2.3-4.9 5.2-4.8v2.9c-1.3-.2-2.3.7-2.3 1.9 0 1.2.9 2.1 2.2 2.1 1.4 0 2.4-1 2.4-2.6V4.2h2.8z" fill="#25F4EE" />
        <path d="M16.7 4.2c.4 2 1.8 3.4 3.8 3.7v2.7c-1.5 0-2.8-.5-3.8-1.3v5.9c0 3.2-2.2 5.3-5.2 5.3-2.9 0-5.1-2.1-5.1-4.9 0-2.7 2.3-4.9 5.2-4.8v2.9c-1.3-.2-2.3.7-2.3 1.9 0 1.2.9 2.1 2.2 2.1 1.4 0 2.4-1 2.4-2.6V4.2h2.8z" fill="#FE2C55" transform="translate(0.6 0.6)" opacity=".9" />
      </svg>
    );
  }
  if (red === 'Facebook') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Facebook">
        <rect width="24" height="24" rx="6" fill="#1877F2" />
        <path d="M15.5 13.5l.4-2.6h-2.4V9.2c0-.7.3-1.4 1.5-1.4h1.2V5.5s-1.1-.2-2.1-.2c-2.1 0-3.5 1.3-3.5 3.6v2h-2.4v2.6h2.4V20h3V13.5h1.9z" fill="#fff" />
      </svg>
    );
  }
  if (red === 'YouTube') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-label="YouTube">
        <rect width="24" height="24" rx="6" fill="#FF0000" />
        <path d="M19.6 8.2c-.2-.7-.7-1.3-1.5-1.5C16.8 6.3 12 6.3 12 6.3s-4.8 0-6.1.4c-.7.2-1.3.8-1.5 1.5C4 9.5 4 12 4 12s0 2.5.4 3.8c.2.7.7 1.3 1.5 1.5 1.3.4 6.1.4 6.1.4s4.8 0 6.1-.4c.7-.2 1.3-.8 1.5-1.5.4-1.3.4-3.8.4-3.8s0-2.5-.4-3.8z" fill="#fff" />
        <path d="M10.5 14.5v-5l4 2.5-4 2.5z" fill="#FF0000" />
      </svg>
    );
  }
  if (red === 'X') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-label="X">
        <rect width="24" height="24" rx="6" fill="#000" />
        <path d="M6 6l5.2 6.8L6.3 18h2.2l3.9-4.3 3.3 4.3h2.5l-5.5-7.2L17.6 6h-2.2l-3.6 4-3-4H6z" fill="#fff" />
      </svg>
    );
  }
  return null;
}

// ===== Hallazgos de la IA / agentes =====
const HALLAZGOS = [
  { icono: '🕵️', color: '#c084fc', titulo: 'Tienda Norte bajo precios 15%', detalle: 'Detectado hoy 09:42. Reaccionaron a tu campana de lanzamiento.', tag: 'Competencia' },
  { icono: '📈', color: '#22c55e', titulo: 'Demanda de serum vit C +32%', detalle: 'Tendencia en alza en tu zona, ultimas 2 semanas.', tag: 'Tendencia' },
  { icono: '🔥', color: '#f472b6', titulo: 'Formato viral: rutina 60s', detalle: 'Los reels de rutinas rapidas tienen 3.1x mas CTR.', tag: 'Formato' },
  { icono: '💬', color: '#4ade80', titulo: '12 clientes preguntan por SPF', detalle: 'Tu protector solar genera mas conversaciones que la competencia.', tag: 'Oportunidad' },
];

export default function Mercado() {
  const [ciudad, setCiudad] = useState(CIUDADES[0]);
  const [producto, setProducto] = useState(PRODUCTOS[0]);
  const maxLead = Math.max(...COMPETENCIA.map(c => c.leads));

  return (
    <>
      <div className="hdr">
        <div>
          <div className="hdr-t">Mercado</div>
          <div className="hdr-s">Modulo M1: analisis de mercado, competencia y demanda en tiempo real.</div>
        </div>
        <Badge tone="purple">Actualizado hoy · 09:47</Badge>
      </div>

      {/* Selectores: ciudad + producto */}
      <div className="mkt-selectors">
        <div className="mkt-sel">
          <label className="mkt-sel-label">📍 Ciudad prioritaria</label>
          <div className="mkt-sel-row">
            {CIUDADES.map(c => (
              <button key={c} className={`mkt-chip ${ciudad === c ? 'mkt-chip-on' : ''}`} onClick={() => setCiudad(c)}>{c}</button>
            ))}
          </div>
        </div>
        <div className="mkt-sel">
          <label className="mkt-sel-label">📦 Producto en campana</label>
          <div className="mkt-sel-row">
            {PRODUCTOS.map(p => (
              <button key={p.id} className={`mkt-chip ${producto.id === p.id ? 'mkt-chip-on' : ''}`} onClick={() => setProducto(p)}>
                {p.emoji} {p.nombre}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fila 1: Mapa de calor + precios/leads */}
      <div className="grid-2 mt-16">
        <Card className="mkt-fill" title="Mapa de calor del mercado" action={<Badge tone="muted">{ciudad}</Badge>}>
          <div className="tiny muted" style={{ marginTop: -2, marginBottom: 12, lineHeight: 1.5 }}>
            Radiacion de cobertura desde tu local hacia toda la zona. Los puntos marcados son negocios que venden productos similares.
          </div>
          <Heatmap ciudad={ciudad} com={COMERCIOS} />
          <div className="mkt-legend">
            <span className="mkt-legend-item"><span className="mkt-lg" style={{ background: '#a855f7' }} /> Tu local</span>
            <span className="mkt-legend-item"><span className="mkt-lg" style={{ background: '#ef4444' }} /> Competidor</span>
            <span className="mkt-legend-item"><span className="mkt-lg" style={{ background: '#f59e0b' }} /> Similar</span>
            <span className="mkt-legend-item"><span className="mkt-lg mkt-lg-heat" /> Zona de alta demanda</span>
          </div>
        </Card>

        <Card title="Competencia: precios vs leads" action={<Badge tone="amber">vs. 5 marcas</Badge>}>
          <div className="tiny muted" style={{ marginTop: -2, marginBottom: 14, lineHeight: 1.5 }}>
            Analisis del <strong style={{ color: '#e9d5ff' }}>{producto.nombre.toLowerCase()}</strong> frente a la competencia. El precio se compara con los <strong style={{ color: '#c084fc' }}>leads semanales</strong> que capta cada marca (el tamano de la barra) y su tendencia de precio.
          </div>
          {COMPETENCIA.map(c => {
            const tendColor = c.tend === 'up' ? 'var(--green)' : c.tend === 'down' ? 'var(--red)' : 'var(--muted)';
            const tendArrow = c.tend === 'up' ? '▲' : c.tend === 'down' ? '▼' : '▬';
            return (
              <div key={c.nombre} className={`comp-card ${c.propio ? 'comp-card-propio' : ''}`}>
                <div className="comp-head">
                  <div className="comp-head-left">
                    <span className="comp-name" style={{ color: c.propio ? 'var(--purple4)' : 'var(--txt)' }}>{c.nombre}</span>
                    <span className="comp-pos">{c.pos}</span>
                  </div>
                  <div className="comp-price">
                    <span className="comp-price-cur">$</span>
                    <span className="comp-price-num">{c.precio}</span>
                    <span className="comp-price-var" style={{ color: tendColor }}>{tendArrow} {c.varP}</span>
                  </div>
                </div>
                <div className="comp-bar-wrap">
                  <div className="comp-bar" style={{ width: `${(c.leads / maxLead) * 100}%`, background: c.propio ? 'linear-gradient(90deg,#a855f7,#c084fc)' : 'linear-gradient(90deg,#7c3aed,#a855f7)' }}>
                    <span className="comp-bar-val">{c.leads} leads</span>
                  </div>
                </div>
                <div className="comp-nota tiny muted">{c.nota}</div>
              </div>
            );
          })}
          <div className="tiny muted" style={{ marginTop: 14, lineHeight: 1.5, padding: '12px', borderRadius: '10px', background: 'rgba(168,85,247,.06)', border: '1px solid var(--border2)' }}>
            💡 <strong style={{ color: '#c084fc' }}>Lectura estrategica:</strong> tu <strong style={{ color: '#e9d5ff' }}>${producto && PRODUCTOS.find(pp => pp.id === producto.id)?.precio}</strong> esta en la gama media-baja y captas el <strong style={{ color: '#e9d5ff' }}>4° lugar en leads</strong>. Marca A lidera con $5 mas de precio pero el doble de leads, lo que sugiere que invierte mas en publicidad que en descuentos. La oportunidad inmediata es mejorar la <strong style={{ color: '#c084fc' }}>calidad del anuncio</strong>, no bajar el precio.
          </div>
        </Card>
      </div>

      {/* Fila 2: Publicaciones + tendencias */}
      <div className="grid-2 mt-16">
        <Card title="Publicaciones con mas leads" action={<Badge tone="purple">Top redes</Badge>}>
          <div className="tiny muted" style={{ marginTop: -2, marginBottom: 14, lineHeight: 1.5 }}>
            Las publicaciones de la competencia que mas leads estan generando esta semana, ordenadas por rendimiento. La barra muestra el <strong style={{ color: '#c084fc' }}>volumen de leads</strong> relativo al lider del top.
          </div>
          <div className="pub-list">
            {PUBLICACIONES.map((p, i) => {
              const tendColor = p.tend === 'up' ? 'var(--green)' : p.tend === 'down' ? 'var(--red)' : 'var(--muted)';
              const tendArrow = p.tend === 'up' ? '▲' : p.tend === 'down' ? '▼' : '▬';
              const max = PUBLICACIONES[0].leads;
              return (
                <div key={p.autor} className="publ-card">
                  <div className="publ-head">
                    <div className="publ-left">
                      <div className="pub-ico"><RedLogo red={p.red} size={26} /></div>
                      <div className="publ-meta">
                        <div className="publ-autor">{p.autor} <span className="publ-rank">#{i + 1}</span></div>
                        <div className="publ-red tiny">{p.red} · {p.detalle}</div>
                      </div>
                    </div>
                    <div className="publ-leads-big">
                      <span className="publ-leads-num">{p.leads.toLocaleString()}</span>
                      <span className="tiny muted">leads</span>
                    </div>
                  </div>
                  <div className="publ-bar-wrap">
                    <div className="publ-bar" style={{ width: `${(p.leads / max) * 100}%`, background: `linear-gradient(90deg, ${p.color}, ${p.color}cc)` }} />
                  </div>
                  <div className="publ-foot">
                    <span className="publ-kpi">🎯 CTR <strong>{p.ctr}</strong></span>
                    <span className="publ-kpi">💰 CPL <strong>{p.cpl}</strong></span>
                    <span className="publ-kpi" style={{ color: tendColor }}>{tendArrow} leads</span>
                    <a className="publ-btn" href={p.url} target="_blank" rel="noopener noreferrer">Ver publicación ↗</a>
                  </div>
                  <div className="publ-nota tiny muted">{p.nota}</div>
                </div>
              );
            })}
          </div>
          <div className="tiny muted" style={{ marginTop: 14, lineHeight: 1.5, padding: '12px', borderRadius: '10px', background: 'rgba(168,85,247,.06)', border: '1px solid var(--border2)' }}>
            💡 <strong style={{ color: '#c084fc' }}>Que replicar:</strong> el formato <strong style={{ color: '#e9d5ff' }}>reel de rutina corta</strong> (IG + TikTok) es el que genera mas leads con el CPL mas barato ($3.10). La promo de descuento de Facebook trae volumen pero a $5.10 por lead y con peor calidad. Prioriza formato de <strong style={{ color: '#c084fc' }}>transformacion y educacion</strong> sobre descuentos.
          </div>
        </Card>

        <Card title="Tendencias del sector" action={<Badge tone="green">En alza</Badge>}>
          <div className="tiny muted" style={{ marginTop: -2, marginBottom: 14, lineHeight: 1.5 }}>
            Lo que la IA detecta que mueve el mercado del <strong style={{ color: '#c084fc' }}>{producto.cat.toLowerCase()}</strong> en {ciudad} ahora. Cada barra muestra el <strong style={{ color: '#c084fc' }}>impulso</strong> de la tendencia en los ultimos 30 dias.
          </div>
          <div className="trend-grid">
            {TENDENCIAS.map(t => (
              <div key={t.label} className="trend-card">
                <div className="trend-top">
                  <span className="trend-tag" style={{ color: t.up ? 'var(--green)' : 'var(--red)', borderColor: t.up ? 'rgba(34,197,94,.4)' : 'rgba(239,68,68,.4)', background: t.up ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)' }}>{t.tag}</span>
                  <span className="trend-num" style={{ color: t.up ? 'var(--green)' : 'var(--red)' }}>{t.num}</span>
                </div>
                <div className="trend-label">{t.label}</div>
                <div className="trend-spark" style={{ justifyContent: t.up ? 'flex-start' : 'flex-end' }}>
                  <div className="trend-bar-purple" style={{ width: t.width, background: 'linear-gradient(90deg, #7c3aed, #a855f7, #c084fc)' }} />
                </div>
                <div className="trend-note tiny muted">{t.detalle}</div>
              </div>
            ))}
          </div>
          <div className="trend-chart">
            <div className="trend-chart-head">
              <div>
                <div className="small" style={{ fontWeight: 700 }}>Evolucion de la demanda: serum vitamina C</div>
                <div className="tiny muted">Busquedas + menciones en tu zona, ultimos 30 dias.</div>
              </div>
              <span className="trend-num up">+32%</span>
            </div>
            <LineChart
              data={[100, 118, 112, 135, 148, 142, 168, 190, 205, 198, 224, 240, 268, 282, 305]}
              stroke="#22c55e"
              height={180}
              labels={['S1', 'S2', 'S3', 'S4']}
            />
          </div>
          <div className="tiny muted" style={{ marginTop: 14, lineHeight: 1.5, padding: '12px 14px', borderRadius: '10px', background: 'rgba(34,197,94,.06)', border: '1px solid var(--border2)' }}>
            💡 <strong style={{ color: '#4ade80' }}>Lectura clave:</strong> el mercado esta caliente en <strong style={{ color: '#e9d5ff' }}>serum vitamina C</strong> (+32%) y el <strong style={{ color: '#e9d5ff' }}>formato before/after</strong> (+41% engagement) es el que mejor rinde hoy. Dos oportunidades accionables: reforzar el serum y el protector solar SPF (+19%) que la competencia aun no captura. La unica senal negativa es la baja de precio de Tienda Norte (-15%): no la sigas, te saca margen.
          </div>
        </Card>
      </div>

      {/* Panel informativo: hallazgos IA */}
      <Card className="mt-16" title="Que esta pasando en el mercado" action={<span className="badge-live"><span className="live-dot" />En vivo</span>}>
        <div className="tiny muted" style={{ marginTop: -2, marginBottom: 14, lineHeight: 1.5 }}>
          Radar de la <strong style={{ color: '#c084fc' }}>Inteligencia Colectiva</strong>: lo que los agentes estan encontrando sobre el {producto.nombre.toLowerCase()} y sus competidores.
        </div>
        <div className="hallazgos-grid">
          {HALLAZGOS.map(h => (
            <div key={h.titulo} className="hallazgo">
              <div className="hallazgo-top">
                <span className="hallazgo-ico" style={{ background: `${h.color}1c`, color: h.color }}>{h.icono}</span>
                <span className="hallazgo-tag" style={{ color: h.color, borderColor: `${h.color}44` }}>{h.tag}</span>
              </div>
              <div className="small" style={{ fontWeight: 700, marginTop: 8, lineHeight: 1.35 }}>{h.titulo}</div>
              <div className="tiny muted" style={{ marginTop: 4, lineHeight: 1.4 }}>{h.detalle}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

// ===== Componente Mapa Leaflet en modo terreno =====
function Heatmap({ ciudad, com }: { ciudad: string; com: typeof COMERCIOS }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<L.Map | null>(null);
  const center: [number, number] = COORDENADAS[ciudad] || COORDENADAS['Buenos Aires'];

  useEffect(() => {
    if (!mapRef.current || mapObj.current) return;
    const map = L.map(mapRef.current, { center, zoom: 14, scrollWheelZoom: false });
    mapObj.current = map;

    // Capa de terreno (relieve sombreado) — OpenTopoMap, gratis sin key
    L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: '&copy; OpenStreetMap &copy; OpenTopoMap (CC-BY-SA)',
    }).addTo(map);

    // Circulo de radiacion de cobertura (zona de alta demanda)
    L.circle(center, {
      radius: 1400,
      color: '#a855f7',
      weight: 2,
      fillColor: '#a855f7',
      fillOpacity: 0.18,
    }).addTo(map);

    // Marcadores de comercios
    com.forEach(c => {
      const latlng: [number, number] = [center[0] + c.dlat, center[1] + c.dlng];
      const propio = c.tipo === 'Tu';
      const color = propio ? '#a855f7' : c.tipo === 'Competidor' ? '#ef4444' : '#f59e0b';
      const marker = L.circleMarker(latlng, {
        radius: propio ? 10 : 7,
        color: '#000',
        weight: 1,
        fillColor: color,
        fillOpacity: 1,
      }).addTo(map);
      if (propio) {
        // pulso en "tu local"
        marker.bindTooltip('Tu local', { permanent: true, direction: 'top', className: 'map-tooltip-propio', offset: [0, -8] });
        L.circleMarker(latlng, { radius: 16, color: '#a855f7', weight: 1.5, fillOpacity: 0, className: 'leaflet-pulse' }).addTo(map);
      } else {
        marker.bindTooltip(c.nombre, { permanent: true, direction: 'top', className: 'map-tooltip', offset: [0, -6] });
      }
    });

    return () => { map.remove(); mapObj.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ciudad]);

  return <div ref={mapRef} className="heatmap-leaflet" />;
}
