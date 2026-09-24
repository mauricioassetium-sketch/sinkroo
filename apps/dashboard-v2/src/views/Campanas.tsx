import { useState } from 'react';
import { Card, Badge, Button, Dinero, NotaMoneda } from '../components/ui';
import { ViewHead, Bars, Ring, Gauge } from '../components/viz';
import { Publicar } from '../components/Publicar';
import { FlujoMiroFish } from '../components/FlujoMiroFish';
import { Stepper, IngestaManual, Galeria, PASOS_CAMPANA, type PasoCampana } from '../components/CampanaPasos';
import { MotorEnVivo } from '../components/MotorEnVivo';
import { EnLinea } from '../components/EnLinea';
import { CampanaViva } from '../components/CampanaViva';
import { I_Megaphone, I_Check, I_Refresh, I_Vote, I_File, I_Zap, I_Trend, I_Eye, I_Robot, I_Play, I_Upload, I_Pause } from '../components/icons';
import type { Vista } from '../components/Layout';
import { CAMPANAS, TENANT, type Campana, type Modo } from '../data/demo';
import { usePlan } from '../lib/plan';
import { PERFILES, puntaje, ranking, objeciones, TARIFA } from '../data/mirofish';
import { useDetalle } from '../components/Detalle';
import { numeroConMiles } from '../lib/perfil';

const GASTO_LB = CAMPANAS.map(c => c.nombre.split(' ')[0]);

// Las dos campañas que nombran las recomendaciones del panel: la que mejor devuelve (7,3x) y la que
// va abajo del promedio (2,4x). Se leen de los datos, no se escriben a mano: si cambia el número,
// cambia la recomendación.
const PACK = CAMPANAS.find(c => c.roas === '7,3x') ?? CAMPANAS[CAMPANAS.length - 1];
const MARCA = CAMPANAS.find(c => c.roas === '2,4x') ?? CAMPANAS[CAMPANAS.length - 1];

/** Lo que una campaña tiene asignado por día, leído de sus propios datos: '$40/día' → 40. */
const presuDelTexto = (presupuesto: string) => Number(presupuesto.replace(/[^0-9]/g, ''));
const presuBase = (c: Campana) => presuDelTexto(c.presupuesto);
/** El día de hoy: es lo que queda escrito cuando una pieza sale a tus redes. */
const hoy = () => new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });

type EstadoCamp = Campana['estado'];

