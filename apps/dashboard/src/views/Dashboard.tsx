import { StatCard, Card, Badge } from '../components/sinkroo/ui';
import { LineChart, BarChart } from '../components/sinkroo/charts';
import { CAMPANAS, MODULOS } from '../components/sinkroo/data';
import { I_Trend, I_Sparkle, I_Bank, I_Globe, I_Whatsapp, I_Send, I_Search, I_Bell, I_Chat, I_ChevDn, I_Pause, I_Play, SinkrooMark } from '../components/sinkroo/icons';

import type { ViewKey } from '../components/sinkroo/data';
import { Tour, type TourStep } from '../components/sinkroo/Tour';
import { useState, useEffect } from 'react';

type AgenteIA = { nombre: string; accion: string; extra: string; estado: 'Ejecutando' | 'En cola'; icono: string; color: string; pulso: boolean };
const AGENTES_IA: AgenteIA[] = [
  { nombre: 'Agente Competencia', accion: 'Analizando anuncios de competidores en Facebook Ads e Instagram.', extra: 'Encontró 3 anuncios nuevos de 2 competidores directos', estado: 'Ejecutando', icono: '🕵️', color: '#c084fc', pulso: true },
  { nombre: 'Agente Mercado', accion: 'Rastreando precios y promociones de tu nicho en redes sociales.', extra: 'Detectó que "Tienda Norte" bajó el precio un 15%', estado: 'Ejecutando', icono: '📈', color: '#22c55e', pulso: true },
  { nombre: 'Agente GAIA', accion: 'Respondiendo clientes en WhatsApp con respuestas humanas.', extra: '3 conversaciones activas · responde en 0.8s', estado: 'Ejecutando', icono: '💬', color: '#4ade80', pulso: true },
  { nombre: 'Agente Creativos', accion: 'Generando variantes de anuncios ganadores y copys.', extra: '4 variantes listas · esperando tu aprobación', estado: 'Ejecutando', icono: '🎨', color: '#fbbf24', pulso: true },
  { nombre: 'Agente Tendencias', accion: 'Escaneando reels y formatos virales del rubro.', extra: '1 formato nuevo detectado · CTR 3.1x superior', estado: 'En cola', icono: '🔥', color: '#f472b6', pulso: false },
  { nombre: 'Agente Clientes', accion: 'Identificando leads urgentes que requieren respuesta humana.', extra: '2 clientes marcados como prioritarios', estado: 'En cola', icono: '👥', color: '#60a5fa', pulso: false },
];

