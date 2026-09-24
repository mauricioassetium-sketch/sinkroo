import { useState } from 'react';
import { Card, Badge, Button, Progress } from '../components/ui';
import { ViewHead, MetricaAnillo, Metrica, BarRow } from '../components/viz';
import {
  I_Trend, I_Zap, I_Heart, I_Globe, I_Cal, I_Clock, I_ArrowRight, I_Star, I_Check, I_Link, I_Refresh, I_Eye,
} from '../components/icons';
import { useDetalle } from '../components/Detalle';
import type { Vista } from '../components/Layout';
import { CRECIMIENTO, FICHA_CREADOR, PLAN_DEL_MES, PIEZAS_DEL_MES } from '../data/creador';

// =============================================================================================
// CRECIMIENTO — cómo se movió la cuenta del creador esta semana y qué sigue.
//
// Es el paso «Crecer» del ciclo: Sol midió las piezas que salieron, Rex armó con eso el plan de la
// semana que viene y Kai sostiene el ritmo en cada red. Acá sólo hay crecimiento de la cuenta:
// seguidores, alcance y retención de los primeros 3 segundos, y qué se hace la semana que viene
// para que siga creciendo.
//
// Sirve para cualquier tipo de creador: no hay rubro escrito en ninguna parte. Lo que se mide sale
// de las redes conectadas y de la Ficha (el ritmo del mes), nunca de una suposición.
//
// CADA BOTÓN HACE ALGO Y SE VE (regla del panel):
//   · Conectar YouTube Shorts → la red pasa a «conectada», cambia el contador de la tarjeta y el
//     paso del plan que la nombra queda «hecho». Reversible con «Desconectar».
//   · Que el equipo lo haga → el paso del plan queda «en marcha» y se puede frenar.
//   · Ir a Publicación → abre el calendario de la semana (setVista).
// Lo que sólo informa abre el panel de detalle con el dato real adentro.
// =============================================================================================

/** Los miles escritos a la argentina ('14.700', '18.340 por pieza') se leen como número. */
const miles = (t: string) => Number(t.replace(/[^\d]/g, ''));

