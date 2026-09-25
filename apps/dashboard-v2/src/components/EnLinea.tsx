import { useEffect, useState } from 'react';
import { Card, Badge, Button, Dinero, NotaMoneda } from './ui';
import { BarRow } from './viz';
import { I_Play, I_Eye, I_Zap, I_Trend, I_Check, I_Refresh, I_Credit, I_Pause, I_Film, I_Image, I_File } from './icons';
import { useDetalle } from './Detalle';
import { PASOS_CAMPANA, type PasoCampana } from './CampanaPasos';
import { ANGULOS, CARPETA, CREDITOS_MOV, EXCEPCIONES, NUMEROS, TENANT } from '../data/demo';

// =============================================================================================
// EN LÍNEA — el final del flujo: lo que se publicó y cómo está rindiendo AHORA.
// Monitoreo directo: los números se mueven solos mientras mira.
//
// Cada botón de aquí hace algo QUE SE VE, y siempre una de estas dos cosas:
//   (a) abre el PANEL DE DETALLE (Detalle.tsx) con los números de esa pieza o el informe completo;
//   (b) cambia el estado en la pantalla misma: la fila se queda con el número congelado y su badge,
//       aparece la línea de por qué se frenó y el botón pasa a «reanudar».
// Ninguno avisa y se olvida: un aviso que se va solo no es una acción.
// =============================================================================================

const PUBLICADAS = [
  { titulo: 'El problema primero', corto: 'El problema primero', formato: 'Video vertical 15 s', red: 'Instagram + Facebook', alcance: 12480, clics: 412, roas: 4.2, color: '#4A7C59', tinte: 'var(--green)' },
  { titulo: 'Antes y después real', corto: 'Antes y después', formato: 'Carrusel 5 placas', red: 'Instagram', alcance: 8930, clics: 268, roas: 3.6, color: '#F5EFE6', tinte: 'var(--amber)' },
  { titulo: 'El testimonio solo', corto: 'Testimonio', formato: 'Imagen', red: 'Facebook + WhatsApp', alcance: 5210, clics: 196, roas: 5.1, color: '#4A7C59', tinte: 'var(--green)' },
];

/** El orden en que se leen las barras de rendimiento: de la que más rinde a la que menos. */
const ORDEN_RINDE = ['El problema primero', 'El testimonio solo', 'Antes y después real'];

/** Un decimal con coma: los números de esta pantalla se leen en castellano, no en un tablero en inglés. */
const conComa = (v: number | string) => Number(v).toFixed(1).replace('.', ',');

// Los números que se muestran salen de los datos del negocio, no se escriben a mano:
// lo que ya está subido en la carpeta, lo que costó una campaña en créditos y su ROAS del mes.
const ARCHIVOS_SUBIDOS = Object.values(CARPETA).reduce((a, l) => a + l.length, 0);
const COSTO_CAMPANA = Math.abs(CREDITOS_MOV.find(m => m.detalle.startsWith('Campaña'))!.cantidad);
const ROAS_MES = NUMEROS.find(n => n.label === 'ROAS')!.valor;
/** El ROAS del mes como número, para comparar: «3,8x» → 3,8. */
const ROAS_MES_N = parseFloat(ROAS_MES.replace(',', '.'));
/** El ángulo que hoy gana en el rubro: es con el que arranca cualquier campaña nueva. */
const ANGULO_QUE_GANA = ANGULOS[0];