export default function Dashboard({ onNav }: { onNav: (v: ViewKey) => void }) {
  const ventas = [12, 18, 15, 24, 22, 30, 28, 36, 33, 42, 39, 48];
  const gasto = [420, 610, 540, 780, 690, 920, 810, 1080];
  const audiencias = [14, 18, 16, 20, 19, 25, 23, 27];
  const [tourAbierto, setTourAbierto] = useState(false);

  // El tour arranca solo la primera vez que el usuario entra al dashboard
  useEffect(() => {
    try {
      if (!localStorage.getItem('sinkroo-tour-visto')) {
        const t = setTimeout(() => { setTourAbierto(true); localStorage.setItem('sinkroo-tour-visto', '1'); }, 700);
        return () => clearTimeout(t);
      }
    } catch { /* localStorage no disponible */ }
  }, []);

  const PASOS_TOUR: TourStep[] = [
    { selector: '[data-tour="hero"]', titulo: 'Tu panel de control', texto: 'Este es el resumen general de tu negocio. Arriba ves a tu agente activo 24/7 y tres métricas clave: ventas de hoy, ROAS y score de creativos.', posicion: 'bottom' },
    { selector: '[data-tour="stats"]', titulo: 'Las 4 cifras que importan', texto: 'Ventas del mes, ROAS global, alcance y tus créditos. Cada tarjeta tiene su tendencia (+/-) y una mini gráfica para ver la evolución de un vistazo.', posicion: 'bottom' },
    { selector: '[data-tour="chart"]', titulo: 'Rendimiento en el tiempo', texto: 'Tu curva de ventas mes a mes con acumulado, promedio mensual y variación de los últimos 30 días.', posicion: 'bottom' },
    { selector: '[data-tour="whatsapp"]', titulo: 'WhatsApp en vivo', texto: 'Acá tu agente conversa con clientes reales. Podés leer, responder y filtrar por urgencia directamente desde el panel.', posicion: 'top' },
    { selector: '[data-tour="campanas"]', titulo: 'Tus campañas activas', texto: 'Las campañas que están corriendo ahora, con su ROAS y conversiones. Toca "Ver todas" para gestionarlas.', posicion: 'top' },
    { selector: '[data-tour="gasto"]', titulo: 'Gasto publicitario', texto: 'Cuánto invertís en Meta Ads, costo por lead, clic y conversión, y el total invertido con la semana récord.', posicion: 'top' },
    { selector: '[data-tour="ia"]', titulo: 'Inteligencia Colectiva', texto: 'Los agentes de Sinkroo trabajando ahora por tu cuenta: mercado, competencia, clientes y creativos, en vivo.', posicion: 'top' },
  ];

  return (
    <div className="dash">
      {/* HERO — fiel al mockup */}
      <div className="hero card" data-tour="hero">
        <div className="hero-side">
          <div className="hero-greet">
            <SinkrooMark size={104} radius={52} />
            <div>
              <div className="hero-live" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="dot-live" /> TU AGENTE ESTÁ ACTIVO
              <button className="tour-start-btn" onClick={() => setTourAbierto(true)} title="Recorré el panel con Sinkroo">▶ Iniciar tour</button>
            </div>
              <div className="hdr-t" style={{ fontSize: 24, lineHeight: 1.2 }}>Hola María Paula, soy <span className="grad-text" style={{ fontWeight: 900 }}>Sinkroo</span> 👋</div>
              <div className="hdr-s">Te estoy vigilando la tienda 24/7. Mirá lo que hice hoy.</div>
            </div>
          </div>
        </div>
        <div className="hero-metrics">
          <div className="hero-metric"><div className="metric">47</div><div className="m-label">Ventas</div><div className="m-desc">concretadas hoy</div></div>
          <div className="hero-metric"><div className="metric">3.4x</div><div className="m-label">ROAS</div><div className="m-desc">retorno por cada $1 invertido</div></div>
          <div className="hero-metric"><div className="metric">96</div><div className="m-label">Score</div><div className="m-desc">calidad del creativo aprobado</div></div>
        </div>
        <div className="hero-ad">
          <div className="hero-ad-tag">PUBLICIDAD</div>
          <div className="hero-ad-title">Más marcas, una cuenta</div>
          <div className="hero-ad-sub">Con Sinkroo Agency, operás hasta 8 marcas desde una sola cuenta, white label incluido.</div>
          <button className="hero-ad-btn" onClick={() => onNav('creditos')}>Ver planes →</button>
        </div>
      </div>

      <div className="stats-grid" data-tour="stats">
        <StatCard label="Ventas del mes" value="$4,280" delta="+18%" icon={<I_Bank size={17} />} spark={ventas} />
        <StatCard label="ROAS global" value="3.8x" delta="+0.4" icon={<I_Trend size={17} />} spark={[1, 2, 2.4, 3, 2.8, 3.5, 3.8]} color="#22c55e" />
        <StatCard label="Alcance" value="48.5K" delta="+22%" icon={<I_Globe size={17} />} spark={audiencias} />
        <StatCard label="Créditos" value="1,760" delta="-120" icon={<I_Sparkle size={17} />} spark={[1760, 1700, 1720, 1680, 1760]} color="#f59e0b" />
      </div>

      <div className="grid-2">
        <Card tour="chart" title="Rendimiento de ventas" action={<Badge>Últimos 30 días</Badge>}>
          <div style={{ background: 'radial-gradient(120% 90% at 50% 40%, #2a1245 0%, rgba(24,12,40,.6) 45%, transparent 78%)', borderRadius: 12, padding: '16px 12px 4px', marginBottom: 6 }}>
          <LineChart data={ventas} height={210} labels={['Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago']} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border2)' }}>
            <div style={{ flex: 1 }}>
              <div className="tiny muted" style={{ marginBottom: 3 }}>Ventas acumuladas</div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>$40,280</div>
            </div>
            <div style={{ display: 'flex', gap: 18, textAlign: 'right' }}>
              <div>
                <div className="tiny muted">Promedio / mes</div>
                <div className="small" style={{ fontWeight: 700 }}>$6,713</div>
              </div>
              <div>
                <div className="tiny muted">Variación 30d</div>
                <div className="small" style={{ fontWeight: 700, color: '#4ade80' }}>▲ +112%</div>
              </div>
            </div>
          </div>
        </Card>

        <div data-tour="whatsapp"><WhatsappPanel /></div>
      </div>

      <div className="grid-2">
        <Card tour="campanas" title="Campañas activas" action={<button className="btn btn-ghost btn-sm" onClick={() => onNav('campanas')}>Ver todas</button>}>
          {CAMPANAS.filter(c => c.estado === 'Activa').map(c => (
            <div key={c.id} className="camp-row" onClick={() => onNav('campanas')}>
              <span className="camp-mod-ico" style={{ background: MODULOS.find(m => m.key === c.modulo)?.color }}>{c.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}><div className="small" style={{ fontWeight: 600 }}>{c.nombre}</div><div className="tiny muted">ROAS {c.roas} · {c.conversiones} conv.</div></div>
              <Badge tone="green">Activa</Badge>
            </div>
          ))}
        </Card>

        <Card tour="gasto" title="Gasto publicitario" action={<Badge tone="amber">Meta Ads</Badge>}>
          <div className="tiny muted" style={{ marginTop: -2, marginBottom: 12, lineHeight: 1.5 }}>
            Inversión semanal en anuncios de <strong style={{ color: '#fbbf24' }}>Meta Ads</strong>. Cada barra es el dinero invertido esa semana en alcanzar audiencias; más gasto = más alcance, pero lo que importa es el <strong style={{ color: '#c084fc' }}>ROAS</strong> (lo que vuelve por cada $1).
          </div>
          <BarChart data={gasto} labels={['S1', 'S2', 'S3', 'S4']} height={180} color="#a855f7" prefix="$" />
          <div className="gasto-costs">
            <div className="gasto-cost"><span className="gasto-cost-label">Costo por lead</span><span className="gasto-cost-value">$4.20</span></div>
            <div className="gasto-cost"><span className="gasto-cost-label">Costo por cliente</span><span className="gasto-cost-value">$62.30</span></div>
            <div className="gasto-cost"><span className="gasto-cost-label">Costo por clic</span><span className="gasto-cost-value">$0.85</span></div>
            <div className="gasto-cost"><span className="gasto-cost-label">Costo por conversión</span><span className="gasto-cost-value">$58.60</span></div>
          </div>
          <div className="gasto-foot">
            <div className="gasto-stat">
              <span className="gasto-stat-label">Total invertido</span>
              <span className="gasto-stat-value">$2,930</span>
            </div>
            <div className="gasto-stat">
              <span className="gasto-stat-label">Semana récord</span>
              <span className="gasto-stat-value">S4 <small>$1,080</small></span>
            </div>
          </div>
          <div className="gasto-insight">
            <span className="gasto-insight-ico"><I_Trend size={14} /></span>
            <span>El gasto creció <strong>+157%</strong> de S1 a S4, alineado con el pico de ventas.</span>
          </div>
        </Card>
      </div>

      <Card tour="ia" title="Qué está haciendo la IA" action={<span className="badge-live"><span className="live-dot" />En vivo</span>}>
        <div className="tiny muted" style={{ marginTop: -2, marginBottom: 14, lineHeight: 1.5 }}>
          Estos son los agentes de <strong style={{ color: '#c084fc' }}>Inteligencia Colectiva</strong> trabajando ahora mismo por tu cuenta. Monitorean el mercado, tu competencia y tus campañas las 24/7.
        </div>
        <div className="ai-live-list">
          {AGENTES_IA.map(a => (
            <div key={a.nombre} className={`ai-live-item ${a.pulso ? 'ai-live-pulso' : ''}`}>
              <div className="ai-live-ico" style={{ color: a.color }}>{a.icono}</div>
              <div className="ai-live-body">
                <div className="ai-live-top">
                  <span className="small" style={{ fontWeight: 700 }}>{a.nombre}</span>
                  <span className={`ai-live-tag ${a.estado === 'Ejecutando' ? 'tag-activo' : 'tag-cola'}`}>{a.estado}</span>
                </div>
                <div className="tiny muted" style={{ lineHeight: 1.4 }}>{a.accion}</div>
                <div className="ai-live-extra tiny" style={{ color: a.color }}>{a.extra}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {tourAbierto && <Tour pasos={PASOS_TOUR} onFinish={() => setTourAbierto(false)} onSkip={() => setTourAbierto(false)} />}
    </div>
  );
}

// ===== Módulo WhatsApp interactivo (reemplaza "Distribución de módulos") =====

type Msg = { de: 'ellos' | 'yo'; txt: string; hora?: string };
type Conv = { id: string; nombre: string; tag: string; color: string; urgente: boolean; noLeidos: number; hora: string; canal: 'wa' | 'msgr'; msgs: Msg[] };

const CONVS_SEED: Conv[] = [
  { id: 'v1', nombre: 'Valeria G.', tag: 'Lead', color: '#22c55e', urgente: true, noLeidos: 2, hora: '10:24', canal: 'wa', msgs: [
    { de: 'ellos', txt: '¡Hola! Quería saber si el serum sirve para piel mixta', hora: '10:21' },
    { de: 'yo', txt: '¡Sí! Es ideal para piel mixta 👍. ¿Te paso el link?', hora: '10:22' },
    { de: 'ellos', txt: 'Sí, y ¿hacen envío a CABA?', hora: '10:24' },
  ]},
  { id: 'v2', nombre: 'Julián D.', tag: 'Post-venta', color: '#c084fc', urgente: false, noLeidos: 0, hora: '09:12', canal: 'wa', msgs: [
    { de: 'ellos', txt: 'Mi pedido llegó, gracias 🙏', hora: '09:10' },
    { de: 'yo', txt: '¡Nos alegra! ¿Podés dejarnos 5⭐?', hora: '09:12' },
  ]},
  { id: 'v3', nombre: 'Camila T.', tag: 'Lead', color: '#22c55e', urgente: true, noLeidos: 1, hora: 'Ayer', canal: 'msgr', msgs: [
    { de: 'ellos', txt: '¿Hacen envíos a Córdoba?', hora: 'Ay' },
  ]},
  { id: 'v4', nombre: 'Martín R.', tag: 'Soporte', color: '#ef4444', urgente: true, noLeidos: 0, hora: 'Ayer', canal: 'msgr', msgs: [
    { de: 'ellos', txt: 'Quiero cancelar mi suscripción', hora: 'Ay' },
    { de: 'yo', txt: '¡Lamento escucharlo! ¿Me contás el motivo?', hora: 'Ay' },
  ]},
];

const WA_CAMPANAS = ['WhatsApp: Secuencia Bienvenida', 'WhatsApp: Recupera carritos', 'Instagram DM: Auto-respuesta', 'Email: Post-venta y reseña'];

type Paso = { n: number; titulo: string; espera: string; texto: string; estado: "Enviado" | "Ejecutando" | "En espera" };
const FLUJOS: Record<string, Paso[]> = {
  "WhatsApp: Secuencia Bienvenida": [
    { n: 1, titulo: "Bienvenida", espera: "Al instante", texto: "¡Hola! 👋 Gracias por escribirnos. Soy el asistente de Sinkroo, ¿en qué te ayudo?", estado: "Enviado" },
    { n: 2, titulo: "Presentación", espera: "+2 min", texto: "Te cuento en 30 segundos qué hacemos: automatizamos tus ventas por WhatsApp.", estado: "Enviado" },
    { n: 3, titulo: "Oferta de bienvenida", espera: "+1 día", texto: "Como regalo: 15% OFF con el código BIEN15 💜", estado: "Ejecutando" },
    { n: 4, titulo: "Seguimiento", espera: "+3 días", texto: "¿Te quedó alguna duda? Estoy por acá para lo que necesites.", estado: "En espera" },
  ],
  "WhatsApp: Recupera carritos": [
    { n: 1, titulo: "Recordatorio", espera: "+1 h", texto: "¡Hola! Vimos que dejaste productos en tu carrito 🛒", estado: "Enviado" },
    { n: 2, titulo: "Incentivo", espera: "+24 h", texto: "Te guardamos el carrito: envío gratis solo por hoy.", estado: "Ejecutando" },
    { n: 3, titulo: "Última oportunidad", espera: "+48 h", texto: "Tu carrito expira en 2 horas ⏰", estado: "En espera" },
  ],
  "Instagram DM: Auto-respuesta": [
    { n: 1, titulo: "Respuesta a historia", espera: "Al instante", texto: "¡Gracias por tu mensaje! ¿Sobre qué producto querés saber?", estado: "Enviado" },
    { n: 2, titulo: "Catálogo rápido", espera: "+5 min", texto: "Te paso los 3 productos más pedidos 👇", estado: "Ejecutando" },
  ],
  "Email: Post-venta y reseña": [
    { n: 1, titulo: "Agradecimiento", espera: "+1 h", texto: "¡Gracias por tu compra! 🎉 Tu pedido ya está en camino.", estado: "Enviado" },
    { n: 2, titulo: "Solicitud de reseña", espera: "+3 días", texto: "¿Nos dejás 5 estrellas? Nos ayuda muchísimo ⭐", estado: "En espera" },
  ],
};
const WA_LOGO = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z';
const MSGR_LOGO = 'M12 0C5.24 0 0 4.952 0 11.64c0 3.499 1.434 6.521 3.769 8.61a.96.96 0 0 1 .323.683l.065 2.135a.96.96 0 0 0 1.347.85l2.381-1.053a.96.96 0 0 1 .641-.046A13 13 0 0 0 12 23.28c6.76 0 12-4.952 12-11.64S18.76 0 12 0m6.806 7.44c.522-.03.971.567.63 1.094l-4.178 6.457a.707.707 0 0 1-.977.208l-3.87-2.504a.44.44 0 0 0-.49.007l-4.363 3.01c-.637.438-1.415-.317-.995-.966l4.179-6.457a.706.706 0 0 1 .977-.21l3.87 2.505c.15.097.344.094.491-.007l4.362-3.008a.7.7 0 0 1 .364-.13';

const IA_ACTIVIDAD: { titulo: string; detalle: string; estado: string; color: string }[] = [
  { titulo: 'Respondiendo a Valeria G.', detalle: 'Piel mixta · recomendó serum + crema hidratante', estado: '0.8s', color: '#4ade80' },
  { titulo: 'Cerrando venta con Julián D.', detalle: 'Post-venta · pidió reseña 5 estrellas', estado: '1.2s', color: '#c084fc' },
  { titulo: 'Clasificando 3 leads nuevos', detalle: 'Etiquetó por urgencia e intención de compra', estado: 'Ahora', color: '#3b82f6' },
  { titulo: 'Programando seguimiento', detalle: 'Recordatorio para Camila T. en 2 horas', estado: 'Agendado', color: '#f59e0b' },
];

function WhatsappPanel() {
  const [convs, setConvs] = useState<Conv[]>(CONVS_SEED);
  const [chatId, setChatId] = useState(convs[0].id);
  const [input, setInput] = useState('');
  const [filtro, setFiltro] = useState<'todas' | 'humanas' | 'ia'>('todas');
  const [campOpen, setCampOpen] = useState(false);
  const [camp, setCamp] = useState(WA_CAMPANAS[0]);
  const [campPaused, setCampPaused] = useState(false);
  const [canal, setCanal] = useState<"wa" | "msgr">("wa");
  const humanas = convs.filter(c => c.urgente);
  const delCanal = convs.filter(c => c.canal === canal);
  const lista = filtro === 'humanas' ? humanas.filter(c => c.canal === canal) : filtro === 'ia' ? [] : delCanal;

  const chat = convs.find(c => c.id === chatId) || delCanal[0] || convs[0];

  const cambiarCanal = (ch: "wa" | "msgr") => {
    setCanal(ch);
    const primera = convs.find(c => c.canal === ch);
    if (primera) setChatId(primera.id);
    setFiltro("todas");
  };

  const enviar = () => {
    const t = input.trim();
    if (!t) return;
    setConvs(prev => prev.map(c => c.id === chatId ? { ...c, msgs: [...c.msgs, { de: 'yo', txt: t }] } : c));
    setInput('');
  };

  return (
    <Card title="WhatsApp. Atención al cliente" action={
      <div className="row" style={{ gap: 8 }}>
        <button className={"btn " + (filtro === 'humanas' ? 'btn-human' : 'btn-ghost') + " btn-sm"} onClick={() => setFiltro(f => f === 'humanas' ? 'todas' : 'humanas')}>
          <I_Bell size={14} /> Debe responder un humano ({humanas.length})
        </button>
        <button className={"btn " + (filtro === 'ia' ? 'btn-ai' : 'btn-ghost') + " btn-sm"} onClick={() => setFiltro(f => f === 'ia' ? 'todas' : 'ia')}>
          <I_Sparkle size={14} /> Qué está haciendo la IA
        </button>
        <Badge tone="green"><I_Whatsapp size={12} /> Conectado</Badge>
      </div>
    }>
        <div className="wa-camp">
          <div className="wa-camp-channels">
            <button className={"wa-chan" + (canal === "wa" ? " active" : "")} onClick={() => cambiarCanal("wa")}>
              <svg viewBox="0 0 24 24" className="wa-chan-logo"><path fill="#25D366" d={WA_LOGO} /></svg>
              <span className="wa-chan-name">WhatsApp</span>
              <span className="wa-chan-count">{convs.filter(c => c.canal === "wa").reduce((n, c) => n + c.msgs.length, 0)}</span>
            </button>
            <button className={"wa-chan" + (canal === "msgr" ? " active" : "")} onClick={() => cambiarCanal("msgr")}>
              <svg viewBox="0 0 24 24" className="wa-chan-logo"><path fill="#0866FF" d={MSGR_LOGO} /></svg>
              <span className="wa-chan-name">Messenger</span>
              <span className="wa-chan-count">{convs.filter(c => c.canal === "msgr").reduce((n, c) => n + c.msgs.length, 0)}</span>
            </button>
          </div>
          <div className="row spread" style={{ marginBottom: 8, marginTop: 12 }}>
            <span className="small" style={{ fontWeight: 700, color: "#c084fc" }}>Campaña</span>
          </div>
          <button className="wa-camp-select" onClick={() => setCampOpen(o => !o)}>
            <span className="row" style={{ gap: 8 }}><I_Chat size={14} /> {camp}</span> <I_ChevDn />
          </button>
          {campOpen && (
            <div className="wa-camp-menu">
              {WA_CAMPANAS.map((cn, i) => (
                <button key={i} className="wa-camp-opt" onClick={() => { setCamp(cn); setCampOpen(false); }}>{cn}</button>
              ))}
            </div>
          )}
          <div className="row spread" style={{ marginTop: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span className="small">{camp.split(": ")[1] || camp}</span>
              <span className="tiny muted">{campPaused ? "Flujo pausado por ti" : "Flujo ejecutándose"}</span>
            </div>
            <div className="row" style={{ gap: 8 }}>
              {campPaused
                ? <Badge tone="amber">Pausada</Badge>
                : <Badge tone="green">Activo</Badge>}
              <button className="btn btn-ghost btn-sm wa-camp-pause" onClick={() => setCampPaused(p => !p)}>
                {campPaused ? <I_Play size={14} /> : <I_Pause size={14} />}
              </button>
            </div>
          </div>
        </div>

        <div className="wa-flujo">
          <div className="wa-flujo-head">
            <span className="small" style={{ fontWeight: 700, color: "#c084fc" }}>Flujo automático</span>
            <span className="tiny muted">{FLUJOS[camp].length} respuestas · secuencia activa</span>
          </div>
          {FLUJOS[camp].map(p => (
            <div key={p.n} className={"wa-paso" + (campPaused ? " pausado" : "")}>
              <div className="wa-paso-top">
                <span className="wa-paso-n">{p.n}</span>
                <span className="wa-paso-tit">{p.titulo}</span>
                <span className="wa-paso-espera">{p.espera}</span>
                <span className={"wa-paso-estado " + (p.estado === "Enviado" ? "ok" : p.estado === "Ejecutando" ? "run" : "wait")}>{p.estado}</span>
              </div>
              <div className="wa-paso-txt">{p.texto}</div>
            </div>
          ))}
        </div>

      <div className="wa-widget">
        {/* Bandeja de conversaciones */}
        <div className="wa-inbox">
          <div className="wa-search"><I_Search size={14} /> Buscar cliente…</div>
          <div className="wa-list">
            {filtro === 'ia' ? (
                            <div className="wa-ia-panel">
                <div className="wa-ia-head"><I_Sparkle size={15} /> Actividad de la IA en vivo</div>

                <div className="wa-ia-stats">
                  <div className="wa-ia-stat">
                    <span className="wa-ia-stat-v">128</span>
                    <span className="tiny muted">Conversaciones hoy</span>
                  </div>
                  <div className="wa-ia-stat">
                    <span className="wa-ia-stat-v">94%</span>
                    <span className="tiny muted">Resueltas por IA</span>
                    <span className="wa-ia-mini positive">&#9650; 3% vs ayer</span>
                  </div>
                  <div className="wa-ia-stat">
                    <span className="wa-ia-stat-v">1.4s</span>
                    <span className="tiny muted">Respuesta media</span>
                  </div>
                  <div className="wa-ia-stat">
                    <span className="wa-ia-stat-v">8</span>
                    <span className="tiny muted">Escaladas a humano</span>
                  </div>
                </div>

                <div className="wa-ia-chart">
                  <div className="wa-ia-chart-t">Conversaciones por hora</div>
                  <BarChart data={[2, 5, 9, 12, 8, 14, 18, 15, 21, 17, 12, 6]} labels={["8","9","10","11","12","13","14","15","16","17","18","19"]} height={130} color="#a855f7" />
                </div>

                <div className="wa-ia-acts">
                  <div className="wa-ia-acts-t">En este momento</div>
                  {IA_ACTIVIDAD.map((a, i) => (
                    <div key={i} className="wa-ia-row">
                      <span className="wa-ia-dot" style={{ background: a.color }} />
                      <span className="wa-ia-body">
                        <span className="small" style={{ fontWeight: 600 }}>{a.titulo}</span>
                        <span className="tiny muted">{a.detalle}</span>
                      </span>
                      <span className="tiny muted" style={{ flexShrink: 0 }}>{a.estado}</span>
                    </div>
                  ))}
                </div>

                <div className="tiny muted" style={{ padding: "8px 12px", borderTop: "1px solid var(--border)" }}>
                  GAIA procesa y responde en un lenguaje natural, tomando el contexto de cada cliente al instante.
                </div>
              </div>            ) : (
              lista.length === 0
                ? <div className="tiny muted pa-8">No hay conversaciones por responder 🎉</div>
                : lista.map(c => (
                    <button key={c.id} className={"wa-item" + (c.id === chatId ? ' active' : '')} onClick={() => { setChatId(c.id); setFiltro('todas'); }}>
                      <span className="wa-av" style={{ background: c.color }}>{c.nombre[0]}</span>
                      <span className="wa-item-body">
                        <span className="spread small"><strong>{c.nombre}</strong><span className="tiny muted">{c.hora}</span></span>
                        <span className="spread tiny">
                          <span className="muted ellipsis">{c.msgs[c.msgs.length - 1].txt}</span>
                          {c.noLeidos > 0 && <span className="wa-badge">{c.noLeidos}</span>}
                        </span>
                        {c.urgente && <span className="wa-urg">🔴 Requiere respuesta</span>}
                      </span>
                    </button>
                  ))
            )}
          </div>
        </div>

        {/* Chat */}
        <div className="wa-chat">
          <div className="wa-chat-head">
            <span className="wa-av" style={{ background: chat.color }}>{chat.nombre[0]}</span>
            <div style={{ flex: 1 }}>
              <div className="small" style={{ fontWeight: 700 }}>{chat.nombre}</div>
              <div className="tiny muted">{chat.tag}</div>
            </div>
            {chat.urgente && <Badge tone="red">Respuesta humana</Badge>}
          </div>
          <div className="wa-msgs">
            {chat.msgs.map((m, i) => (
              <div key={i} className={"wa-msg " + m.de}>{m.txt}{m.hora && <span className="wa-msg-hora">{m.hora}</span>}</div>
            ))}
          </div>
          <div className="wa-compose">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && enviar()}
              placeholder="Escribí una respuesta…"
            />
            <button className="btn btn-primary btn-sm" onClick={enviar}><I_Send size={15} /></button>
          </div>
        </div>
      </div>
    </Card>
  );
}