/** Un porcentaje escrito con coma ('6,9%', '+0,7 pts', '58%') se lee como número. */
const pctNum = (t: string) => {
  const n = Number(t.replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
};

/** Una variación que baja viene con el signo menos adelante: '-9%' o '−9%'. */
const esBaja = (t: string) => /^[-\u2212]/.test(t.trim());

// =============================================================================================
// LOS NÚMEROS DE LA SEMANA — todo lo que se muestra sale de acá, nada se escribe a mano.
// =============================================================================================
const SEG = CRECIMIENTO.seguidores;      // total · nuevosSemana · meta
const ALC = CRECIMIENTO.alcance;         // total · promedio por pieza · variación
const RET = CRECIMIENTO.retencion;       // a3s · meta · nota
const INT = CRECIMIENTO.interaccion;     // valor · variación
const GUA = CRECIMIENTO.guardados;       // valor · variación

/** La meta de seguidores de la semana: lo que falta para llegar y qué porcentaje se cumplió. */
const NUEVOS = miles(SEG.nuevosSemana);
const META_SEG = miles(SEG.meta);
const FALTA_SEG = META_SEG - NUEVOS;
const PCT_SEG = Math.round((NUEVOS / META_SEG) * 100);

/** La retención de los primeros 3 segundos contra su meta: es la métrica que más mueve el alcance. */
const RET_HOY = pctNum(RET.a3s);
const RET_META = pctNum(RET.meta);
const FALTA_RET = RET_META - RET_HOY;
const PCT_RET = Math.round((RET_HOY / RET_META) * 100);

/** El alcance promedio por pieza: el número tal como lo escribió la data ('18.340'). */
const ALC_PROM_TXT = ALC.promedio.split(' ')[0];

/** El ritmo: cuántas piezas por semana publica hoy y cuántas busca el objetivo del plan. */
const RITMO_HOY = miles(FICHA_CREADOR.ritmoActual);
const RITMO_PLAN = miles(FICHA_CREADOR.ritmoObjetivo);
const PCT_RITMO = Math.round((RITMO_HOY / RITMO_PLAN) * 100);

/** Las redes que ya están conectadas: sale de la Ficha del creador, no se escribe a mano. */
const REDES_CONECTADAS = FICHA_CREADOR.redes.filter(r => r.estado === 'conectada').map(r => r.red);

/** La pieza que mejor rindió: la que el equipo ya midió y sacó el puntaje más alto del panel. */
const MEDIDAS = PIEZAS_DEL_MES.filter(p => p.retencion);
const MEJOR_PIEZA = MEDIDAS.length ? MEDIDAS.reduce((a, b) => (b.puntaje > a.puntaje ? b : a)) : PIEZAS_DEL_MES[0];

/** La suma de las tres redes: tiene que dar el mismo total que el número de la semana. */
const SEG_REDES = CRECIMIENTO.porRed.reduce((s, r) => s + miles(r.seguidores), 0);
const NUEVOS_REDES = CRECIMIENTO.porRed.reduce((s, r) => s + miles(r.nuevos), 0);
const ALC_REDES = CRECIMIENTO.porRed.reduce((s, r) => s + miles(r.alcance), 0);

export function ViewCrecimientoCreador({ setToast, setVista }: { setToast: (t: string) => void; setVista: (v: Vista) => void }) {
  const detalle = useDetalle();
  // --- Lo que cada botón cambia, y queda a la vista en la pantalla (no un aviso que se va solo).
  /** Las redes conectadas: arranca con las de la Ficha y suma las que el creador conecta acá. */
  const [conectadas, setConectadas] = useState<string[]>(REDES_CONECTADAS);
  /** Los pasos del plan de la semana que el equipo ya tiene en marcha: se pueden frenar. */
  const [enMarcha, setEnMarcha] = useState<number[]>([]);

  const suben = CRECIMIENTO.queFunciono.filter(f => f.tono === 'green').length;
  /** Las redes que se conectaron hace un momento: son las que hay que nombrar al pie. */
  const recienConectadas = conectadas.filter(r => !REDES_CONECTADAS.includes(r));

  // ============================ LOS BOTONES DE LA RED ============================
  const conectar = (red: string) => {
    setConectadas(c => (c.includes(red) ? c : [...c, red]));
    setToast(`${red} conectada: el equipo empieza a publicar y a medir ahí. Es reversible.`);
  };
  const desconectar = (red: string) => {
    setConectadas(c => c.filter(x => x !== red));
    setToast(`${red} desconectada: el equipo deja de medirla. Reversible: la volvés a conectar cuando quieras.`);
  };

  // ============================ LOS BOTONES DEL PLAN ============================
  const ponerEnMarcha = (i: number, paso: string) => {
    setEnMarcha(m => (m.includes(i) ? m : [...m, i]));
    setToast(`En marcha: Rex lo reparte en la semana — ${paso}`);
  };
  const frenar = (i: number, paso: string) => {
    setEnMarcha(m => m.filter(x => x !== i));
    setToast(`Frenado: «${paso}» vuelve a esperar. No cambia nada de lo que ya salió.`);
  };
  const hacerLosTodos = () => {
    setEnMarcha(CRECIMIENTO.plan.map((_, i) => i));
    setToast(`Los ${CRECIMIENTO.plan.length} pasos quedaron en marcha: Rex los reparte en la semana.`);
  };
  const frenarLosTodos = () => {
    setEnMarcha([]);
    setToast('Los cuatro pasos volvieron a esperar: no se toca nada de lo que ya salió.');
  };

  // ============================ LOS BOTONES QUE INFORMAN (abren el detalle) ============================

  /** Por qué la retención de los 3 primeros segundos es la que manda en el alcance. */
  const verRetencion = () => detalle({
    titulo: 'La retención de los primeros 3 segundos',
    sub: `${RET.nota} Hoy vas en ${RET.a3s} y la meta de la semana es ${RET.meta}.`,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Retención de hoy', v: RET.a3s, tono: 'amber', s: `de una meta de ${RET.meta}: faltan ${FALTA_RET} puntos` },
        { k: 'El alcance que movió', v: ALC.variacion, tono: 'green', s: `${ALC_PROM_TXT} por pieza contra la semana pasada, con ${ALC.total} en total` },
        { k: 'La que mejor retuvo', v: MEJOR_PIEZA.retencion ?? '—', s: `«${MEJOR_PIEZA.titulo}», la pieza medida con el panel más alto (${MEJOR_PIEZA.puntaje})` },
        { k: 'Qué mira el equipo', v: 'Los 3 primeros segundos', s: 'quién aparece y qué dice la primera frase: es lo que decide si la pieza se ve o se saltea' },
      ] },
      { tipo: 'pasos', items: [
        'Abrir con tu cara y tu voz: sin logo, sin texto de entrada y sin intro.',
        'Decir el problema antes de la solución: es lo que duplicó el alcance de las piezas que ya salieron.',
        'Sostener las piezas de 19 a 21, la franja donde tu audiencia está con el celular.',
        'Medir cada viernes y volver al formato que retuvo más de 60%.',
      ] },
      { tipo: 'aviso', tono: 'amber', texto: `Faltan ${FALTA_RET} puntos para la meta de ${RET.meta}. Con ${RET.a3s} el alcance igual subió ${ALC.variacion}: el camino es sostener el formato, no publicar más piezas.` },
    ],
    fuente: 'El resumen del equipo sobre las piezas ya medidas y el alcance de tus redes conectadas.',
    acciones: [{ label: 'Ver mis piezas en Publicación', variante: 'primary', title: 'Abre Publicación: qué pieza sale, en qué red y a qué hora', onClick: () => { setVista('publicacion'); setToast('Ahí están las piezas y la ventana en la que salen.'); } }],
  });

  /** La pieza que mejor rindió del mes, con lo que midió el equipo. */
  const verMejorPieza = () => detalle({
    titulo: MEJOR_PIEZA.titulo,
    sub: `${MEJOR_PIEZA.tipo} · ${MEJOR_PIEZA.red} · ${MEJOR_PIEZA.cuando}. Es la pieza que mejor rindió: salió y el equipo ya la midió.`,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Retención a los 3 s', v: MEJOR_PIEZA.retencion ?? '—', tono: 'green', s: `tu promedio de la semana es ${RET.a3s}` },
        { k: 'Puntaje del panel', v: String(MEJOR_PIEZA.puntaje), tono: 'green', s: 'el mínimo para publicar es 80' },
        { k: 'Red', v: MEJOR_PIEZA.red, s: 'es la mejor pieza de esa red esta semana' },
        { k: 'Estado', v: MEJOR_PIEZA.estado, s: `salió ${MEJOR_PIEZA.cuando}, con ${MEJOR_PIEZA.creditos} créditos de producción` },
      ] },
      { tipo: 'texto', texto: 'Lo que la hace la mejor de la semana no es el tema: es que retuvo. Por eso Rex la toma como molde para las piezas que siguen.' },
    ],
    fuente: 'Las piezas del mes y la medición del equipo, red por red.',
    acciones: [{
      label: 'Ver mis piezas en Publicación', variante: 'primary', title: 'Abre Publicación, donde está el calendario de la semana',
      onClick: () => { setVista('publicacion'); setToast(`«${MEJOR_PIEZA.titulo}» ya salió: en Publicación está el resto de la semana.`); },
    }],
  });

  /** Una red: sus números, su mejor pieza y qué hace el equipo ahí. */
  const verRed = (red: string, conectada: boolean) => {
    const r = CRECIMIENTO.porRed.find(x => x.red === red)!;
    const ficha = FICHA_CREADOR.redes.find(x => x.red === red);
    const pieza = PIEZAS_DEL_MES.find(p => p.titulo === r.mejorPieza);
    return detalle({
      titulo: `${red} · la red`,
      sub: conectada
        ? `Conectada: el equipo publica ahí y mide sus seguidores, su alcance y su retención.`
        : `Todavía no está conectada: es alcance que hoy queda afuera del plan.`,
      bloques: [
        { tipo: 'datos', filas: [
          { k: 'Seguidores', v: r.seguidores, s: `${r.nuevos} nuevos esta semana` },
          { k: 'Alcance de la semana', v: r.alcance, s: 'lo que vieron tus piezas en esa red' },
          { k: 'Interacción', v: ficha?.interaccion ?? '—', s: 'la que declara tu Ficha para esa red' },
          { k: 'Mejor pieza', v: pieza?.titulo ?? r.mejorPieza, s: pieza?.retencion ? `${pieza.retencion} y panel ${pieza.puntaje}` : 'sin medición todavía' },
        ] },
        { tipo: 'texto', texto: `Del total de la semana, ${r.alcance} de alcance y ${r.nuevos} de los seguidores nuevos salen de acá.` },
        conectada
          ? { tipo: 'aviso' as const, tono: 'green' as const, texto: `Está conectada: Kai publica en la ventana que le conviene a tu audiencia y Sol mide cada pieza. Desconectarla sólo apaga la medición de esta red, no borra nada de lo publicado.` }
          : { tipo: 'aviso' as const, tono: 'amber' as const, texto: `Conectarla suma ${r.alcance} de alcance que hoy no entra en el plan. Es una conexión: no consume créditos de tu plan.` },
      ],
      fuente: 'Crecimiento por red de la semana y las piezas del mes.',
      acciones: conectada
        ? [{ label: `Desconectar ${red}`, title: `Apaga la medición y la publicación en ${red}. Es reversible: la volvés a conectar cuando quieras.`, onClick: () => desconectar(red) }]
        : [{ label: `Conectar ${red}`, variante: 'primary' as const, title: `Deja ${red} conectada, el equipo empieza a medirla y pasa a estar conectada en «Cómo va cada red». Es reversible.`, onClick: () => conectar(red) }],
    });
  };

  /** Las piezas del mes: en qué anda cada una y cuánto retuvo la que ya salió. */
  const verPiezas = () => detalle({
    titulo: 'Las piezas del mes',
    sub: `${PIEZAS_DEL_MES.length} piezas y una sola cosa en juego: que la cuenta siga subiendo. Las que ya salieron tienen su retención medida.`,
    bloques: [
      { tipo: 'filas', items: PIEZAS_DEL_MES.map(p => ({
        t: p.titulo,
        s: `${p.tipo} · ${p.red} · ${p.estado}${p.retencion ? ` · ${p.retencion}` : ''}`,
        etiqueta: p.puntaje ? String(p.puntaje) : 'sin puntaje',
        tono: (p.puntaje >= 80 ? 'green' : p.puntaje > 0 ? 'amber' : 'muted') as 'green' | 'amber' | 'muted',
      })) },
      { tipo: 'datos', filas: [
        { k: 'Ya medidas', v: String(MEDIDAS.length), s: 'las que tienen retención de los primeros 3 segundos' },
        { k: 'La que mejor retuvo', v: MEJOR_PIEZA.retencion ?? '—', s: `«${MEJOR_PIEZA.titulo}»` },
        { k: 'Retención de la cuenta', v: RET.a3s, tono: 'amber', s: `de una meta de ${RET.meta}` },
      ] },
      { tipo: 'texto', texto: `El mes va por ${RITMO_HOY} publicaciones por semana y el plan busca ${RITMO_PLAN}: estas piezas son las que el equipo ya tiene en marcha para cerrar esa diferencia.` },
    ],
    fuente: 'Las piezas del mes con el estado de cada una y el puntaje del panel de 5.',
    acciones: [{ label: 'Ir a Publicación', variante: 'primary', title: 'Abre el calendario de la semana con la red y la hora de cada pieza', onClick: () => setVista('publicacion') }],
  });

  return (
    <div className="dash">
      {/* ============================== ENCABEZADO ============================== */}
      <ViewHead
        icon={<I_Trend size={19} />}
        titulo="Crecimiento"
        sub="Qué hizo crecer tu cuenta esta semana y qué sigue"
        nums={[
          { v: SEG.nuevosSemana, l: `seguidores nuevos · meta ${SEG.meta}`, c: 'var(--green)' },
          { v: ALC_PROM_TXT, l: `alcance promedio por pieza · ${ALC.variacion}`, c: 'var(--green)' },
          { v: RET.a3s, l: `retención a los 3 s · meta ${RET.meta}`, c: 'var(--amber)' },
          { v: INT.valor, l: `interacción · ${INT.variacion}`, c: 'var(--green)' },
        ]}
      />

      {/* De dónde sale cada número: de las redes conectadas y del trabajo del equipo, no de un estimado. */}
      <div className="onb-infiere" style={{ marginTop: 0 }}>
        <span className="onb-infiere-ic"><I_Zap size={13} /></span>
        <span>
          <b>Sol mide cada pieza y Rex arma el plan con eso.</b> Lo que ves acá sale de tus redes conectadas:
          seguidores, alcance y retención reales, y la pieza que mejor rindió. Lo que no está conectado aparece como tal.
        </span>
      </div>

      {/* ====================== 1 · LA SEMANA EN NÚMEROS Y QUÉ FUNCIONÓ ====================== */}
      <div className="csec">
        <span className="csec-n">1</span>
        <span className="csec-t">La semana en números</span>
        <span className="csec-c purple">{SEG.nuevosSemana} nuevos</span>
        <span className="csec-s">Los seguidores, el alcance, la retención y la interacción que movieron tu cuenta</span>
      </div>
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Trend size={14} style={{ color: 'var(--green)' }} /> La semana en números</span>}
          action={<Badge tone="green">{SEG.nuevosSemana} seguidores nuevos</Badge>}
        >
          <div className="met-grid">
            <MetricaAnillo
              label="Seguidores nuevos" valor={SEG.nuevosSemana} pct={PCT_SEG} color="var(--green)"
              meta={`de una meta de ${SEG.meta}`} delta={`faltan ${FALTA_SEG}`}
            />
            <MetricaAnillo
              label="Retención a los 3 s" valor={RET.a3s} pct={PCT_RET} color="var(--amber)" up={false}
              meta={`de una meta de ${RET.meta}`} delta={`${FALTA_RET} pts abajo`}
            />
            <Metrica label="Alcance promedio por pieza" valor={ALC_PROM_TXT} delta={ALC.variacion}
              sub="contra la semana pasada" color="var(--green)" />
            <Metrica label="Interacción" valor={INT.valor} delta={INT.variacion}
              sub="sobre los que ya te siguen" color="var(--purple3)" />
            <Metrica label="Guardados" valor={GUA.valor} delta={GUA.variacion}
              sub="lo que tu gente se guarda para volver" color="var(--purple3)" />
          </div>

          {/* Las dos metas de la semana: la barra muestra cuánto falta para llegar. */}
          <div style={{ marginTop: 16, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="bs" style={{ marginBottom: 8 }}>Cuánto falta para las dos metas de la semana:</div>
            <BarRow label="Seguidores" valor={NUEVOS} max={META_SEG} formato={`${NUEVOS} de ${META_SEG}`} color="var(--green)" />
            <BarRow label="Retención 3 s" valor={RET_HOY} max={RET_META} formato={`${RET_HOY}% de ${RET_META}%`} color="var(--amber)" />
          </div>

          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato" title="Todos tus seguidores, en las redes que tenés conectadas.">
              <span className="dato-l">Seguidores totales</span>
              <span className="dato-v">{SEG.total}</span>
            </div>
            <div className="dato" title="La suma del alcance de las tres redes esta semana.">
              <span className="dato-l">Alcance total</span>
              <span className="dato-v">{ALC.total}</span>
            </div>
            <div className="dato" title={`De las ${PIEZAS_DEL_MES.length} piezas del mes, las que ya salieron y el equipo pudo medir.`}>
              <span className="dato-l">Piezas medidas</span>
              <span className="dato-v" style={{ color: 'var(--purple3)' }}>{MEDIDAS.length} de {PIEZAS_DEL_MES.length}</span>
            </div>
          </div>

          <div className="bs" style={{ marginTop: 12 }}>
            La pieza que mejor rindió: <b>«{MEJOR_PIEZA.titulo}»</b> — {MEJOR_PIEZA.retencion} y panel {MEJOR_PIEZA.puntaje}, en {MEJOR_PIEZA.red}.
          </div>

          <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
            <Button className="btn-sm"
              title="Abre la retención de los 3 primeros segundos: el número de hoy, la meta, cuánto falta y qué hace el equipo para subirla. No cambia nada."
              onClick={verRetencion}>
              Por qué la retención manda <I_ArrowRight size={13} />
            </Button>
            <Button variant="ghost" className="btn-sm"
              title="Muestra la pieza que mejor rindió del mes: su retención, el puntaje del panel y en qué red salió. No cambia nada."
              onClick={verMejorPieza}>
              <I_Star size={13} /> Ver la pieza que mejor rindió
            </Button>
          </div>

          <div className="acc-why">
            Los {SEG.nuevosSemana} seguidores nuevos son la suma de tus {CRECIMIENTO.porRed.length} redes y el alcance sale
            de las piezas que el equipo ya midió. <b>{RET.nota}</b>
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Heart size={14} style={{ color: 'var(--purple3)' }} /> Qué funcionó y qué no</span>}
          action={<Badge tone="green">{suben} de {CRECIMIENTO.queFunciono.length} para repetir</Badge>}
        >
          <div className="como-se-lee">
            <b>Cómo se lee:</b> verde es lo que subió y conviene repetir la semana que viene; gris es lo que bajó
            y no conviene sostener. Cada fila trae la variación contra tu promedio.
          </div>
          {CRECIMIENTO.queFunciono.map(f => (
            <div key={f.t} className="guard" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 7, paddingTop: 12, paddingBottom: 12 }}>
              <span className="row" style={{ gap: 8, width: '100%', flexWrap: 'wrap' }}>
                <span className="bt">{f.t}</span>
                <Badge tone={f.tono === 'green' ? 'green' : 'muted'}>{f.etiqueta}</Badge>
                <span className="tiny" style={{ color: esBaja(f.etiqueta) ? 'var(--muted2)' : 'var(--green)', fontWeight: 700 }}>
                  {esBaja(f.etiqueta) ? 'bajó' : 'subió'}
                </span>
              </span>
              <span className="guard-lb" style={{ minWidth: 0 }}>{f.s}</span>
            </div>
          ))}
          <div className="acc-why">
            Lo que sube entra al plan de la semana que viene: <b>Rex ya lo tomó</b> para armar los pasos de abajo, y lo
            que bajó no se repite aunque sea cómodo de producir.
          </div>
        </Card>
      </div>

      {/* ====================== 2 · CÓMO VA CADA RED ====================== */}
      <div className="csec">
        <span className="csec-n">2</span>
        <span className="csec-t">Cómo va cada red</span>
        <span className="csec-c amber">{conectadas.length} de {CRECIMIENTO.porRed.length}</span>
        <span className="csec-s">Una fila por red: seguidores, nuevos de la semana, alcance y su mejor pieza</span>
      </div>
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Globe size={14} style={{ color: 'var(--green)' }} /> Tus redes</span>}
        action={<Badge tone={conectadas.length === CRECIMIENTO.porRed.length ? 'green' : 'amber'}>
          {conectadas.length} de {CRECIMIENTO.porRed.length} conectadas
        </Badge>}
      >
        <div className="bs">
          El equipo publica y mide red por red: cada una tiene su audiencia y su ventana. <b>Lo que no está
          conectado no entra en el plan</b>, aunque sus números ya se vean acá.
        </div>
        {CRECIMIENTO.porRed.map(r => {
          const conectada = conectadas.includes(r.red);
          const ficha = FICHA_CREADOR.redes.find(x => x.red === r.red);
          const pieza = PIEZAS_DEL_MES.find(p => p.titulo === r.mejorPieza);
          return (
            <div key={r.red} className="guard" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8, paddingTop: 12, paddingBottom: 12 }}>
              <span className="row" style={{ gap: 8, width: '100%', flexWrap: 'wrap' }}>
                <span className="bt">{r.red}</span>
                {ficha && <span className="tiny muted">{ficha.usuario}</span>}
                <Badge tone={conectada ? 'green' : 'muted'}>{conectada ? 'conectada' : 'por conectar'}</Badge>
                {ficha && <span className="tiny muted">{ficha.interaccion} de interacción</span>}
              </span>
              <span className="guard-lb" style={{ minWidth: 0 }}>
                {r.seguidores} seguidores · <b>{r.nuevos}</b> nuevos esta semana · {r.alcance} de alcance
                <small>
                  {!conectada
                    ? r.mejorPieza
                    : pieza?.retencion
                      ? `Mejor pieza: «${pieza.titulo}» — ${pieza.retencion} y panel ${pieza.puntaje}.`
                      : 'La mide el equipo desde que la conectaste: la mejor pieza aparece en el resumen del viernes.'}
                </small>
              </span>
              <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                {conectada ? (
                  <Button variant="ghost" className="btn-sm"
                    title={`Desconecta ${r.red}: el equipo deja de medirla y de publicar ahí. Es reversible: la volvés a conectar cuando quieras.`}
                    onClick={() => desconectar(r.red)}>
                    <I_Refresh size={12} /> Desconectar
                  </Button>
                ) : (
                  <Button className="btn-sm"
                    title={`Conecta ${r.red}: pasa a estar conectada, el equipo empieza a medirla y entra en el plan. Es reversible: la podés desconectar cuando quieras.`}
                    onClick={() => conectar(r.red)}>
                    <I_Link size={13} /> Conectar {r.red}
                  </Button>
                )}
                <Button variant="ghost" className="btn-sm"
                  title={`Muestra los números de ${r.red}, su mejor pieza y qué hace el equipo ahí. No cambia nada.`}
                  onClick={() => verRed(r.red, conectada)}>
                  <I_Eye size={13} /> Ver la red
                </Button>
              </span>
            </div>
          );
        })}

        <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
          <div className="dato" title="La suma de los seguidores de las tres redes: da el total de tu cuenta.">
            <span className="dato-l">Seguidores en las tres</span>
            <span className="dato-v">{SEG_REDES.toLocaleString('es-AR')}</span>
          </div>
          <div className="dato" title="La suma de los seguidores nuevos de las tres redes esta semana.">
            <span className="dato-l">Nuevos de la semana</span>
            <span className="dato-v" style={{ color: 'var(--green)' }}>+{NUEVOS_REDES.toLocaleString('es-AR')}</span>
          </div>
          <div className="dato" title="La suma del alcance de las tres redes esta semana.">
            <span className="dato-l">Alcance de las tres</span>
            <span className="dato-v">{ALC_REDES.toLocaleString('es-AR')}</span>
          </div>
        </div>

        {recienConectadas.length > 0 && (
          <div className="onb-arrancado" style={{ marginTop: 12 }}>
            <I_Check size={15} />
            <span>
              <b>{recienConectadas.join(' y ')} quedó conectada.</b> El equipo empieza a medirla y entra en el plan de la
              semana que viene: su alcance ya no queda afuera. Podés desconectarla desde su fila.
            </span>
          </div>
        )}

        <div className="acc-why">
          Conectar una red <b>no consume créditos de tu plan</b>: sólo deja que Kai publique y que Sol mida ahí. Lo que se
          gaste en producir para esa red sale de los créditos del mes, como el resto.
        </div>
      </Card>

      {/* ====================== 3 · LO QUE SIGUE ====================== */}
      <div className="csec">
        <span className="csec-n">3</span>
        <span className="csec-t">Lo que sigue la semana que viene</span>
        <span className="csec-c purple">{enMarcha.length} de {CRECIMIENTO.plan.length} en marcha</span>
        <span className="csec-s">El plan que armó Rex y el ritmo que necesita tu cuenta para llegar</span>
      </div>
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Cal size={14} style={{ color: 'var(--purple3)' }} /> El plan de la semana que viene</span>}
          action={<Badge tone={enMarcha.length ? 'green' : 'amber'}>{enMarcha.length} de {CRECIMIENTO.plan.length} en marcha</Badge>}
        >
          <div className="bs">
            Rex armó estos {CRECIMIENTO.plan.length} pasos con lo que midió Sol. <b>El objetivo del mes:</b> {PLAN_DEL_MES.objetivo}
          </div>
          <div className="col-stack" style={{ marginTop: 12 }}>
            {CRECIMIENTO.plan.map((paso, i) => {
              // El paso que nombra una red ya conectada queda hecho: no hay nada que ejecutar.
              const red = CRECIMIENTO.porRed.map(x => x.red).find(nombre => paso.startsWith(`Conectar ${nombre}`));
              const hecho = !!red && conectadas.includes(red);
              const marcha = enMarcha.includes(i);
              return (
                <div key={paso} className="guard" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8, paddingTop: 12, paddingBottom: 12 }}>
                  <span className="row" style={{ gap: 8, width: '100%', flexWrap: 'wrap' }}>
                    <span className="tiny muted">Paso {i + 1}</span>
                    {hecho
                      ? <Badge tone="green">hecho</Badge>
                      : marcha
                        ? <Badge tone="green">en marcha</Badge>
                        : <Badge tone="muted">esperando</Badge>}
                  </span>
                  <span className="guard-lb" style={{ minWidth: 0 }}>
                    {paso}
                    <small>
                      {hecho
                        ? `Ya está: conectaste ${red}, así que ese alcance entra en la semana.`
                        : marcha
                          ? 'En marcha: Rex lo repartió en la semana y Kai lo ejecuta.'
                          : 'Todavía no está en marcha: el equipo no lo toca hasta que lo pidas.'}
                    </small>
                  </span>
                  <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    {hecho ? (
                      <Button variant="ghost" className="btn-sm"
                        title={`${red} ya está conectada: este paso está cumplido y no hay nada que ejecutar. Si querés, la desconectás desde «Cómo va cada red».`}
                        onClick={() => setToast(`${red} ya está conectada: el paso está cumplido`)}>
                        <I_Check size={13} /> Ya está cumplido
                      </Button>
                    ) : marcha ? (
                      <Button variant="ghost" className="btn-sm"
                        title="Frena este paso: vuelve a esperar y el equipo deja de trabajar en él. Es reversible: lo podés poner en marcha otra vez."
                        onClick={() => frenar(i, paso)}>
                        <I_Refresh size={12} /> Frenarlo
                      </Button>
                    ) : (
                      <Button className="btn-sm"
                        title="Pone este paso en marcha: Rex lo reparte en la semana y el equipo lo ejecuta. Es reversible: con «Frenarlo» vuelve a esperar."
                        onClick={() => ponerEnMarcha(i, paso)}>
                        <I_Zap size={13} /> Que el equipo lo haga
                      </Button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
            {enMarcha.length === CRECIMIENTO.plan.length ? (
              <>
                <span className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--green)', fontWeight: 700 }}>
                  <I_Check size={13} /> Los {CRECIMIENTO.plan.length} pasos están en marcha.
                </span>
                <Button variant="ghost" className="btn-sm"
                  title={`Frena los ${CRECIMIENTO.plan.length} pasos: vuelven a esperar y el equipo no toca nada hasta que los pongas en marcha otra vez. Es reversible.`}
                  onClick={frenarLosTodos}>
                  Frenar los {CRECIMIENTO.plan.length}
                </Button>
              </>
            ) : (
              <Button variant="ghost" className="btn-sm"
                title={`Pone los ${CRECIMIENTO.plan.length} pasos en marcha de una: Rex los reparte en la semana. Es reversible: con «Frenar» vuelven a esperar.`}
                onClick={hacerLosTodos}>
                <I_Zap size={13} /> Que el equipo haga los {CRECIMIENTO.plan.length} pasos
              </Button>
            )}
          </div>
          <div className="acc-why">
            Un paso en marcha no gasta créditos por sí solo: el equipo produce con los créditos del mes y <b>cada pieza
            pasa por el panel antes de salir</b>. Frenar un paso no cambia nada de lo que ya se publicó.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Clock size={14} style={{ color: 'var(--green)' }} /> Tu ritmo</span>}
          action={<Badge tone={PCT_RITMO >= 100 ? 'green' : 'amber'}>{RITMO_HOY} de {RITMO_PLAN} por semana</Badge>}
        >
          <div className="bs">
            Hoy publicás {FICHA_CREADOR.ritmoActual} y el plan va por {FICHA_CREADOR.ritmoObjetivo}: son {RITMO_PLAN - RITMO_HOY}{' '}
            piezas más por semana. El equipo las produce por vos, así que el ritmo no depende de tu tiempo.
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="row spread" style={{ marginBottom: 7 }}>
              <span className="bt">Tu ritmo de publicación</span>
              <span className="bs">{RITMO_HOY} de {RITMO_PLAN} por semana · {PCT_RITMO}%</span>
            </div>
            <Progress pct={PCT_RITMO} color="amber" />
            <div className="tiny muted" style={{ marginTop: 7 }}>
              Es el ritmo que ejecuta Kai con lo que el equipo ya tiene producido. Nada se publica sin tu OK.
            </div>
          </div>

          <div style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="bs" style={{ marginBottom: 8 }}>
              Las {PLAN_DEL_MES.piezasPorSemana} piezas que el equipo arma cada semana, para llegar al ritmo:
            </div>
            {PLAN_DEL_MES.mezcla.map(m => (
              <div key={m.tipo} className="guard">
                <span className="guard-lb">{m.tipo}<small>{m.para}</small></span>
                <Badge tone="purple">{m.cuantas} por semana</Badge>
              </div>
            ))}
          </div>

          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato" title="La serie con la que el equipo sostiene el mes.">
              <span className="dato-l">La serie del mes</span>
              <span className="dato-v" style={{ color: 'var(--purple3)' }}>{PLAN_DEL_MES.serie}</span>
            </div>
            <div className="dato" title="El alcance promedio de cada pieza esta semana.">
              <span className="dato-l">Alcance por pieza</span>
              <span className="dato-v">{ALC_PROM_TXT}</span>
            </div>
            <div className="dato" title="La retención de los 3 primeros segundos y su meta.">
              <span className="dato-l">Retención a los 3 s</span>
              <span className="dato-v" style={{ color: 'var(--amber)' }}>{RET.a3s} de {RET.meta}</span>
            </div>
          </div>

          <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
            <Button className="btn-sm"
              title="Abre Publicación: qué pieza sale, en qué red y a qué hora, con la ventana que le conviene a tu audiencia."
              onClick={() => { setVista('publicacion'); setToast('Publicación: el calendario de la semana, con la ventana de cada pieza.'); }}>
              Ir a Publicación <I_ArrowRight size={13} />
            </Button>
            <Button variant="ghost" className="btn-sm"
              title={`Muestra las ${PIEZAS_DEL_MES.length} piezas del mes con su estado, su puntaje y lo que retuvo cada una. No cambia nada.`}
              onClick={verPiezas}>
              <I_Eye size={13} /> Las piezas del mes
            </Button>
          </div>

          <div className="acc-why">
            El ritmo sale de tu Ficha y lo busca el plan del mes: <b>más piezas no es publicar por publicar</b>, es
            sostener la serie que retiene. Lo que no rinde se cae del plan y el equipo te propone otra cosa.
          </div>
        </Card>
      </div>
    </div>
  );
}