export function ViewCampanas({ setToast, modo, setVista }: { setToast: (t: string) => void; modo: Modo; setVista: (v: Vista) => void }) {
  const detalle = useDetalle();
  const { plan } = usePlan();
  const [paso, setPaso] = useState<PasoCampana>(1);
  const [manual, setManual] = useState(false);
  // --- Lo que un botón cambia en la pantalla. Nada de avisos que se van solos: la campaña se muda
  // de lista, el presupuesto cambia en la fila y en el gráfico, el contador sube, y cada acción deja
  // el botón que la deshace al lado. Los avisos (setToast) acompañan; el estado es lo que queda.
  const [estados, setEstados] = useState<Record<string, EstadoCamp>>({});
  const [presuExtra, setPresuExtra] = useState<Record<string, number>>({});
  const [techo, setTecho] = useState(1640);
  const [aplicadas, setAplicadas] = useState<string[]>([]);
  const [publicadas, setPublicadas] = useState<string[]>([]);
  const [corregidas, setCorregidas] = useState<string[]>([]);
  const [aviso, setAviso] = useState<{ t: string; tono: 'green' | 'amber' } | null>(null);
  const listos = PASOS_CAMPANA.filter(p => p.n < paso).map(p => p.n) as PasoCampana[];
  // --- Última fila del paso 5: LISTA + DETALLE con una sola fuente de datos.
  // Las piezas y los jueces salen de mirofish.ts: las mismas 5 opciones de la galería del paso 3
  // y los mismos 5 perfiles que las votaron. El puntaje es el promedio de esos 5 votos.
  const piezasJuzgadas = ranking();                       // las 5, de mayor a menor puntaje
  const [elegida, setElegida] = useState<string>(() => piezasJuzgadas[0].id);
  const pieza = piezasJuzgadas.find(o => o.id === elegida) ?? piezasJuzgadas[0];
  const scorePieza = puntaje(pieza);
  const pasaPieza = scorePieza >= 80;
  const votosPieza = PERFILES.map(per => ({
    k: per.k, nombre: per.nombre, mira: per.mira,
    score: pieza.votos[per.k], opinion: pieza.opiniones[per.k],
  }));
  const votoMasBajo = votosPieza.reduce((a, b) => (b.score < a.score ? b : a));
  const colorScore = (s: number) => (s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--red)');
  const palabraVeredicto = (s: number) => (s >= 80 ? 'Lista' : s >= 60 ? 'Revisar' : 'No lanzar');
  const tonoVeredicto = (s: number): 'green' | 'amber' | 'red' => (s >= 80 ? 'green' : s >= 60 ? 'amber' : 'red');
  const criterioPieza = (s: number) => s >= 80
    ? `Pasa: arriba de 80 se publica. El promedio de los ${PERFILES.length} jueces dio ${s}.`
    : s >= 60
      ? `Vuelve con la objeción: entre 60 y 80 no gasta un peso hasta corregir eso. El promedio dio ${s}.`
      : `No se lanza: abajo de 60 no se gasta. El promedio de los ${PERFILES.length} jueces dio ${s}.`;
  const artefactos = CAMPANAS.reduce((s, c) => s + c.artefactos, 0);

  // --- Las campañas, con el estado y el presupuesto que tienen AHORA (no los de la data original).
  // Así lo que hace un botón se ve en la misma pantalla: la fila, la tarjeta en vivo, el contador y
  // el gráfico del día salen todos de acá. La data original queda intacta para poder volver atrás.
  const estadoDe = (c: Campana): EstadoCamp => estados[c.id] ?? c.estado;
  const presuDia = (c: Campana) => {
    const base = CAMPANAS.find(o => o.id === c.id);
    return (base ? presuDelTexto(base.presupuesto) : presuDelTexto(c.presupuesto)) + (presuExtra[c.id] ?? 0);
  };
  const conLoDeAhora = (c: Campana): Campana => ({ ...c, estado: estadoDe(c), presupuesto: `$${presuDia(c)}/día` });
  const campanas = CAMPANAS.map(conLoDeAhora);
  const gasto = CAMPANAS.map(presuDia);                 // lo asignado por día, campaña por campaña
  const diario = gasto.reduce((s, v) => s + v, 0);
  const vivas = campanas.filter(c => c.estado === 'Activa');
  const otras = campanas.filter(c => c.estado !== 'Activa');
  // --- El techo del mes: el medidor, el badge y la línea de abajo salen de este único número.
  const invertido = 1240;
  const pctTecho = Math.round((invertido / techo) * 100);
  const quedaTecho = 100 - pctTecho;
  const cierreProyectado = 1580;
  const techoAviso = techo < cierreProyectado
    ? `Ojo: el cierre proyectado es $${numeroConMiles(cierreProyectado)} y el techo quedó en $${numeroConMiles(techo)}. El motor frena cuando lo alcances: esos $${numeroConMiles(cierreProyectado - techo)} no se gastan.`
    : `El cierre proyectado es $${numeroConMiles(cierreProyectado)}: con el techo en $${numeroConMiles(techo)} entran y te quedan $${numeroConMiles(techo - cierreProyectado)} de aire si el mes se sale de lo previsto.`;

  const lblAccion = (e: EstadoCamp) => (e === 'Borrador' ? 'Publicar' : e === 'En pausa' ? 'Reactivar' : e === 'Finalizada' ? 'Ver el informe' : 'Pausar');
  const titleAccion = (e: EstadoCamp) =>
    e === 'Borrador' ? 'Publica la campaña: sale a tus redes y arranca a gastar su presupuesto diario. Es reversible: la pausás cuando quieras y no pierde el historial.'
      : e === 'En pausa' ? 'La vuelve a poner en marcha: sigue desde donde estaba, con la misma pieza y el mismo historial. Reversible: la volvés a pausar cuando quieras.'
        : e === 'Finalizada' ? 'Abre el informe final: qué rindió, cuánto gastó y qué dejó para la próxima.'
          : 'Pausa la campaña y deja de gastar. Es reversible: la reactivás cuando quieras y no pierde nada.';

  // ============================ LOS BOTONES QUE HACEN (y se ve en la pantalla) ============================

  /** La fila de «las que no están corriendo»: publicar, reactivar o pausar. La campaña se muda de sección. */
  const moverCampana = (c: Campana) => {
    const e = estadoDe(c);
    if (e === 'Finalizada') {
      detalle({
        titulo: `El informe de «${c.nombre}»`,
        sub: 'Qué rindió, cuánto gastó y qué dejó para la próxima. La campaña terminó, pero sus piezas y su historial siguen acá.',
        bloques: [
          { tipo: 'datos', filas: [
            { k: 'Cómo terminó', v: 'Finalizada', s: `corrió ${c.fechas}` },
            { k: 'Gastado en total', v: c.gastado, s: 'lo que costó la campaña completa' },
            { k: 'Devolvió por peso invertido', v: c.roas, tono: 'green', s: 'contra el 3,8x de tu promedio' },
            { k: 'Conversiones', v: String(c.conversiones), s: `a ${c.costo} cada una` },
            { k: 'Alcance', v: c.alcance, s: 'personas distintas que la vieron' },
            { k: 'Piezas que dejó', v: String(c.artefactos), s: 'quedan guardadas para reusar' },
          ] },
          { tipo: 'texto', texto: `Salió en ${c.plataforma} para ${c.publico}.` },
          { tipo: 'aviso', texto: 'Lo que funcionó se puede volver a publicar: la campaña no se borra y sus piezas quedan.' },
        ],
        fuente: 'Los números finales de la campaña, tal como quedaron al terminar.',
      });
      return;
    }
    const nuevo: EstadoCamp = e === 'Activa' ? 'En pausa' : 'Activa';
    setEstados(s => ({ ...s, [c.id]: nuevo }));
    setAviso(nuevo === 'Activa'
      ? { tono: 'green', t: `«${c.nombre}» quedó activa: sale a tus redes y gasta $${presuDia(c)} por día desde ahora.` }
      : { tono: 'amber', t: `«${c.nombre}» quedó en pausa: deja de gastar sus $${presuDia(c)} por día y no pierde el historial.` });
    setToast(nuevo === 'Activa'
      ? `«${c.nombre}» salió a tus redes: gasta $${presuDia(c)} por día`
      : `«${c.nombre}» en pausa: la reactivás cuando quieras`);
  };

  /** Recomendación 1: subirle $5 por día a la que mejor devuelve. Queda en $14 y vuelve a correr. */
  const aplicarSubir = () => {
    const antes = presuDia(PACK);
    setPresuExtra(s => ({ ...s, [PACK.id]: 5 }));
    setEstados(s => ({ ...s, [PACK.id]: 'Activa' }));
    setAplicadas(a => (a.includes('presu') ? a : [...a, 'presu']));
    setToast(`${PACK.nombre}: de $${antes} a $${antes + 5} por día y vuelve a correr`);
  };
  const deshacerSubir = () => {
    setPresuExtra(s => { const n = { ...s }; delete n[PACK.id]; return n; });
    setEstados(s => { const n = { ...s }; delete n[PACK.id]; return n; });
    setAplicadas(a => a.filter(k => k !== 'presu'));
    setToast(`${PACK.nombre} vuelve a como estaba: $${presuBase(PACK)} por día, en pausa`);
  };

  /** Recomendación 2: pausar la que va abajo del promedio. Deja de gastar en ese mismo momento. */
  const aplicarPausar = () => {
    setEstados(s => ({ ...s, [MARCA.id]: 'En pausa' }));
    setAplicadas(a => (a.includes('pausar') ? a : [...a, 'pausar']));
    setToast(`${MARCA.nombre}: en pausa, deja de gastar $${presuDia(MARCA)} por día`);
  };
  const deshacerPausar = () => {
    setEstados(s => { const n = { ...s }; delete n[MARCA.id]; return n; });
    setAplicadas(a => a.filter(k => k !== 'pausar'));
    setToast(`${MARCA.nombre} vuelve a correr como estaba: $${presuBase(MARCA)} por día`);
  };

  /** Recomendación 3: Nia escribe 3 variantes del mismo mensaje para rotar el creativo. */
  const aplicarVariantes = () => {
    setAplicadas(a => (a.includes('variantes') ? a : [...a, 'variantes']));
    setToast(`Nia está escribiendo 3 variantes de ${PACK.nombre}: ${3 * TARIFA.crearVariante} créditos`);
  };
  const deshacerVariantes = () => {
    setAplicadas(a => a.filter(k => k !== 'variantes'));
    setToast('Se canceló la escritura: no se escribió ninguna variante y no se gastó ningún crédito');
  };

  /** El techo del mes: subirlo o bajarlo cambia el medidor, el badge y lo que queda por gastar. */
  const cambiarTecho = () => detalle({
    titulo: 'El techo del mes',
    sub: 'Es el freno de gasto: el motor mueve plata solo, pero nunca pasa este número sin tu permiso. Podés subirlo o bajarlo y volver atrás cuando quieras.',
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Techo de este mes', v: `$${numeroConMiles(techo)}`, s: techo === 1640 ? 'el que tenías puesto' : 'el que pusiste recién' },
        { k: 'Invertido hasta hoy', v: `$${numeroConMiles(invertido)}`, s: `el ${pctTecho}% del techo` },
        { k: 'Te queda', v: `$${numeroConMiles(techo - invertido)}`, s: `${quedaTecho}% del techo por gastar`, tono: quedaTecho <= 15 ? 'red' : quedaTecho <= 25 ? 'amber' : 'green' },
        { k: 'Cierre proyectado', v: `$${numeroConMiles(cierreProyectado)}`, s: 'a dónde llega el mes si todo sigue igual' },
        { k: 'Días que quedan', v: '8', s: 'hasta el cierre del mes' },
        { k: 'Campañas que lo comparten', v: String(CAMPANAS.length), s: `$${numeroConMiles(diario)} por día entre todas` },
      ] },
      { tipo: 'texto', texto: `Cada campaña tiene su presupuesto por día y el motor los reparte según lo que rinde: hoy son $${numeroConMiles(diario)} por día entre las ${CAMPANAS.length}.` },
      { tipo: 'aviso', tono: techo < cierreProyectado ? 'amber' : 'green', texto: techoAviso },
    ],
    fuente: 'Sale de lo invertido por tus campañas del mes y del techo que tenés configurado.',
    acciones: techo === 1640 ? [
      { label: 'Subirlo a $1.800', variante: 'primary', onClick: () => { setTecho(1800); setToast('Techo del mes en $1.800: el cierre proyectado entra con aire'); } },
      { label: 'Bajarlo a $1.500', onClick: () => { setTecho(1500); setToast('Techo del mes en $1.500: te quedan $260'); } },
    ] : [
      { label: 'Volver al techo de $1.640', variante: 'primary', onClick: () => { setTecho(1640); setToast('Techo del mes de vuelta en $1.640'); } },
      techo === 1800
        ? { label: 'Bajarlo a $1.500', onClick: () => { setTecho(1500); setToast('Techo del mes en $1.500: te quedan $260'); } }
        : { label: 'Subirlo a $1.800', onClick: () => { setTecho(1800); setToast('Techo del mes en $1.800: el cierre proyectado entra con aire'); } },
    ],
  });

  /** En qué se va cada peso del día, campaña por campaña, con lo que cada una devuelve. */
  const verDetalleGasto = () => detalle({
    titulo: 'En qué se va cada peso del día',
    sub: `Son $${diario} por día repartidos entre tus ${CAMPANAS.length} campañas. El reparto no es fijo: el motor lo mueve todos los días hacia la que mejor devuelve.`,
    bloques: [
      { tipo: 'filas', items: campanas.map(c => ({
        t: c.nombre,
        s: `${c.estado === 'Activa' ? 'corriendo' : c.estado.toLowerCase()} · ${c.roas === '—' ? 'todavía sin datos de retorno' : `devuelve ${c.roas}`} · ${c.pct}% del presupuesto consumido`,
        etiqueta: `$${presuDia(c)}/día`,
        tono: c.estado === 'Activa' ? 'green' : 'muted',
      })) },
      { tipo: 'datos', filas: [
        { k: 'Total por día', v: `$${numeroConMiles(diario)}`, s: 'lo que sale por día con tus campañas así' },
        { k: 'Por semana', v: `$${numeroConMiles(diario * 7)}`, s: '7 días al mismo ritmo' },
        { k: 'Por mes', v: `$${numeroConMiles(diario * 30)}`, s: '30 días al mismo ritmo' },
        { k: 'La que más rinde', v: `${PACK.nombre} · ${PACK.roas}`, tono: 'green', s: 'contra el 3,8x de tu promedio' },
        { k: 'La que menos rinde', v: `${MARCA.nombre} · ${MARCA.roas}`, tono: 'amber', s: 'por eso encabeza las acciones de abajo' },
      ] },
      { tipo: 'aviso', texto: 'Ninguna campaña gasta más de lo que tiene asignado y el techo del mes manda sobre todas: es el freno que no se puede desactivar.' },
    ],
    fuente: 'Los presupuestos que tenés asignados hoy, campaña por campaña.',
  });

  /** La pieza que no llegó a 80: se corrige con la objeción del juez más duro y el panel la vuelve a votar. */
  const corregirPieza = () => detalle({
    titulo: `Corregir «${pieza.titulo}» y volver a juzgarla`,
    sub: `Los ${PERFILES.length} jueces le dieron ${scorePieza}: abajo de 80 no se gasta un peso. Acá está lo que objetó cada uno y lo que cambia Nia.`,
    bloques: [
      { tipo: 'filas', items: objeciones(pieza).map(o => ({
        t: o.juez,
        s: `«${o.texto}»`,
        etiqueta: `${o.voto} de 100`,
        tono: o.voto < 60 ? 'red' : 'amber',
      })) },
      { tipo: 'datos', filas: [
        { k: 'Qué cambia Nia', v: 'la objeción, nada más', s: 'mismo formato, mismo producto y mismo público' },
        { k: 'Quién la vuelve a juzgar', v: `${PERFILES.length} jueces + 500 del público`, s: 'al público no se le cobra nunca' },
        { k: 'Lo que cuesta', v: `${TARIFA.crearVariante + TARIFA.evaluarPieza} créditos`, s: `1 variante (${TARIFA.crearVariante}) + volver a juzgarla (${TARIFA.evaluarPieza})` },
        { k: 'Créditos que tenés', v: String(TENANT.creditos), s: `Plan ${plan.nombre}` },
      ] },
      { tipo: 'aviso', texto: 'La versión de ahora no se pierde: si te gustaba más, volvés a ella cuando quieras.' },
    ],
    fuente: 'Las objeciones salen del voto de cada juez en MiroFish, sobre esta pieza.',
    acciones: [
      { label: 'Que la corrija y la vuelva a juzgar', variante: 'primary', onClick: () => { setCorregidas(p => [...p, pieza.id]); setToast(`Nia corrigió «${pieza.titulo}»: los ${PERFILES.length} jueces la votan de nuevo`); } },
      { label: 'Dejarla como está', onClick: () => setToast('Sin cambios: la pieza queda como está') },
    ],
  });

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Megaphone size={19} />}
        titulo="Campañas"
        sub="Es un flujo por etapas: subís lo que tenés, Sinkroo crea, MiroFish vota y vos decidís mirando las piezas."
        nums={[
          { v: String(CAMPANAS.length), l: 'campañas' },
          { v: <Dinero monto={diario} />, l: 'invertido por día', c: 'var(--green)' },
          { v: '3,8x', l: 'ROAS del mes' },
          { v: String(artefactos), l: 'artefactos producidos', c: 'var(--purple3)' },
        ]}
      />

      {/* ==================== EL FLUJO, POR ETAPAS ==================== */}
      <Stepper actual={paso} ir={setPaso} listos={listos} />

      {paso === 1 && (
        <>
          <Card className="atajo">
            <div className="row spread" style={{ gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="row" style={{ gap: 11, flex: 1, minWidth: 240 }}>
                <span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Robot size={20} /></span>
                <div style={{ minWidth: 0 }}>
                  <div className="bt">Paso 1 · Decile a Sinkroo qué querés</div>
                  <div className="bs">Subí la info y el material. Sinkroo elige el tipo de campaña, el ángulo y el público, crea todo y lo manda a MiroFish. <b>Todo lo que subas pasa por ahí.</b></div>
                </div>
              </div>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                {!manual && (
                  <Button title="Arranca con el camino automático: Sinkroo elige el tipo de campaña, el ángulo y el público, crea las 5 opciones y las manda a MiroFish"
                    onClick={() => { setToast('Sinkroo arrancó: mirá el paso 2'); setPaso(2); }}>
                    <I_Play size={14} /> Iniciar
                  </Button>
                )}
                <Button variant="outline" className="btn-sm" title={manual ? 'Volver al camino con Sinkroo' : 'Si ya tenés las imágenes o los videos hechos, subilos y MiroFish los puntúa'}
                  onClick={() => setManual(!manual)}>
                  {manual ? <><I_Robot size={13} /> Mejor que lo haga Sinkroo</> : <><I_Upload size={13} /> Ya tengo todo listo</>}
                </Button>
              </div>
            </div>
          </Card>

          {manual
            ? <div style={{ marginTop: 16 }}><IngestaManual setToast={setToast} ir={setPaso} /></div>
            : <Publicar setToast={setToast} modo={modo} irAConversaciones={() => setVista('conversaciones')} soloIngesta />}
        </>
      )}

      {paso === 2 && (
        <>
          <div className="csec" style={{ marginTop: 16 }}>
            <span className="csec-n">2</span>
            <span className="csec-t">MiroFish</span>
            <span className="csec-c purple">{'5 jueces · 500 del público'}</span>
            <span className="csec-s">Todo lo que subiste cae acá: el mercado lo mira, vota y lo ordena del 1 al 5</span>
          </div>
          <MotorEnVivo setToast={setToast} />
          <FlujoMiroFish modo={modo} setToast={setToast} esAnuncio />
        </>
      )}

      {paso === 3 && <Galeria modo={modo} setToast={setToast} ir={setPaso} />}

      {paso === 4 && <EnLinea setToast={setToast} ir={setPaso} />}

      {paso === 5 && (<>
      <div className="csec" style={{ marginTop: 0 }}>
        <span className="csec-n">5</span>
        <span className="csec-t">Tus campañas y el panel</span>
        <span className="csec-s">Primero lo que está corriendo ahora, después los gráficos del mes y al final el veredicto de la última pieza</span>
      </div>

      {/* ============ 1. LAS QUE ESTÁN EN VIVO — la pieza, el texto del anuncio y el resultado ============ */}
      <div className="csec" style={{ marginTop: 6 }}>
        <span className="csec-n">1</span>
        <span className="csec-t">Tus campañas en vivo</span>
        <span className="csec-c purple">{vivas.length} corriendo</span>
        <span className="csec-s">Cada tarjeta muestra la pieza que se está viendo, el texto del anuncio y cómo está rindiendo</span>
      </div>
      <div className="cv-grid">
        {vivas.map(c => <CampanaViva key={c.id} c={c} setToast={setToast} />)}
      </div>

      {/* ============ 2. LAS QUE NO ESTÁN CORRIENDO — en fila compacta, sin ocupar media pantalla ============ */}
      <div className="csec">
        <span className="csec-n">2</span>
        <span className="csec-t">Las que no están corriendo</span>
        <span className="csec-c amber">{otras.length} sin correr</span>
        <span className="csec-s">No gastan nada y no pierden el historial: las reactivás cuando quieras</span>
      </div>
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Pause size={14} style={{ color: 'var(--amber)' }} /> El resto de tus campañas</span>}
        action={<Badge tone="muted">{otras.length} esperando</Badge>}
      >
        {aviso && (
          <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, fontWeight: 700, color: aviso.tono === 'green' ? 'var(--green)' : 'var(--amber)' }}>
            <I_Check size={13} /> {aviso.t}
          </div>
        )}
        {otras.length === 0 && (
          <div className="bs">No quedó ninguna esperando: tus {CAMPANAS.length} campañas están corriendo y comparten el techo del mes.</div>
        )}
        {otras.map(c => (
          <div key={c.id} className="cv-fila">
            <span className="cv-fila-emoji">{c.emoji}</span>
            <span className="cv-fila-nombre">
              <span className="bt">{c.nombre}</span>
              <span className="tiny muted">{c.tipo} · {c.plataforma} · {c.fechas}</span>
            </span>
            <Badge tone={c.estado === 'En pausa' ? 'amber' : c.estado === 'Borrador' ? 'muted' : 'purple'}>{c.estado}</Badge>
            <span className="cv-fila-datos">
              <span className="dato" title="Cuánto devuelve por cada peso invertido">
                <span className="dato-l">ROAS</span>
                <span className="dato-v" style={{ color: c.roas === '—' ? 'var(--muted)' : 'var(--green)' }}>{c.roas}</span>
              </span>
              <span className="dato" title="Lo que le pagás a Meta por día cuando la campaña corre">
                <span className="dato-l">Presupuesto</span>
                <span className="dato-v"><Dinero monto={c.presupuesto} /></span>
              </span>
              <span className="dato" title="Piezas que el motor ya creó para esta campaña">
                <span className="dato-l">Piezas</span>
                <span className="dato-v" style={{ color: 'var(--purple3)' }}>{c.artefactos}</span>
              </span>
            </span>
            <Button variant="ghost" className="btn-sm" title={titleAccion(c.estado)}
              onClick={() => moverCampana(c)}>
              {lblAccion(c.estado)}
            </Button>
          </div>
        ))}
        <div className="acc-why">
          Una campaña en pausa no gasta un peso y no pierde nada: queda esperando con sus piezas y su historial.
          <b> Los borradores no salen solos</b>: publicar siempre necesita tu OK, aunque el modo esté en Automático.
        </div>
      </Card>

      {/* ============ 3. LOS GRÁFICOS — cómo va el mes y qué conviene hacer ============ */}
      <div className="csec">
        <span className="csec-n">3</span>
        <span className="csec-t">Cómo va el mes y qué conviene hacer</span>
        <span className="csec-s">Con cuánta plata contás y en qué te conviene moverla</span>
      </div>
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--amber)' }} /> Tu presupuesto del mes</span>}
          action={<Badge tone={quedaTecho <= 15 ? 'red' : quedaTecho <= 25 ? 'amber' : 'green'}>queda {quedaTecho}%</Badge>}
        >
          <Gauge pct={pctTecho} label="Invertido del techo del mes"
            detalle={<><Dinero monto={invertido} equivalente={false} /> de <Dinero monto={techo} equivalente={false} /></>} color="var(--grad)" />
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Cierre proyectado</span><span className="dato-v"><Dinero monto={cierreProyectado} /></span></div>
            <div className="dato"><span className="dato-l">Días que quedan</span><span className="dato-v">8</span></div>
            <div className="dato"><span className="dato-l">Techo por día</span><span className="dato-v" style={{ color: 'var(--green)' }}><Dinero monto={diario} /></span></div>
          </div>
          <div>
            <div className="bs" style={{ marginBottom: 8 }}>Invertido por semana:</div>
            <Bars data={[280, 300, 320, 340]} labels={['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4']} color="#a855f7" fmt={v => <Dinero monto={v} equivalente={false} />} />
          </div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button variant="outline" className="btn-sm" title="Cambiás el techo mensual: podés subirlo o bajarlo y volver al valor de antes cuando quieras. El motor nunca lo pasa sin tu permiso."
              onClick={cambiarTecho}>Cambiar el techo</Button>
            <Button variant="ghost" className="btn-sm" title="Muestra en qué se va cada peso del día, campaña por campaña, y cuánto devuelve cada una"
              onClick={verDetalleGasto}>Ver el detalle</Button>
          </div>
          {techo !== 1640 && (
            <div className="tiny" style={{ marginTop: 9, fontWeight: 700, color: techo < cierreProyectado ? 'var(--amber)' : 'var(--green)' }}>
              Techo del mes en ${numeroConMiles(techo)}: usaste {pctTecho}% y te quedan ${numeroConMiles(techo - invertido)}. {techo < cierreProyectado
                ? `El cierre proyectado ($${numeroConMiles(cierreProyectado)}) no entra: el motor frena antes de esa diferencia.`
                : `El cierre proyectado ($${numeroConMiles(cierreProyectado)}) entra con $${numeroConMiles(techo - cierreProyectado)} de aire.`}
            </div>
          )}
          <div className="acc-why">
            Este es el <b>freno de gasto</b>: el motor mueve plata solo, pero nunca más allá del techo que pusiste.
            Si no cambiás nada, esta campaña se frena sola el día 30.
          </div>
          <NotaMoneda />
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--green)' }} /> Qué conviene hacer ahora</span>}
          action={<Badge tone="amber">{aplicadas.length === 0 ? '3 acciones' : `${aplicadas.length} de 3 aplicadas`}</Badge>}
        >
          <div className="guards">
            <div className="guard">
              <span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Trend size={14} /></span>
              <span className="guard-lb">Subirle $5 por día a {PACK.nombre}
                <small>Rinde {PACK.roas} contra el 3,8x de tu promedio: es la que mejor devuelve y está parada, con el presupuesto más bajo (${presuBase(PACK)} por día).</small>
                {aplicadas.includes('presu') && (
                  <small style={{ color: 'var(--green)', fontWeight: 700 }}>
                    Aplicado: quedó en ${presuBase(PACK) + 5} por día (era ${presuBase(PACK)}) y volvió a correr. A {PACK.roas}, esos $5 devuelven unos ${Math.floor(5 * 7.3)} por día.
                  </small>
                )}
              </span>
              {aplicadas.includes('presu') ? (
                <Button variant="ghost" className="btn-sm" title={`Deshace el aumento: vuelve a los $${presuBase(PACK)} por día y a la pausa. No se pierde nada del historial.`}
                  onClick={deshacerSubir}><I_Refresh size={12} /> Deshacer</Button>
              ) : (
                <Button className="btn-sm" title={`Sube el presupuesto de ${PACK.nombre} de $${presuBase(PACK)} a $${presuBase(PACK) + 5} por día y la vuelve a poner en marcha. Es reversible: con Deshacer vuelve a como estaba.`}
                  onClick={aplicarSubir}>+<Dinero monto={5} equivalente={false} />/día</Button>
              )}
            </div>
            <div className="guard">
              <span style={{ color: 'var(--red)', flexShrink: 0 }}><I_Zap size={14} /></span>
              <span className="guard-lb">Pausar {MARCA.nombre}
                <small>Gasta ${presuBase(MARCA)} por día y devuelve {MARCA.roas}, abajo del 3,8x de tu promedio: esa plata rinde más en la que devuelve {PACK.roas}.</small>
                {aplicadas.includes('pausar') && (
                  <small style={{ color: 'var(--green)', fontWeight: 700 }}>
                    Aplicada: quedó en pausa. Deja de gastar ${presuBase(MARCA)} por día y sus {MARCA.artefactos} piezas y su historial quedan intactos.
                  </small>
                )}
              </span>
              {aplicadas.includes('pausar') ? (
                <Button variant="ghost" className="btn-sm" title="La vuelve a poner en marcha: sigue desde donde estaba, con la misma pieza y el mismo historial."
                  onClick={deshacerPausar}><I_Refresh size={12} /> Deshacer</Button>
              ) : (
                <Button variant="ghost" className="btn-sm" title={`Pausa ${MARCA.nombre} ahora y deja de gastar sus $${presuBase(MARCA)} por día. Es reversible: con Deshacer vuelve a correr como estaba.`}
                  onClick={aplicarPausar}>Pausar</Button>
              )}
            </div>
            <div className="guard">
              <span style={{ color: 'var(--amber)', flexShrink: 0 }}><I_Eye size={14} /></span>
              <span className="guard-lb">Refrescar el creativo de {PACK.nombre}
                <small>Es la que trae cada venta más barata ({PACK.costo}) y su pieza ya lleva {PACK.artefactos} versiones: refrescar el mensaje es lo que sostiene ese costo.</small>
                {aplicadas.includes('variantes') && (
                  <small style={{ color: 'var(--green)', fontWeight: 700 }}>
                    Aplicado: Nia está escribiendo 3 variantes del mismo mensaje. Cuestan {3 * TARIFA.crearVariante} créditos de los {TENANT.creditos} que tenés y aparecen en la galería, en el paso 3.
                  </small>
                )}
              </span>
              {aplicadas.includes('variantes') ? (
                <Button variant="ghost" className="btn-sm" title="Cancela la escritura: no se escribe ninguna variante y no se gasta ningún crédito."
                  onClick={deshacerVariantes}><I_Refresh size={12} /> Deshacer</Button>
              ) : (
                <Button variant="ghost" className="btn-sm" title={`Nia escribe 3 variantes del mismo mensaje para rotar el creativo. Cuesta ${3 * TARIFA.crearVariante} créditos y no toca el presupuesto. Es reversible: si no te sirven, se descartan y no se gasta nada.`}
                  onClick={aplicarVariantes}>3 variantes</Button>
              )}
            </div>
          </div>
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">{aplicadas.length === 0 ? 'Si aplicás las 3' : `Aplicadas ${aplicadas.length} de 3`}</span><span className="dato-v" style={{ color: 'var(--green)' }}>+<Dinero monto={36} />/día</span></div>
            <div className="dato"><span className="dato-l">Riesgo</span><span className="dato-v">ninguno</span></div>
            <div className="dato"><span className="dato-l">Se deshace en</span><span className="dato-v" style={{ color: 'var(--purple3)' }}>24 h</span></div>
          </div>
          <div className="acc-why">
            Sale de tus propios números: compara cada campaña contra tu promedio.
            <b> Ninguna mueve más del 20% del presupuesto</b>, que es un freno duro que no se puede desactivar.
          </div>
        </Card>
      </div>

      {/* El gráfico de gasto cierra la sección: qué campaña se lleva cada peso del techo diario */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--green)' }} /> Dónde va tu presupuesto</span>}
        action={<Badge tone="green"><Dinero monto={diario} equivalente={false} />/día</Badge>}
      >
        <div className="graf-ancho">
          <Bars data={gasto} labels={GASTO_LB} color="#a855f7" fmt={v => <Dinero monto={v} equivalente={false} />} />
          <div className="col-stack">
            <div className="datos-row">
              <div className="dato"><span className="dato-l">Por semana</span><span className="dato-v"><Dinero monto={diario * 7} /></span></div>
              <div className="dato"><span className="dato-l">Por mes</span><span className="dato-v"><Dinero monto={diario * 30} /></span></div>
              <div className="dato"><span className="dato-l">La que más rinde</span><span className="dato-v" style={{ color: 'var(--green)' }}>{PACK.nombre} · {PACK.roas}</span></div>
            </div>
            <div className="acc-why">
              El presupuesto se reparte según lo que rinde, no según lo que ya estaba cargado.
              <b> El motor mueve plata solo</b> cuando el modo está en Automático y dentro de los frenos.
            </div>
          </div>
        </div>
      </Card>

      {/* ============ 4. LA LISTA DE PIEZAS Y EL VEREDICTO DE LA ELEGIDA — lista + detalle, con los mismos 5 jueces ============ */}
      <div className="csec">
        <span className="csec-n">4</span>
        <span className="csec-t">El veredicto y tus piezas</span>
        <span className="csec-c purple">{PERFILES.length} jueces · {piezasJuzgadas.length} piezas</span>
        <span className="csec-s">Elegí una pieza de la lista y al lado ves, voto por voto, cómo la juzgaron los 5 jueces y qué hay que corregirle</span>
      </div>
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_File size={14} style={{ color: 'var(--purple3)' }} /> Tus piezas, juzgadas</span>}
          action={<Badge tone="muted">{piezasJuzgadas.length} en el lote</Badge>}
        >
          <div className="datos-row">
            <div className="dato" title="Todas las piezas que pasaron por los jueces este mes, no solo las de este lote">
              <span className="dato-l">Juzgadas este mes</span>
              <span className="dato-v">31</span>
            </div>
            <div className="dato" title="Las que pasaron el mínimo de 80 y salieron a tus redes. Sube cada vez que publicás una de la lista.">
              <span className="dato-l">Pasaron</span>
              <span className="dato-v" style={{ color: 'var(--green)' }}>{18 + publicadas.length}</span>
            </div>
            <div className="dato" title="Las que volvieron con la objeción antes de gastar un peso">
              <span className="dato-l">Frenadas a tiempo</span>
              <span className="dato-v" style={{ color: 'var(--amber)' }}>13</span>
            </div>
          </div>

          <div className="pz-filas">
            {piezasJuzgadas.map(o => {
              const s = puntaje(o);
              return (
                <button key={o.id} className={`pz-fila ${o.id === pieza.id ? 'on' : ''}`}
                  title={`Muestra en la tarjeta de al lado cómo la votaron los ${PERFILES.length} jueces, uno por uno. No publica nada: acá no se gasta un peso.`}
                  onClick={() => setElegida(o.id)}>
                  <span className="pz-fila-n" style={{ color: colorScore(s) }}>{s}</span>
                  <span className="pz-fila-txt">
                    <span className="pz-fila-t">{o.titulo}</span>
                    <span className="pz-fila-m">{o.formato} · {o.medida}</span>
                    <span className="pz-fila-v">Los {PERFILES.length} votos: {PERFILES.map(per => o.votos[per.k]).join(' · ')}</span>
                  </span>
                  <span className="row" style={{ gap: 6, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    {publicadas.includes(o.id) && <Badge tone="green">publicada</Badge>}
                    {corregidas.includes(o.id) && <Badge tone="purple">corregida</Badge>}
                    <Badge tone={tonoVeredicto(s)}>{palabraVeredicto(s)}</Badge>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="bs">
            El panel puntúa <b>cada pieza antes de publicarse</b>: arriba de 80 sale, entre 60 y 80 vuelve con la
            objeción del juez que votó más bajo, y abajo de 60 no se gasta un peso.
          </div>
          <div className="acc-why">
            <b>Las {piezasJuzgadas.length} de arriba son las últimas que votó el panel</b> y son las mismas de la galería
            del paso 3. El mes entero son 31: {18 + publicadas.length} salieron y 13 volvieron con la objeción antes de gastar.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Vote size={14} style={{ color: 'var(--purple3)' }} /> El veredicto de la pieza elegida</span>}
          action={<Badge tone={tonoVeredicto(scorePieza)}>{palabraVeredicto(scorePieza).toLowerCase()}</Badge>}
        >
          <div className="row" style={{ gap: 20, marginBottom: 22, flexWrap: 'wrap' }}>
            <Ring valor={scorePieza} label="SCORE" sub="mínimo 80 para publicar" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="bt">{pieza.titulo}</div>
              <div className="bs" style={{ marginTop: 5 }}>
                {pieza.formato} · {pieza.medida} · los {PERFILES.length} jueces la miraron 8 segundos.
              </div>
              <div className="bs" style={{ marginTop: 8 }}><b>{criterioPieza(scorePieza)}</b></div>
            </div>
          </div>

          <div className="guards">
            {votosPieza.map(v => (
              <div key={v.k} className="guard">
                <span style={{ width: 34, flexShrink: 0, textAlign: 'center', fontSize: 17, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: colorScore(v.score) }}>{v.score}</span>
                <span className="guard-lb">
                  {v.nombre} <span className="tiny muted">· {v.mira}</span>
                  <small>«{v.opinion}»</small>
                </span>
              </div>
            ))}
          </div>

          <div className="alarm atencion">
            <div className="alarm-head">
              <span className="alarm-sev atencion">{pasaPieza ? 'EL VOTO MÁS BAJO' : 'LO QUE HAY QUE ARREGLAR'}</span>
              <span className="alarm-title">{votoMasBajo.nombre} fue el más duro: le puso {votoMasBajo.score} de 100.</span>
            </div>
            <div className="alarm-sug">
              «{votoMasBajo.opinion}» <b>{pasaPieza
                ? `No frena la publicación: es lo que hay que resolver si querés subirla de ${scorePieza}.`
                : 'Es la objeción a corregir antes de gastar un peso.'}</b>
            </div>
          </div>

          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            {pasaPieza ? (
              publicadas.includes(pieza.id) ? (
                <>
                  <span className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--green)', fontWeight: 700 }}>
                    <I_Check size={13} /> «{pieza.titulo}» salió a tus redes el {hoy()}: la sacás cuando quieras y no pierde el historial.
                  </span>
                  <Button variant="ghost" className="btn-sm" title="La baja de tus redes. Es reversible: la volvés a publicar cuando quieras, con el mismo texto aprobado por los jueces."
                    onClick={() => { setPublicadas(p => p.filter(x => x !== pieza.id)); setToast(`«${pieza.titulo}» volvió a borrador: no está en tus redes`); }}>
                    Sacarla de mis redes
                  </Button>
                </>
              ) : (
                <Button className="btn-sm"
                  title={`Publica esta pieza en tus redes (${pieza.formato}, ${pieza.medida}) con el texto que ya aprobaron los ${PERFILES.length} jueces. Es reversible: la sacás cuando quieras y no pierde el historial.`}
                  onClick={() => { setPublicadas(p => [...p, pieza.id]); setToast(`«${pieza.titulo}» salió a tus redes con el texto que aprobó el panel`); }}>
                  <I_Check size={13} /> Publicar esta
                </Button>
              )
            ) : (
              corregidas.includes(pieza.id) ? (
                <>
                  <span className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--green)', fontWeight: 700 }}>
                    <I_Refresh size={13} /> «{pieza.titulo}» corregida: Nia contestó la objeción de {votoMasBajo.nombre} y los {PERFILES.length} jueces la están votando otra vez. Costó {TARIFA.crearVariante + TARIFA.evaluarPieza} créditos.
                  </span>
                  <Button variant="ghost" className="btn-sm" title="Vuelve a la versión que los jueces vieron primero. No se pierde nada: la corrección queda guardada."
                    onClick={() => { setCorregidas(p => p.filter(x => x !== pieza.id)); setToast(`«${pieza.titulo}» volvió a la versión de antes`); }}>
                    Volver a la de antes
                  </Button>
                </>
              ) : (
                <Button className="btn-sm"
                  title={`Nia corrige «${pieza.titulo}» con la objeción de ${votoMasBajo.nombre} y los ${PERFILES.length} jueces la vuelven a juzgar. Cuesta ${TARIFA.crearVariante + TARIFA.evaluarPieza} créditos. Es reversible: si te gustaba más la versión de ahora, volvés a ella.`}
                  onClick={corregirPieza}>
                  <I_Refresh size={13} /> Corregir eso y volver a juzgarla
                </Button>
              )
            )}
          </div>

          <div className="acc-why">
            <b>Ninguna pieza se publica sin pasar el mínimo.</b> Cuando corregís una, los 5 jueces la vuelven a votar
            y el voto nuevo queda al lado del anterior: así se ve si la objeción se resolvió.
          </div>
        </Card>
      </div>
      </>)}
    </div>
  );
}