export function EnLinea({ setToast, ir }: { setToast: (t: string) => void; ir?: (p: PasoCampana) => void }) {
  const detalle = useDetalle();

  // Cada pieza lleva su propio contador: `avance[i]` es cuánto creció esa pieza desde que salió.
  // Al pausarla se CONGELA en el número que tenía (no sigue subiendo ni cae al valor original) y
  // al reanudarla sigue desde donde quedó. El reloj de la tarjeta sale de estos contadores.
  const [avance, setAvance] = useState<number[]>(() => PUBLICADAS.map(() => 0));
  const [pausadas, setPausadas] = useState<string[]>([]);
  const enPausa = (titulo: string) => pausadas.includes(titulo);

  useEffect(() => {
    const id = window.setInterval(() => {
      setAvance(a => a.map((v, i) => (pausadas.includes(PUBLICADAS[i].titulo) ? v : v + 1)));
    }, 2200);
    return () => window.clearInterval(id);
  }, [pausadas]);

  // --- Los números que se mueven ---
  const alcanceDe = (p: typeof PUBLICADAS[number], i: number) => p.alcance + avance[i] * (12 + i * 4);
  const clicsDe = (p: typeof PUBLICADAS[number], i: number) => p.clics + avance[i] * (i + 1);
  const alcance = PUBLICADAS.reduce((a, p, i) => a + alcanceDe(p, i), 0);
  const clics = PUBLICADAS.reduce((a, p, i) => a + clicsDe(p, i), 0);
  // El reloj general es el promedio de los contadores: con las 3 corriendo da exactamente el ritmo de antes.
  const reloj = avance.reduce((a, b) => a + b, 0) / PUBLICADAS.length;
  const ventas = 38 + Math.floor(reloj / 2);
  const activas = PUBLICADAS.filter(p => !enPausa(p.titulo));
  const promedioRoas = PUBLICADAS.reduce((a, p) => a + p.roas, 0) / PUBLICADAS.length;
  // El ROAS combinado se calcula SOLO con las que están corriendo: pausar la que va mal lo sube, y se ve.
  const roasActivas = activas.length ? activas.reduce((a, p) => a + p.roas, 0) / activas.length : 0;
  const roas = activas.length ? (roasActivas + reloj * 0.01).toFixed(1) : null;
  const maxRoas = Math.max(...PUBLICADAS.map(p => p.roas));
  // Las que no rinden: las que devuelven MENOS que su ROAS del mes (3,8x, sale de demo.ts). Hoy es
  // una sola, y es la misma que el motor ya está vigilando de cerca.
  const flojas = PUBLICADAS.filter(p => p.roas < ROAS_MES_N);
  const flojasCorriendo = flojas.filter(p => !enPausa(p.titulo));
  const peor = PUBLICADAS.reduce((a, b) => (b.roas < a.roas ? b : a));

  const pausar = (titulo: string, avisar = true) => {
    setPausadas(ps => ps.includes(titulo) ? ps : [...ps, titulo]);
    if (avisar) setToast(`«${titulo}» en pausa: el número queda congelado donde está`);
  };
  const reanudar = (titulo: string, avisar = true) => {
    setPausadas(ps => ps.filter(t => t !== titulo));
    if (avisar) setToast(`«${titulo}» vuelve a estar en línea, desde donde quedó`);
  };
  const frenarLasQueNoRinden = () => {
    flojasCorriendo.forEach(p => pausar(p.titulo, false));
    setToast(`Frenamos ${flojasCorriendo.map(p => `«${p.titulo}»`).join(' y ')}: no sigue sumando ni gastando`);
  };

  // (a) El detalle en vivo de UNA pieza: sus números, su parte del total y qué hacer con ella.
  const detallePieza = (p: typeof PUBLICADAS[number], i: number) => {
    const alcanceP = alcanceDe(p, i);
    const clicsP = clicsDe(p, i);
    detalle({
      titulo: `«${p.titulo}» en vivo`,
      sub: `${p.formato} · ${p.red}. Esto es lo que está pasando con esta pieza sola, no el promedio de la campaña.`,
      bloques: [
        { tipo: 'datos', filas: [
          { k: 'Personas alcanzadas', v: alcanceP.toLocaleString('es-CO'), s: `${Math.round((alcanceP / alcance) * 100)}% de las ${alcance.toLocaleString('es-CO')} que suman las 3 piezas` },
          { k: 'Clics al sitio', v: clicsP.toLocaleString('es-CO'), s: `${conComa((clicsP / alcanceP) * 100)} de cada 100 que la vieron hicieron clic` },
          { k: 'ROAS de esta pieza', v: `${conComa(p.roas)}x`, s: `su ROAS del mes es ${ROAS_MES}`, tono: p.roas >= ROAS_MES_N ? 'green' : 'amber' },
          { k: 'Estado ahora', v: enPausa(p.titulo) ? 'en pausa' : 'publicada', tono: enPausa(p.titulo) ? 'amber' : 'green' },
        ] },
        { tipo: 'texto', texto: p.titulo === peor.titulo
          ? `Es la que menos devuelve: ${conComa(p.roas)}x contra ${conComa(promedioRoas)}x de las 3 juntas. Por eso el motor la vigila de cerca: si sigue bajando, le va a pedir refrescar el creativo.`
          : `Rinde ${conComa(p.roas)}x contra ${conComa(promedioRoas)}x de las 3 juntas: está por encima de su promedio, así que conviene dejarla como está.` },
        { tipo: 'aviso', tono: enPausa(p.titulo) ? 'amber' : 'green', texto: enPausa(p.titulo)
          ? 'Está en pausa: dejó de sumar alcance y clics y no gasta hasta que la reanude. Lo que ya rindió queda en la bitácora.'
          : 'Está publicada y sigue sumando. Si la pausa, el número se congela donde está y la puede reanudar cuando quiera: no se pierde nada.' },
      ],
      fuente: 'Lectura cada 15 minutos de sus propias cuentas: alcance, clics y ROAS de esta pieza sola. Ningún número de aquí está cargado a mano.',
      acciones: [
        enPausa(p.titulo)
          ? { label: `Reanudar «${p.titulo}»`, variante: 'primary' as const, onClick: () => reanudar(p.titulo) }
          : { label: `Pausar «${p.titulo}»`, variante: 'primary' as const, onClick: () => pausar(p.titulo) },
        { label: 'Cerrar', onClick: () => {} },
      ],
    });
  };

  // (a) El informe completo: las 3 piezas, cómo se reparten el alcance y qué está haciendo el motor.
  const informe = () => detalle({
    titulo: 'El informe completo de sus 3 piezas',
    sub: 'Todo lo que pasó desde que salieron, con los mismos números que ve en la pantalla: aquí no hay promedios de la industria.',
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Personas alcanzadas', v: alcance.toLocaleString('es-CO'), s: 'las 3 piezas juntas, medido en sus cuentas' },
        { k: 'Clics al sitio', v: clics.toLocaleString('es-CO'), s: `${conComa((clics / alcance) * 100)} de cada 100 que las vieron` },
        { k: 'Ventas desde que salieron', v: String(ventas), s: 'las que el motor pudo atar a estas 3 piezas' },
        { k: 'ROAS combinado', v: roas ? `${conComa(roas)}x` : '—', s: `su ROAS del mes es ${ROAS_MES}`, tono: roas && Number(roas) >= ROAS_MES_N ? 'green' : 'amber' },
        { k: 'Piezas en línea', v: `${activas.length} de ${PUBLICADAS.length}`, s: pausadas.length ? `en pausa: ${pausadas.map(t => `«${t}»`).join(', ')}` : 'ninguna en pausa' },
      ] },
      { tipo: 'filas', items: PUBLICADAS.map((p, i) => ({
        t: p.titulo,
        s: `${p.formato} · ${p.red} · ${alcanceDe(p, i).toLocaleString('es-CO')} de alcance · ${clicsDe(p, i).toLocaleString('es-CO')} clics`,
        etiqueta: `${conComa(p.roas)}x`,
        tono: enPausa(p.titulo) ? 'muted' : p.roas < ROAS_MES_N ? 'amber' : 'green',
      })) },
      { tipo: 'aviso', tono: 'amber', texto: `La que va más abajo es «${peor.titulo}»: ${conComa(peor.roas)}x contra ${conComa(promedioRoas)}x de las 3, y abajo de su ROAS del mes (${ROAS_MES}). Es la única que el motor está vigilando de cerca: si sigue bajando, le pide refrescar el creativo antes de gastar más.` },
      { tipo: 'texto', texto: `Mientras no mira: ${EXCEPCIONES.find(e => e.key === 'vigilancia')!.nota}` },
    ],
    fuente: 'Sale de sus 3 piezas publicadas: alcance, clics y ROAS leídos cada 15 minutos. El gasto y el público de cada campaña están en «Mis campañas».',
    acciones: [
      flojasCorriendo.length
        ? { label: `Frenar ${flojasCorriendo.length === 1 ? 'la que no rinde' : `las ${flojasCorriendo.length} que no rinden`}`, variante: 'primary' as const, onClick: frenarLasQueNoRinden }
        : { label: `Reanudar «${flojas[0].titulo}»`, variante: 'primary' as const, onClick: () => reanudar(flojas[0].titulo) },
      { label: 'Cerrar', onClick: () => {} },
    ],
  });

  // (a) Campaña nueva: qué va a hacer el motor antes de arrancar, y recién ahí el paso 1 del flujo.
  const irAlPaso1 = () => {
    if (ir) { ir(1); setToast('Campaña nueva: arranca en el paso 1'); }
    else setToast('Abra Campañas para arrancar una campaña nueva');
  };
  const campanaNueva = () => detalle({
    titulo: 'Campaña nueva: cómo arranca',
    sub: 'Le deja al principio del flujo. El camino corto: dice qué quiere, Sinkroo crea y MiroFish vota antes de que se gaste un peso.',
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Dónde arranca', v: `Paso 1 · ${PASOS_CAMPANA[0].t}`, s: PASOS_CAMPANA[0].d },
        { k: 'Material que ya tiene', v: `${ARCHIVOS_SUBIDOS} archivos`, s: 'los de su carpeta: fotos, reseñas, videos, logo y catálogo' },
        { k: 'El ángulo que gana hoy', v: `${ANGULO_QUE_GANA.nombre} · ${ANGULO_QUE_GANA.pct}%`, s: 'es el que más usa su rubro: arrancar por aquí es arrancar donde ya hay demanda' },
        { k: 'Lo que cuesta', v: `${COSTO_CAMPANA} créditos`, s: `los mismos que costó «Lanzamiento D2C». Hoy tiene ${TENANT.creditos.toLocaleString('es-CO')} créditos` },
        { k: 'Quién la juzga', v: '5 jueces + 500 del público', s: 'arriba de 80 se publica; abajo, vuelve con la objeción' },
      ] },
      { tipo: 'pasos', items: PASOS_CAMPANA.map(p => `${p.t}: ${p.d}`) },
      { tipo: 'texto', texto: `Las ${PUBLICADAS.length} piezas que están en línea siguen corriendo tal como están: la campaña nueva es otra cosa y no las toca.` },
      { tipo: 'aviso', tono: 'green', texto: EXCEPCIONES.find(e => e.key === 'publicar')!.nota },
    ],
    fuente: 'Los archivos salen de su carpeta ya subida, el costo del historial de créditos del plan Pro y el ángulo, de los 47 anuncios que leyó Lux en su rubro.',
    acciones: [
      { label: 'Empezar de cero (paso 1)', variante: 'primary' as const, onClick: irAlPaso1 },
      { label: 'Cerrar', onClick: () => {} },
    ],
  });

  return (
    <>
      <Card className="live-head">
        <div className="row spread" style={{ gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="row" style={{ gap: 11, flex: 1, minWidth: 240 }}>
            <span className="dot-live" />
            <div style={{ minWidth: 0 }}>
              <div className="bt">Monitoreo directo, en vivo</div>
              <div className="bs">
                {activas.length === PUBLICADAS.length
                  ? `Sus ${PUBLICADAS.length} piezas están en sus redes.`
                  : `${activas.length} de sus ${PUBLICADAS.length} piezas están corriendo y ${pausadas.length} en pausa.`}{' '}
                <b>El motor las mira cada 15 minutos</b> y le avisa si alguna se enfría o si conviene moverle presupuesto.
              </div>
            </div>
          </div>
          <Badge tone={pausadas.length ? 'amber' : 'green'}>
            {pausadas.length ? `${activas.length} de ${PUBLICADAS.length} en línea` : `${PUBLICADAS.length} publicadas`}
          </Badge>
        </div>
      </Card>

      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Trend size={14} style={{ color: 'var(--green)' }} /> Cómo va todo junto</span>}
          action={<Badge tone={activas.length ? 'green' : 'amber'}>{activas.length ? 'en vivo' : 'todo en pausa'}</Badge>}
        >
          <div className="live-nums">
            <div className="live-n">
              <span className="live-v" style={{ color: 'var(--green)' }}>{alcance.toLocaleString('es-CO')}</span>
              <span className="live-l">personas alcanzadas</span>
            </div>
            <div className="live-n">
              <span className="live-v" style={{ color: 'var(--purple3)' }}>{clics.toLocaleString('es-CO')}</span>
              <span className="live-l">clics al sitio</span>
            </div>
            <div className="live-n">
              <span className="live-v" style={{ color: 'var(--green)' }}>{ventas}</span>
              <span className="live-l">ventas desde que salieron</span>
            </div>
            <div className="live-n">
              <span className="live-v">{roas ? `${conComa(roas)}x` : '—'}</span>
              <span className="live-l">ROAS combinado{activas.length < PUBLICADAS.length ? ' (solo las que corren)' : ''}</span>
            </div>
          </div>
          <div>
            <div className="bs" style={{ marginBottom: 8 }}>Cuánto rinde cada pieza:</div>
            {ORDEN_RINDE.map(t => {
              const p = PUBLICADAS.find(x => x.titulo === t)!;
              const pausa = enPausa(p.titulo);
              return (
                <BarRow key={p.titulo} label={pausa ? `${p.corto} · en pausa` : p.corto}
                  valor={p.roas} max={maxRoas} formato={`${conComa(p.roas)}x`}
                  color={pausa ? 'var(--muted)' : p.tinte} />
              );
            })}
          </div>
          <div className="acc-why">
            <b>Monitoreo directo quiere decir esto:</b> no es un informe de ayer, es lo que está pasando
            mientras mira. Si un número se cae, el motor actúa o le avisa.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Check size={14} style={{ color: 'var(--green)' }} /> Lo que está publicado</span>}
          action={<Badge tone={pausadas.length ? 'amber' : 'purple'}>
            {pausadas.length ? `${activas.length} en línea · ${pausadas.length} en pausa` : `${PUBLICADAS.length} piezas`}
          </Badge>}
        >
          {PUBLICADAS.map((p, i) => {
            const pausa = enPausa(p.titulo);
            return (
              <div key={p.titulo} className="pub">
                <span className="pub-mini"
                  style={{ background: `linear-gradient(150deg, ${p.color}, ${p.color}22 70%, var(--bg3))` }}
                  title={`${p.formato} · ${p.red}`}>
                  <span className="pub-mini-ico">
                    {/video|reel/i.test(p.formato) ? <I_Film size={16} />
                      : /carrusel/i.test(p.formato) ? <I_File size={16} />
                      : <I_Image size={16} />}
                  </span>
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="rank-t">{p.titulo}</span>
                  <span className="rank-m">{p.formato} · {p.red}</span>
                  <span className="pub-nums">
                    <span>{alcanceDe(p, i).toLocaleString('es-CO')} alcance</span>
                    <span>{clicsDe(p, i).toLocaleString('es-CO')} clics</span>
                    <span style={{ color: pausa ? 'var(--muted)' : 'var(--green)', fontWeight: 800 }}>{conComa(p.roas)}x</span>
                  </span>
                </span>
                <span className="row" style={{ gap: 6, flexShrink: 0 }}>
                  {pausa && <Badge tone="amber">en pausa</Badge>}
                  <Button variant="ghost" className="btn-sm"
                    title={pausa
                      ? `Reanuda «${p.titulo}»: vuelve a sumar alcance y clics desde donde quedó. Es reversible.`
                      : `Pausa «${p.titulo}» ahora: deja de sumar y el número queda congelado donde está. No gasta mientras esté en pausa y la reanuda cuando quiera.`}
                    onClick={() => { if (pausa) reanudar(p.titulo); else pausar(p.titulo); }}>
                    {pausa ? <I_Play size={12} /> : <I_Pause size={12} />}
                  </Button>
                  <Button variant="ghost" className="btn-sm"
                    title={`Abre el detalle en vivo de «${p.titulo}»: su alcance, sus clics, su ROAS y su parte sobre las 3 piezas`}
                    onClick={() => detallePieza(p, i)}><I_Eye size={12} /></Button>
                </span>
              </div>
            );
          })}
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            {flojasCorriendo.length > 0 ? (
              <Button variant="outline" className="btn-sm"
                title={`Frena la pieza que devuelve menos que su ROAS del mes (${ROAS_MES}): deja de sumar y de gastar, con el número congelado donde está. Es reversible: la reanuda cuando quiera.`}
                onClick={frenarLasQueNoRinden}>
                <I_Zap size={13} /> Frenar las que no rinden{flojasCorriendo.length > 1 ? ` (${flojasCorriendo.length})` : ''}
              </Button>
            ) : flojas.length > 0 ? (
              <Button variant="ghost" className="btn-sm"
                title={`Vuelve a poner en línea «${flojas[0].titulo}»: sigue desde donde quedó, sin perder el historial. Es reversible.`}
                onClick={() => { flojas.forEach(p => reanudar(p.titulo, false)); setToast(`En línea de nuevo: ${flojas.map(p => `«${p.titulo}»`).join(', ')}`); }}>
                <I_Play size={13} /> Reanudar «{flojas[0].titulo}»
              </Button>
            ) : null}
            <Button variant="ghost" className="btn-sm"
              title="Abre el informe de las 3 piezas: alcance, clics, ventas y ROAS de cada una, y qué hizo el motor mientras no miraba"
              onClick={informe}>Ver el informe completo</Button>
          </div>
          {pausadas.length > 0 && (
            <div className="tiny" style={{ marginTop: 10, color: 'var(--amber)', fontWeight: 700 }}>
              En pausa: {PUBLICADAS.filter(p => enPausa(p.titulo)).map(p => `«${p.titulo}» (${conComa(p.roas)}x)`).join(' · ')}.
              Dejaron de sumar alcance y clics y no gastan hasta que las reanude: lo que ya rindieron queda en la bitácora.
            </div>
          )}
          <div className="acc-why">
            Cada pieza se puede <b>pausar sin perder nada</b>: lo que ya rindió queda en la bitácora y la
            puede reactivar cuando quiera.
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
              <span className="guard-lb">«Antes y después» bajó un poco<small>Pasó de 4,0x a 3,6x: la frecuencia subió. Si sigue, el motor le va a pedir refrescar el creativo</small></span>
              <span className="guard-val" style={{ color: 'var(--amber)' }}>vigilando</span></div>
            <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Zap size={14} /></span>
              <span className="guard-lb">Presupuesto repartido solo<small>Le sacó <Dinero monto="$4/día" equivalente={false} /> a la que más rinde y ya tiene techo de gasto</small></span>
              <span className="guard-val">hace 20 min</span></div>
          </div>
          <div className="acc-why">
            Esto es lo que el motor hace <b>mientras no mira</b>. Usted ve el resultado aquí y se entera
            de cada movimiento en la bitácora.
          </div>
          <NotaMoneda />
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Refresh size={14} style={{ color: 'var(--purple3)' }} /> ¿Y después?</span>}
          action={<Badge tone="purple">el ciclo sigue</Badge>}
        >
          <div className="bs">
            Cuando una pieza se enfría, el ciclo arranca de nuevo <b>sin que haga nada</b>:
            vuelve a MiroFish, se crean opciones nuevas y salen las mejores.
          </div>
          <div className="guards">
            <div className="guard"><span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Play size={14} /></span>
              <span className="guard-lb">Revisa lo que está rindiendo<small>Cuál de sus piezas trae la gente más barata</small></span></div>
            <div className="guard"><span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Refresh size={14} /></span>
              <span className="guard-lb">Crea variantes de la que gana<small>Con el mismo ángulo y los colores que ya funcionaron</small></span></div>
            <div className="guard"><span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Eye size={14} /></span>
              <span className="guard-lb">Reemplaza la que se enfría<small>No se apaga nada hasta que la nueva rinde igual o mejor</small></span></div>
          </div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button variant="ghost" className="btn-sm"
              title="Le muestra con qué arranca una campaña nueva (el material que ya tiene, el ángulo que gana y lo que cuesta) y desde ahí le lleva al paso 1 del flujo. Nada se publica ni se gasta hasta que lo confirme."
              onClick={campanaNueva}>Crear una campaña nueva</Button>
          </div>
          <div className="acc-why">
            El ciclo <b>no se corta</b>: lo que se publica alimenta lo que se crea después.
            Cuanto más corre, mejor elige.
          </div>
        </Card>
      </div>
    </>
  );
}
