import { useState } from 'react';
import { Card, Badge, Button } from '../components/ui';
import { ViewHead, Gauge } from '../components/viz';
import {
  I_Robot, I_User, I_Pause, I_Play, I_Upload, I_Check, I_Shield, I_Credit,
  I_Camera, I_Film, I_Cal, I_Eye, I_ArrowRight, I_Zap,
} from '../components/icons';
import { useDetalle } from '../components/Detalle';
import type { Vista } from '../components/Layout';
import {
  AVATAR, PIEZAS_DEL_MES, CICLO_PIEZA, CICLO_PASOS, AUTONOMIA_CREADOR, GUARDRAILS_CREADOR,
} from '../data/creador';

// =============================================================================================
// EL AVATAR DEL CREADOR — «el equipo crea por vos con tu cara y tu voz».
//
// Es la función que el creador pidió: cuando no tiene tiempo de grabar, el avatar produce por él.
// La vista contesta las cuatro preguntas del creador, en este orden:
//
//   1. TU AVATAR     · cómo está (listo, entrenando, sin entrenar o apagado), con qué se entrenó,
//                      qué tan parecido es y cómo se apaga y se vuelve a encender.
//   2. QUÉ CREA      · las cuatro cosas que puede hacer por vos, con lo que cuesta cada una.
//   3. QUÉ CREÓ      · las piezas del mes que salieron del avatar, con su puntaje y su estado.
//   4. QUÉ NO HACE   · sus límites, contados como garantías del creador.
//   5. CÓMO APRENDE  · el entrenamiento en cuatro pasos, sin jerga.
//
// DOS REGLAS DEL MODELO QUE SE VEN EN LA PANTALLA:
//   · Crear con el avatar es COMPARTIDO: el avatar produce y el creador aprueba. Nada que salga del
//     avatar se publica sin pasar por el panel de 5 y sin su OK — por eso cada pieza nace «Borrador»
//     y el botón que la crea lo dice antes de crear nada.
//   · La pieza que el panel frena no se le cobra al creador: la regeneración la paga el sistema.
//     Por eso una pieza del avatar frenada por el panel cuenta 0 créditos en esta pantalla.
//
// NINGÚN NÚMERO ESTÁ ESCRITO A MANO: el parecido, la voz, lo que cuesta cada pieza, el paso del
// ciclo y las piezas del mes salen de `data/creador.ts` (AVATAR, PIEZAS_DEL_MES, CICLO_PASOS,
// AUTONOMIA_CREADOR y los guardrails). Si el dato cambia, la pantalla cambia con él.
// =============================================================================================

/** El estado del entrenamiento, tal como lo guarda la data. */
type Entrenamiento = 'sin-entrenar' | 'entrenando' | 'listo';
/** Lo que se muestra grande: los tres del entrenamiento más «apagado», que es el avatar pausado. */
type EstadoVisible = Entrenamiento | 'apagado';

const ESTADO_TXT: Record<EstadoVisible, string> = {
  listo: 'Listo', entrenando: 'Entrenando', 'sin-entrenar': 'Sin entrenar', apagado: 'Apagado',
};
const ESTADO_COLOR: Record<EstadoVisible, string> = {
  listo: 'var(--green)', entrenando: 'var(--amber)', 'sin-entrenar': 'var(--amber)', apagado: 'var(--muted)',
};
const ESTADO_TONO: Record<EstadoVisible, 'green' | 'amber' | 'muted'> = {
  listo: 'green', entrenando: 'amber', 'sin-entrenar': 'amber', apagado: 'muted',
};

/** El nombre con el que se muestra una pieza del ciclo (los estados vienen de CICLO_PIEZA). */
const TONO_PIEZA: Record<string, 'purple' | 'green' | 'amber' | 'muted'> = {
  'Borrador': 'muted', 'En verificación': 'amber', 'Aprobada por el panel': 'purple',
  'Publicada': 'green', 'Medida': 'green',
};
/** En qué paso del ciclo está una pieza, según el estado en el que la dejó el equipo. */
const PASO_DE_PIEZA: Record<string, string> = {
  'Borrador': 'Producir', 'En verificación': 'Verificar', 'Aprobada por el panel': 'Publicar',
  'Publicada': 'Publicar', 'Medida': 'Crecer',
};

/** El paso del ciclo donde trabaja el avatar: se busca por quién lo hace, no por posición. */
const PASO_AVATAR = CICLO_PASOS.find(p => /avatar/i.test(p.quien)) ?? CICLO_PASOS[0];

/** El mínimo del panel para publicar, leído del guardrail: es el mismo número en toda la vista. */
const MINIMO_PANEL = Number(/m[íi]nimo\s*(\d+)/i.exec(GUARDRAILS_CREADOR.find(g => /sin verificar/i.test(g.nombre))?.valor ?? '')?.[1] ?? 80);

/** Las piezas del mes que salieron del avatar: las que la data marca como «Video del avatar». */
const DEL_AVATAR = PIEZAS_DEL_MES.filter(p => /avatar/i.test(p.tipo) || /avatar/i.test(p.quien));

/** El panel la frena: quedó en borrador con un puntaje abajo del mínimo. No se le cobra al creador. */
const laFrenoElPanel = (p: typeof PIEZAS_DEL_MES[number]) => p.puntaje > 0 && p.puntaje < 80;

/** Lo que costó una pieza del avatar, en créditos. Lo que el panel frenó no sale de tu cuenta. */
const costoDePieza = (p: typeof PIEZAS_DEL_MES[number]) => (laFrenoElPanel(p) ? 0 : p.creditos);

// ---------------------------------------------------------------------------------------------
// LO QUE PUEDE CREAR, CRUZADO CON LO QUE CUESTA (`AVATAR.quePuede` × `AVATAR.gasto`)
// Cada cosa que el avatar hace se cobra con una línea de la grilla de gasto; el cruce se declara
// acá una sola vez para que ninguna pantalla invente un precio que la data no tiene.
// ---------------------------------------------------------------------------------------------

/** Los créditos de una línea de la grilla del avatar: es la única fuente de precios. */
const creditosDe = (pieza: string) => AVATAR.gasto.find(g => g.pieza === pieza)?.creditos ?? 0;

type Cruce = {
  /** Lo que cuesta crearla, línea por línea de `AVATAR.gasto`. */
  costos: { lb: string; c: number }[];
  /** Los créditos que se suman cuando el creador pide esa pieza. */
  crea: number;
};

const CRUCE: Record<string, Cruce> = {
  'Video tuyo hablando': {
    costos: [
      { lb: 'Video del avatar, 5 segundos', c: creditosDe('Video del avatar (5 s)') },
      { lb: 'Video premium, 5 segundos', c: creditosDe('Video del avatar premium (5 s)') },
    ],
    crea: creditosDe('Video del avatar (5 s)'),
  },
  'Fotos y carruseles': {
    costos: [
      { lb: 'Foto con tu cara', c: creditosDe('Foto con tu cara') },
      { lb: 'Imagen hero, para la portada', c: creditosDe('Imagen hero') },
    ],
    crea: creditosDe('Foto con tu cara'),
  },
  'Clips cortos': {
    costos: [{ lb: 'Clip sacado de un video tuyo', c: creditosDe('Clips de un video tuyo') }],
    crea: creditosDe('Clips de un video tuyo'),
  },
  'Historias del día': {
    // La secuencia es de dos o tres placas con tu cara: tres placas por la foto con tu cara.
    costos: [{ lb: 'Tres placas con tu cara', c: creditosDe('Foto con tu cara') * 3 }],
    crea: creditosDe('Foto con tu cara') * 3,
  },
};

/** El ícono de cada cosa que el avatar puede crear (el dibujo no lo trae la data). */
const ICONO: Record<string, any> = {
  'Video tuyo hablando': I_Robot,
  'Fotos y carruseles': I_Camera,
  'Clips cortos': I_Film,
  'Historias del día': I_Cal,
};

const SIN_CRUCE: Cruce = { costos: [], crea: 0 };

/** Una pieza que el avatar acaba de crear y que todavía no pasó por el panel. */
type Nueva = { id: string; t: string; c: number; hora: string };

/** La hora real de la creación: es lo que hace que la pieza «a la vista» sea verificable. */
const horaAhora = () => new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

/** Cuántas piezas le hacen falta para entrenarlo, leído de la data («18 piezas tuyas, de…»). */
const PIEZAS_ENTRENO = Number(/(\d+)\s*piezas?/i.exec(AVATAR.entrenadoCon)?.[1] ?? 0);
/** Con qué material se entrena: las redes, sacadas del mismo dato. */
const REDES_ENTRENO = AVATAR.entrenadoCon.replace(/^\d+\s*piezas tuyas,?\s*/i, '');

/** La regla de autonomía de crear con el avatar: es compartida (el avatar produce y vos aprobás). */
const REGLA_AVATAR = AUTONOMIA_CREADOR.find(a => /avatar/i.test(a.accion));
const GUARD_PANEL = GUARDRAILS_CREADOR.find(g => /sin verificar/i.test(g.nombre));
const GUARD_TECHO = GUARDRAILS_CREADOR.find(g => /techo de gasto diario/i.test(g.nombre));

export function ViewAvatarCreador({ setToast, setVista }: { setToast: (t: string) => void; setVista: (v: Vista) => void }) {
  const detalle = useDetalle();

  // --- Los estados nuevos de esta pantalla. El avatar arranca como dice la data.
  /** El entrenamiento del avatar: listo, entrenando o sin entrenar. */
  const [entrenamiento, setEntrenamiento] = useState<Entrenamiento>(AVATAR.estado);
  /** Si el avatar está encendido o apagado (pausado): apagarlo no borra el entrenamiento. */
  const [encendido, setEncendido] = useState(true);
  /** Las piezas que el avatar creó desde esta pantalla: nacen como borrador y se ven al instante. */
  const [creadas, setCreadas] = useState<Nueva[]>([]);

  const apagado = !encendido;
  const estadoVisible: EstadoVisible = apagado ? 'apagado' : entrenamiento;
  /** El avatar sólo crea si está entrenado y encendido: es la condición de todos los botones. */
  const puedeCrear = entrenamiento === 'listo' && encendido;

  // ============================ LOS NÚMEROS, TODOS DE LA DATA ============================
  const creditosDelMes = DEL_AVATAR.reduce((s, p) => s + costoDePieza(p), 0);
  const creditosNuevas = creadas.reduce((s, n) => s + n.c, 0);
  const piezasDelAvatar = DEL_AVATAR.length + creadas.length;
  const creditosTotales = creditosDelMes + creditosNuevas;
  const frenadosPorElPanel = DEL_AVATAR.filter(laFrenoElPanel).reduce((s, p) => s + p.creditos, 0);
  const esperanTuOk = DEL_AVATAR.filter(p => p.estado === 'Aprobada por el panel').length;
  const yaSalieron = DEL_AVATAR.filter(p => p.estado === 'Publicada' || p.estado === 'Medida').length;

  /** La línea que explica en qué está el avatar, según su estado. */
  const lineaDelEstado: Record<EstadoVisible, string> = {
    listo: `El avatar creó ${piezasDelAvatar} ${piezasDelAvatar === 1 ? 'pieza' : 'piezas'} este mes con tu cara y tu voz. Todo lo que produce nace como borrador y pasa por el panel de 5 antes de publicarse.`,
    apagado: `El avatar está apagado: no crea nada nuevo. Las ${piezasDelAvatar} ${piezasDelAvatar === 1 ? 'pieza' : 'piezas'} que ya creó siguen en Contenido como borrador y no se pierden: lo podés volver a encender cuando quieras.`,
    entrenando: `Está aprendiendo de tus ${PIEZAS_ENTRENO} piezas (${REDES_ENTRENO}): tu cara y tu voz. Mientras aprende no crea nada y no gasta créditos.`,
    'sin-entrenar': `Todavía no está entrenado. Para que cree por vos necesita ${PIEZAS_ENTRENO} piezas tuyas (${REDES_ENTRENO}): de ahí saca tu cara y tu voz. Lo que ya creó sigue guardado.`,
  };

  // ============================ LOS BOTONES QUE HACEN (y se ven al instante) ============================

  /** Apagarlo: queda pausado. Lo creado no se pierde y se vuelve a encender con un toque. */
  const apagar = () => {
    setEncendido(false);
    setToast(`El avatar quedó apagado: no crea nada nuevo. Sus ${piezasDelAvatar} piezas del mes siguen en Contenido como borrador.`);
  };
  const encender = () => {
    setEncendido(true);
    setToast('El avatar volvió a estar encendido: sigue creando con tu cara y tu voz y nada se perdió.');
  };

  /** Entrenarlo: arranca el aprendizaje con las piezas propias. El cambio se ve en el acto. */
  const entrenar = () => {
    setEntrenamiento('entrenando');
    setToast(`Arrancó el entrenamiento: el equipo está aprendiendo tu cara y tu voz de tus ${PIEZAS_ENTRENO} piezas.`);
  };
  const terminarEntrenamiento = () => {
    setEntrenamiento('listo');
    setToast(`Tu avatar quedó listo: ${AVATAR.parecido}% de parecido con vos. Ya puede crear con tu material.`);
  };
  /** Cancelar el entrenamiento (o empezar de cero): vuelve a «sin entrenar» y lo creado queda igual. */
  const volverASinEntrenar = () => {
    setEntrenamiento('sin-entrenar');
    setEncendido(true);
    setToast(`El avatar quedó sin entrenar. Sus ${piezasDelAvatar} piezas del mes siguen en Contenido: no se perdió nada.`);
  };

  /** Que lo haga: el avatar crea la pieza y la deja como borrador, a la vista, para el panel. */
  const crear = (t: string, c: number) => {
    const n: Nueva = { id: `av-${Date.now()}`, t, c, hora: horaAhora() };
    setCreadas(prev => [n, ...prev]);
    setToast(`El avatar creó «${n.t}»: quedó como borrador por ${n.c} créditos. Va al panel de 5 antes de publicarse y no sale sin tu OK.`);
  };
  /** Deshacer la creación: la pieza se saca y esos créditos no se gastan. */
  const deshacer = (n: Nueva) => {
    setCreadas(prev => prev.filter(x => x.id !== n.id));
    setToast(`«${n.t}» se sacó de los borradores: no se creó nada y los ${n.c} créditos no se gastaron.`);
  };

  /** Los dos destinos de una pieza del avatar: el tablero de Contenido y la cola de Publicación. */
  const irAContenido = () => {
    setVista('campanas');
    setToast('Vas a Contenido: las piezas del avatar con su puntaje del panel y su estado en el ciclo');
  };
  const irAPublicacion = () => {
    setVista('publicacion');
    setToast('Vas a Publicación: qué sale, en qué red y en qué ventana');
  };

  // ============================ LOS PANELES DE DETALLE ============================

  /** Una pieza del avatar: su puntaje del panel, su paso del ciclo y lo que costó. */
  const verPieza = (p: typeof PIEZAS_DEL_MES[number]) => detalle({
    titulo: p.titulo,
    sub: `${p.tipo} · ${p.quien}. Estado en el ciclo: ${p.estado} (paso «${PASO_DE_PIEZA[p.estado]}»).`,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Puntaje del panel', v: p.puntaje > 0 ? `${p.puntaje} de 100` : 'sin puntaje todavía',
          tono: p.puntaje >= 80 ? 'green' : p.puntaje > 0 ? 'amber' : 'muted',
          s: p.puntaje === 0 ? 'la acaba de crear el avatar: el panel la puntúa antes de publicarse'
            : laFrenoElPanel(p) ? 'no llega al mínimo de 80: no se publica y no se te cobra' : 'pasa: arriba de 80 se publica' },
        { k: 'Estado en el ciclo', v: p.estado, s: `paso «${PASO_DE_PIEZA[p.estado]}»: ${CICLO_PASOS.find(c => c.nombre === PASO_DE_PIEZA[p.estado])?.que ?? ''}` },
        { k: 'Cuándo sale', v: p.cuando === '—' ? 'todavía sin fecha' : p.cuando, s: p.cuando === '—' ? 'espera al panel y a tu OK' : `en ${p.red}, en la ventana de tu audiencia` },
        { k: 'Lo que costó', v: `${costoDePieza(p)} créditos`, s: laFrenoElPanel(p) ? `los ${p.creditos} créditos los pagó el sistema: la pieza que el panel frena no se te cobra` : `se cobra por pieza creada, como ${p.tipo}` },
        { k: 'Quién la hizo', v: p.quien, s: 'el avatar pone tu cara y tu voz; Nia escribe el guion' },
        ...(p.retencion ? [{ k: 'Cómo retuvo', v: p.retencion, s: 'es la métrica que más mueve el alcance' }] : []),
      ] },
      ...(p.nota ? [{ tipo: 'texto' as const, texto: p.nota }] : []),
      { tipo: 'aviso' as const, tono: 'green' as const, texto: 'Nada creado por el avatar se publica sin pasar por el panel de 5 y por tu OK. Se puede apagar cuando quieras y lo que creó queda como borrador.' },
    ],
    fuente: `Piezas del mes creadas con tu avatar · grilla de gasto del avatar (${AVATAR.gasto.length} líneas).`,
    acciones: [
      { label: 'Ver en Contenido', variante: 'primary', title: 'Va a Contenido: la pieza con su puntaje del panel y su estado en el ciclo', onClick: () => setVista('campanas') },
      { label: 'Ver la publicación', title: 'Va a Publicación: la red, la ventana y el OK que le falta para salir', onClick: () => setVista('publicacion') },
    ],
  });

  /** Una de las cuatro cosas que el avatar puede hacer: qué es, con qué la arma y qué cuesta. */
  const verQueHace = (t: string, s: string, cruce: Cruce) => detalle({
    titulo: t,
    sub: s,
    bloques: [
      { tipo: 'filas', items: cruce.costos.map(c => ({
        t: c.lb, s: 'línea de la grilla del avatar', etiqueta: `${c.c} ${c.c === 1 ? 'crédito' : 'créditos'}`, tono: 'purple' as const,
      })) },
      { tipo: 'datos', filas: [
        { k: 'Con qué la arma', v: `Tus ${PIEZAS_ENTRENO} piezas`, s: AVATAR.entrenadoCon },
        { k: 'La voz', v: AVATAR.voz.split('(')[0].trim(), s: AVATAR.voz },
        { k: 'Quién la revisa', v: 'El panel de 5', s: `mínimo para publicar: ${MINIMO_PANEL}` },
      ] },
      { tipo: 'pasos', items: [
        'Le pedís la pieza y el avatar la crea con tu cara y tu voz: queda como borrador.',
        'El panel de 5 la puntúa de 0 a 100. Con 80 o más aprueba; si no, vuelve con la objeción.',
        'Vos le das el OK: recién ahí Kai la programa en tus redes, en la ventana que le conviene a tu audiencia.',
      ] },
      { tipo: 'aviso', tono: 'amber', texto: 'Se cobra cuando el avatar crea la pieza, con los créditos de tu plan. Si la sacás del borrador, esos créditos no se gastan.' },
    ],
    fuente: `Lo que el avatar puede crear con tu material y lo que cuesta cada línea en la grilla del avatar.`,
    acciones: [
      { label: `Que lo haga · ${cruce.crea} créditos`, variante: 'primary',
        title: `El avatar crea la pieza ahora y la deja como borrador a la vista. Antes de publicarse pasa por el panel de 5 y por tu OK, y la podés sacar sin gastar los créditos.`,
        onClick: () => crear(t, cruce.crea) },
      { label: 'Cerrar', title: 'Cierra el panel sin pedirle nada al avatar', onClick: () => {} },
    ],
  });

  /** La grilla completa del avatar: de dónde sale el precio de cada cosa que crea. */
  const verGrilla = () => detalle({
    titulo: 'Lo que cuesta cada pieza del avatar',
    sub: `Las ${AVATAR.gasto.length} líneas de la grilla de tu avatar, en créditos. El avatar gasta de los créditos de tu plan y el techo del día lo frena: ${GUARD_TECHO?.valor ?? 'el del plan'}.`,
    bloques: [
      { tipo: 'filas', items: AVATAR.gasto.map(g => ({
        t: g.pieza, s: 'se cobra por pieza creada', etiqueta: `${g.creditos} ${g.creditos === 1 ? 'crédito' : 'créditos'}`,
        tono: g.pieza.includes('premium') ? 'amber' as const : 'purple' as const,
      })) },
      { tipo: 'datos', filas: [
        { k: 'Este mes, con tu avatar', v: `${creditosTotales} créditos`, s: `${piezasDelAvatar} piezas: las ${DEL_AVATAR.length} del mes${creadas.length ? ` y las ${creadas.length} que pediste desde esta pantalla` : ''}` },
        { k: 'Lo frenó el panel', v: `${frenadosPorElPanel} créditos`, s: 'los paga el sistema: la pieza que el panel rechaza no se te cobra' },
      ] },
      { tipo: 'aviso', tono: 'green', texto: 'El avatar sólo gasta cuando crea una pieza. Verificar, programar y medir no cuestan créditos.' },
    ],
    fuente: 'Grilla de gasto del avatar y techo diario del creador, tal como están en tu cuenta.',
  });

  // ============================ LA PANTALLA ============================
  return (
    <div className="dash">
      <ViewHead
        icon={<I_Robot size={19} />}
        titulo="Avatar"
        sub="El equipo crea por vos con tu cara y tu voz"
        nums={[
          { v: ESTADO_TXT[estadoVisible], l: 'estado de tu avatar', c: ESTADO_COLOR[estadoVisible] },
          { v: `${AVATAR.parecido}%`, l: 'de parecido con vos', c: 'var(--green)' },
          { v: String(piezasDelAvatar), l: `piezas creadas este mes${creadas.length ? ` (${creadas.length} recién ${creadas.length === 1 ? 'creada' : 'creadas'})` : ''}`, c: 'var(--purple3)' },
          { v: `${creditosTotales.toLocaleString('es-AR')}`, l: 'créditos que costó este mes', c: 'var(--amber)' },
        ]}
      />

      {/* LA REGLA DEL MODELO, ARRIBA DE TODO: crear con el avatar es compartido. */}
      {REGLA_AVATAR && (
        <div className="onb-infiere" style={{ marginTop: 0 }}>
          <span className="onb-infiere-ic"><I_Zap size={13} /></span>
          <span>
            <b>Crear con tu avatar está en Compartido. </b>
            {REGLA_AVATAR.nota} Por eso cada pieza que el avatar crea nace como borrador y el panel de 5 la
            puntúa antes de que veas el OK.
          </span>
        </div>
      )}

      {/* ================= 1 · TU AVATAR: cómo está, con qué se entrenó y el control de estado ================= */}
      <div className="csec">
        <span className="csec-n">1</span>
        <span className="csec-t">Tu avatar</span>
        <span className={`csec-c ${entrenamiento === 'listo' && encendido ? 'purple' : 'amber'}`}>{ESTADO_TXT[estadoVisible]}</span>
        <span className="csec-s">Con qué se entrenó, qué tan parecido es y cómo se apaga y se vuelve a encender</span>
      </div>
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Robot size={14} style={{ color: ESTADO_COLOR[estadoVisible] }} /> Cómo está tu avatar</span>}
        action={<Badge tone={ESTADO_TONO[estadoVisible]}>{ESTADO_TXT[estadoVisible]}</Badge>}
      >
        {/* El estado, grande y claro: es lo primero que tiene que entender el creador. */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 34, fontWeight: 900, letterSpacing: -1.2, lineHeight: 1, color: ESTADO_COLOR[estadoVisible] }}>
              {ESTADO_TXT[estadoVisible]}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>
              {AVATAR.nombre.toLowerCase()}
            </span>
          </div>
          <div className="bs" style={{ marginTop: 6 }}>{lineaDelEstado[estadoVisible]}</div>
        </div>

        <div className="guards" style={{ marginTop: 14 }}>
          <div className="guard">
            <span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_User size={15} /></span>
            <span className="guard-lb">Con qué se entrenó
              <small>{AVATAR.entrenadoCon}: de ahí saca tu cara y tu voz.</small>
            </span>
            {entrenamiento === 'sin-entrenar'
              ? <Badge tone="amber">faltan {PIEZAS_ENTRENO} piezas</Badge>
              : <Badge tone="green">aprendido</Badge>}
          </div>

          <div className="guard">
            <span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={15} /></span>
            <span className="guard-lb">Qué tan parecido es a vos
              <small>El parecido se mide sobre las piezas que ya creó: cuánto se parece su cara y su voz a las tuyas.</small>
            </span>
            <span className="guard-val" style={{ color: 'var(--green)', fontSize: 15 }}>{AVATAR.parecido}%</span>
          </div>

          <div className="guard">
            <span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Robot size={15} /></span>
            <span className="guard-lb">La voz
              <small>{AVATAR.voz}.</small>
            </span>
            <Badge tone="purple">{entrenamiento === 'listo' ? 'lista' : 'por aprender'}</Badge>
          </div>

          <div className="guard">
            <span style={{ color: 'var(--amber)', flexShrink: 0 }}><I_Credit size={15} /></span>
            <span className="guard-lb">Este mes creó {piezasDelAvatar} {piezasDelAvatar === 1 ? 'pieza' : 'piezas'}
              <small>
                Costaron {creditosTotales.toLocaleString('es-AR')} créditos
                {creadas.length ? `: ${creditosDelMes.toLocaleString('es-AR')} de las ${DEL_AVATAR.length} del mes y ${creditosNuevas.toLocaleString('es-AR')} de las ${creadas.length} que pediste acá` : `, de las ${DEL_AVATAR.length} piezas del mes`}.
                {frenadosPorElPanel ? ` Los ${frenadosPorElPanel} créditos de la que frenó el panel los pagó el sistema.` : ''}
              </small>
            </span>
            <span className="guard-val" style={{ color: 'var(--amber)' }}>{creditosTotales.toLocaleString('es-AR')} créditos</span>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <Gauge pct={AVATAR.parecido} label="Qué tan parecido es a vos"
            detalle={`${AVATAR.parecido}% · medido sobre tus ${PIEZAS_ENTRENO} piezas`}
            color="var(--green)" />
        </div>

        {/* ---------- EL CONTROL DE ESTADO: apagarlo, encenderlo o entrenarlo ---------- */}
        <div className="row" style={{ gap: 9, marginTop: 16, flexWrap: 'wrap' }}>
          {entrenamiento === 'listo' && encendido && (
            <Button title="Apaga el avatar: deja de crear con tu cara y tu voz hasta que lo vuelvas a encender. Lo que ya creó queda como borrador y no se pierde. Es reversible." onClick={apagar}>
              <I_Pause size={13} /> Apagarlo
            </Button>
          )}
          {entrenamiento === 'listo' && apagado && (
            <Button title="Vuelve a encender el avatar: sigue creando con tu cara y tu voz donde lo dejó. Lo que creó mientras estaba apagado sigue esperando tu OK. Es reversible: lo podés apagar de nuevo." onClick={encender}>
              <I_Play size={13} /> Encenderlo
            </Button>
          )}
          {entrenamiento === 'sin-entrenar' && (
            <Button title={`Arranca el entrenamiento con tus ${PIEZAS_ENTRENO} piezas (${REDES_ENTRENO}): el equipo aprende tu cara y tu voz. Mientras aprende no crea nada ni gasta créditos. Es reversible: podés dejarlo sin entrenar.`} onClick={entrenar}>
              <I_Upload size={13} /> Entrenarlo
            </Button>
          )}
          {entrenamiento === 'entrenando' && (
            <Button title={`Termina el entrenamiento: el avatar queda listo y empieza a crear con tu cara y tu voz. Es reversible: lo podés apagar o dejar sin entrenar desde acá.`} onClick={terminarEntrenamiento}>
              <I_Check size={13} /> Terminar el entrenamiento
            </Button>
          )}
          {(entrenamiento === 'entrenando' || apagado) && (
            <Button variant="ghost" title={entrenamiento === 'entrenando'
              ? 'Cancela el entrenamiento y deja el avatar sin entrenar. Lo que ya creó sigue en Contenido como borrador: lo podés entrenar de nuevo cuando quieras.'
              : 'Deja el avatar como nuevo, sin entrenar, para entrenarlo otra vez con tus piezas. No se pierde nada de lo que ya creó: todo queda como borrador.'}
              onClick={volverASinEntrenar}>
              {entrenamiento === 'entrenando' ? 'Cancelar el entrenamiento' : 'Empezar de cero'}
            </Button>
          )}
          <Button variant="ghost" className="btn-sm"
            title="Muestra de dónde sale el parecido, con qué piezas se entrenó y qué significa cada estado"
            onClick={() => detalle({
              titulo: `Tu avatar: ${ESTADO_TXT[estadoVisible]}`,
              sub: `${AVATAR.nombre} · ${AVATAR.parecido}% de parecido con vos, entrenado con ${AVATAR.entrenadoCon}.`,
              bloques: [
                { tipo: 'datos', filas: [
                  { k: 'Estado', v: ESTADO_TXT[estadoVisible], tono: ESTADO_TONO[estadoVisible], s: 'listo, entrenando, sin entrenar o apagado' },
                  { k: 'Entrenado con', v: AVATAR.entrenadoCon, s: `son las piezas que el equipo leyó para aprender tu cara y tu voz` },
                  { k: 'Parecido', v: `${AVATAR.parecido}%`, s: 'sobre las piezas que ya creó con tu material' },
                  { k: 'La voz', v: AVATAR.voz },
                  { k: 'Cuánto costó este mes', v: `${creditosTotales.toLocaleString('es-AR')} créditos`, s: `${piezasDelAvatar} piezas creadas con tu avatar` },
                ] },
                { tipo: 'filas', items: CICLO_PASOS.map((c, i) => ({
                  t: `${i + 1}. ${c.nombre}`, s: `${c.quien}: ${c.que}`,
                  etiqueta: c.nombre === PASO_AVATAR.nombre ? 'el avatar trabaja acá' : 'después',
                  tono: c.nombre === PASO_AVATAR.nombre ? 'purple' as const : 'muted' as const,
                })) },
                { tipo: 'aviso', tono: 'green', texto: 'Nada creado por el avatar se publica sin pasar por el panel de 5 y por tu OK. Se puede apagar cuando quieras y lo que ya creó queda como borrador.' },
              ],
              fuente: 'El avatar de tu cuenta: con qué se entrenó, cuánto se parece y en qué paso del ciclo trabaja.',
            })}>
            Ver por qué
          </Button>
        </div>

        {/* ---------- DÓNDE TRABAJA EL AVATAR EN EL CICLO DE UNA PIEZA ---------- */}
        <div className="csec" style={{ margin: '18px 0 8px' }}>
          <span className="csec-t" style={{ fontSize: 13.5 }}>Dónde trabaja el avatar</span>
          <span className="csec-s">El ciclo de una pieza: producir, verificar, publicar y crecer</span>
        </div>
        <div className="flujo-pasos">
          {CICLO_PASOS.map((c, i) => (
            <div key={c.nombre} className={`flujo-paso ${c.nombre === PASO_AVATAR.nombre ? 'on' : ''}`}
              title={`${c.nombre} · ${c.quien}: ${c.que}`}>
              <span className="flujo-paso-n">{i + 1}</span>
              <span style={{ minWidth: 0 }}>
                <span className="flujo-paso-t">{c.nombre}</span>
                <span className="flujo-paso-d">{c.quien}: {c.que}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="acc-why">
          Tu avatar trabaja en <b>«{PASO_AVATAR.nombre}»</b>: arma la pieza y la deja como borrador. Después
          el panel de 5 la verifica, y recién con tu OK Kai la programa en tus redes.
        </div>
      </Card>

      {/* ================= 2 · LO QUE PUEDE CREAR POR VOS ================= */}
      <div className="csec">
        <span className="csec-n">2</span>
        <span className="csec-t">Lo que puede crear por vos</span>
        <span className="csec-c purple">{AVATAR.quePuede.length} cosas</span>
        <span className="csec-s">Cada una con lo que cuesta en créditos y un botón para que el avatar la haga</span>
      </div>
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Robot size={14} style={{ color: 'var(--purple3)' }} /> Con tu cara y tu voz</span>}
        action={<Badge tone={puedeCrear ? 'green' : 'amber'}>{puedeCrear ? 'listo para crear' : ESTADO_TXT[estadoVisible].toLowerCase()}</Badge>}
      >
        <div className="bs">
          El avatar usa tus {PIEZAS_ENTRENO} piezas y tu voz. Pedís una pieza, la crea, y queda como
          <b> borrador</b> hasta que el panel la apruebe y vos des el OK.
        </div>

        <div className="guards" style={{ marginTop: 12 }}>
          {AVATAR.quePuede.map(q => {
            const cruce = CRUCE[q.t] ?? SIN_CRUCE;
            const Icon = ICONO[q.t] ?? I_Robot;
            const nueva = creadas.find(n => n.t === q.t);
            const sinLinea = cruce.costos.length === 0;
            return (
              <div key={q.t} className="guard" style={{ alignItems: 'flex-start', paddingTop: 12, paddingBottom: 12 }}>
                <span style={{ color: 'var(--purple3)', flexShrink: 0, marginTop: 2 }}><Icon size={17} /></span>
                <span className="guard-lb" style={{ minWidth: 0 }}>
                  <span className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
                    <span className="bt">{q.t}</span>
                    {nueva
                      ? <Badge tone="amber">borrador creado {nueva.hora}</Badge>
                      : sinLinea
                        ? <Badge tone="muted">sin línea en la grilla</Badge>
                        : <Badge tone="purple">{cruce.costos.map(c => `${c.c} ${c.c === 1 ? 'crédito' : 'créditos'}`).join(' · ')}</Badge>}
                  </span>
                  <small>{q.s}</small>
                  {cruce.costos.length > 0 && (
                    <small>
                      {cruce.costos.map(c => `${c.lb}: ${c.c} ${c.c === 1 ? 'crédito' : 'créditos'}`).join(' · ')}.
                      {' '}Lo creado pasa por el panel de 5 antes de publicarse.
                    </small>
                  )}
                </span>
                <span className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
                  {nueva ? (
                    <>
                      <Button variant="ghost" className="btn-sm"
                        title={`Saca «${nueva.t}» de los borradores: la pieza no se publica y los ${nueva.c} créditos no se gastan. Es reversible: se la podés volver a pedir al avatar.`}
                        onClick={() => deshacer(nueva)}>Deshacer</Button>
                      <Button variant="ghost" className="btn-sm"
                        title="Muestra la pieza recién creada en Contenido, con su estado en el ciclo y el panel que le falta"
                        onClick={irAContenido}>Ver en Contenido</Button>
                    </>
                  ) : (
                    <>
                      <Button className="btn-sm" disabled={!puedeCrear}
                        title={puedeCrear
                          ? `El avatar crea «${q.t}» por ${cruce.crea} créditos y la deja como borrador a la vista. Antes de publicarse pasa por el panel de 5 y por tu OK. Es reversible: con Deshacer la pieza se saca y los créditos no se gastan.`
                          : estadoVisible === 'apagado'
                            ? 'El avatar está apagado: encendelo para que cree por vos. Lo que ya creó sigue guardado.'
                            : `El avatar todavía no está entrenado: con tus ${PIEZAS_ENTRENO} piezas queda listo y empieza a crear.`}
                        onClick={() => crear(q.t, cruce.crea)}>Que lo haga</Button>
                      <Button variant="ghost" className="btn-sm"
                        title={`Qué es «${q.t}», con qué material la arma el avatar y qué cuesta cada variante`}
                        onClick={() => verQueHace(q.t, q.s, cruce)}><I_Eye size={13} /> Ver por qué</Button>
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        <div className="como-se-lee" style={{ marginTop: 12, marginBottom: 0 }}>
          <b>Lo que cuesta cada pieza del avatar:</b>{' '}
          {AVATAR.gasto.map(g => `${g.pieza} ${g.creditos} ${g.creditos === 1 ? 'crédito' : 'créditos'}`).join(' · ')}.
          Todas se cobran cuando el avatar la crea, con los créditos de tu plan.
        </div>

        <div className="row" style={{ gap: 9, marginTop: 12, flexWrap: 'wrap' }}>
          <Button variant="outline" className="btn-sm"
            title="Abre la grilla del avatar pieza por pieza, con lo que costó este mes y lo que frenó el panel"
            onClick={verGrilla}><I_Credit size={13} /> Ver la grilla del avatar</Button>
          <Button variant="ghost" className="btn-sm"
            title="Va a Créditos: el saldo, lo que consume el equipo y cuántos días de trabajo quedan"
            onClick={() => { setVista('creditos'); setToast('Vas a Créditos: el saldo y lo que consume el equipo'); }}>
            Ver mis créditos
          </Button>
          {GUARD_TECHO && (
            <span className="tiny muted" style={{ alignSelf: 'center' }}>
              Techo del día: {GUARD_TECHO.valor}. {GUARD_TECHO.porQue}
            </span>
          )}
        </div>
        <div className="acc-why">
          Cada botón <b>«Que lo haga»</b> deja la pieza creada como borrador, a la vista, y avisa que va a pasar
          por el panel de 5 antes de publicarse: <b>nada sale a tus redes sin tu OK</b>. Si la sacás del borrador,
          los créditos no se gastan.
        </div>
      </Card>

      {/* ================= 3 · LO QUE CREÓ: las piezas del mes que salieron del avatar ================= */}
      <div className="csec">
        <span className="csec-n">3</span>
        <span className="csec-t">Lo que creó tu avatar este mes</span>
        <span className={`csec-c ${esperanTuOk ? 'amber' : 'purple'}`}>
          {esperanTuOk ? `${esperanTuOk} esperan tu OK` : `${yaSalieron} ya salieron`}
        </span>
        <span className="csec-s">Con su puntaje del panel, su estado en el ciclo y cuándo sale cada una</span>
      </div>
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Film size={14} style={{ color: 'var(--purple3)' }} /> Piezas creadas con tu avatar</span>}
        action={<Badge tone="purple">{piezasDelAvatar} del mes · {creditosTotales.toLocaleString('es-AR')} créditos</Badge>}
      >
        {/* Las que se pidieron desde esta pantalla: se ven al instante, arriba de todo. */}
        {creadas.map(n => (
          <div key={n.id} className="guard" style={{ alignItems: 'flex-start', paddingTop: 12, paddingBottom: 12 }}>
            <span style={{ width: 34, flexShrink: 0, textAlign: 'center', fontSize: 17, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: 'var(--muted)' }}
              title="Todavía no tiene puntaje: la acaba de crear el avatar">—</span>
            <span className="guard-lb" style={{ minWidth: 0 }}>
              <span className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
                <span className="bt">{n.t}</span>
                <Badge tone={TONO_PIEZA[CICLO_PIEZA[0]]}>{CICLO_PIEZA[0]}</Badge>
                <Badge tone="amber">recién creada</Badge>
              </span>
              <small>
                La creó tu avatar a las {n.hora}, por {n.c} {n.c === 1 ? 'crédito' : 'créditos'} · paso «{PASO_DE_PIEZA[CICLO_PIEZA[0]]}»
              </small>
              <small>Va al panel de 5 antes de publicarse: no sale sin tu OK.</small>
            </span>
            <span className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
              <Button variant="ghost" className="btn-sm"
                title={`Saca «${n.t}» de los borradores: no se publica y los ${n.c} créditos no se gastan. Es reversible: se la podés volver a pedir.`}
                onClick={() => deshacer(n)}>Deshacer</Button>
              <Button variant="ghost" className="btn-sm"
                title="Muestra la pieza en Contenido, con su estado en el ciclo y la verificación que le falta"
                onClick={irAContenido}>Ver en Contenido</Button>
            </span>
          </div>
        ))}

        {DEL_AVATAR.map(p => {
          const frenada = laFrenoElPanel(p);
          const colorPanel = p.puntaje >= 80 ? 'var(--green)' : p.puntaje > 0 ? 'var(--amber)' : 'var(--muted)';
          return (
            <div key={p.id} className="guard" style={{ alignItems: 'flex-start', paddingTop: 12, paddingBottom: 12 }}>
              <span style={{ width: 34, flexShrink: 0, textAlign: 'center', fontSize: 17, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: colorPanel }}
                title={p.puntaje > 0 ? `Puntaje del panel: ${p.puntaje} de 100. El mínimo para publicar es 80.` : 'Sin puntaje todavía: el panel la puntúa antes de publicarse.'}>
                {p.puntaje > 0 ? p.puntaje : '—'}
              </span>
              <span className="guard-lb" style={{ minWidth: 0 }}>
                <span className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
                  <span className="bt">{p.titulo}</span>
                  <Badge tone={TONO_PIEZA[p.estado] ?? 'muted'}>{p.estado}</Badge>
                  {frenada && <Badge tone="amber">frenada por el panel</Badge>}
                </span>
                <small>
                  {p.tipo} · paso «{PASO_DE_PIEZA[p.estado]}» · {p.cuando === '—' ? 'todavía sin fecha' : `sale ${p.cuando}`}
                  {' '}· {costoDePieza(p)} {costoDePieza(p) === 1 ? 'crédito' : 'créditos'}
                  {frenada ? ` (los ${p.creditos} los pagó el sistema)` : ''}
                </small>
                <small>{p.quien}{p.retencion ? ` · ${p.retencion}` : ''}{p.red ? ` · ${p.red}` : ''}</small>
                {p.nota && <small>{p.nota}</small>}
              </span>
              <span className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
                <Button variant="ghost" className="btn-sm"
                  title={`Muestra el puntaje del panel, el paso del ciclo, cuándo sale y lo que costó «${p.titulo}»`}
                  onClick={() => verPieza(p)}><I_Eye size={13} /> Ver por qué</Button>
              </span>
            </div>
          );
        })}

        <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
          <div className="dato" title="Las piezas del mes que salieron del avatar, contando las que pediste desde esta pantalla.">
            <span className="dato-l">Piezas con tu avatar</span>
            <span className="dato-v" style={{ color: 'var(--purple3)' }}>{piezasDelAvatar} de {PIEZAS_DEL_MES.length}</span>
          </div>
          <div className="dato" title="Lo que costaron esas piezas en créditos, con la grilla del avatar.">
            <span className="dato-l">Costaron</span>
            <span className="dato-v" style={{ color: 'var(--amber)' }}>{creditosTotales.toLocaleString('es-AR')} créditos</span>
          </div>
          <div className="dato" title="La pieza que el panel frena no se le cobra al creador: la regeneración la paga el sistema.">
            <span className="dato-l">Lo frenó el panel</span>
            <span className="dato-v" style={{ color: frenadosPorElPanel ? 'var(--green)' : 'var(--muted)' }}>
              {frenadosPorElPanel ? `${frenadosPorElPanel} créditos · los pagó el sistema` : 'nada este mes'}
            </span>
          </div>
          <div className="dato" title="Las piezas del avatar que ya pasaron el panel y esperan tu OK para que Kai las programe.">
            <span className="dato-l">Esperan tu OK</span>
            <span className="dato-v" style={{ color: esperanTuOk ? 'var(--amber)' : 'var(--muted)' }}>{esperanTuOk}</span>
          </div>
        </div>

        <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
          <Button className="btn-sm"
            title="Va a Contenido: las piezas del avatar con su puntaje del panel, su serie y su estado en el ciclo. Ahí se aprueban."
            onClick={irAContenido}><I_ArrowRight size={13} /> Ver las piezas en Contenido</Button>
          <Button variant="ghost" className="btn-sm"
            title="Va a Publicación: qué pieza sale, en qué red y en qué ventana, con el OK que le falta"
            onClick={irAPublicacion}>Ver la publicación</Button>
        </div>
        <div className="acc-why">
          Una pieza del avatar <b>no es una publicación</b>: es un borrador que espera. Primero el panel de 5 la
          puntúa (abajo de 80 no sale y no se te cobra) y después la aprobás vos.
        </div>
      </Card>

      {/* ================= 4 · SUS LÍMITES: las garantías del creador ================= */}
      <div className="csec">
        <span className="csec-n">4</span>
        <span className="csec-t">Sus límites</span>
        <span className="csec-c purple">{AVATAR.limites.length} garantías</span>
        <span className="csec-s">Lo que el avatar no puede hacer, ni aunque se lo pidas</span>
      </div>
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Shield size={14} style={{ color: 'var(--green)' }} /> Garantías de tu avatar</span>}
        action={<Badge tone="green">activas</Badge>}
      >
        <div className="guards">
          {AVATAR.limites.map(l => (
            <div key={l} className="guard">
              <span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Shield size={15} /></span>
              <span className="guard-lb">{l}</span>
              <Badge tone="green">garantía</Badge>
            </div>
          ))}
          <div className="guard">
            <span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Check size={15} /></span>
            <span className="guard-lb">{GUARD_PANEL?.nombre ?? 'Nada se publica sin verificar'}
              <small>{GUARD_PANEL?.porQue ?? 'Es lo que hace que tu cuenta no publique algo que no está a la altura.'} El panel puntúa todo lo que crea el avatar y su mínimo es {MINIMO_PANEL}.</small>
            </span>
            <Badge tone="purple">{GUARD_PANEL?.valor ?? '80'}</Badge>
          </div>
          <div className="guard">
            <span style={{ color: 'var(--amber)', flexShrink: 0 }}><I_Pause size={15} /></span>
            <span className="guard-lb">Se apaga cuando quieras
              <small>Apagado no crea nada nuevo, y lo que ya creó sigue en Contenido como borrador: no se pierde ni hay que volver a entrenarlo. Reversible: se enciende de nuevo.</small>
            </span>
            <Badge tone={apagado ? 'muted' : 'green'}>{apagado ? 'apagado ahora' : 'encendido'}</Badge>
          </div>
        </div>
        <div className="acc-why">
          El avatar <b>no inventa precios ni promesas</b>: trabaja con tu ficha y tu material, y todo lo que
          produce pasa por el panel y por tu OK. Vos podés apagarlo en cualquier momento y nada de lo creado
          se pierde.
        </div>
      </Card>

      {/* ================= 5 · CÓMO SE ENTRENA: cuatro pasos, sin jerga ================= */}
      <div className="csec">
        <span className="csec-n">5</span>
        <span className="csec-t">Cómo se entrena</span>
        <span className={`csec-c ${entrenamiento === 'listo' ? 'purple' : 'amber'}`}>{ESTADO_TXT[estadoVisible]}</span>
        <span className="csec-s">Tus piezas, tu cara y tu voz: el paso donde está hoy y lo que falta</span>
      </div>
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Upload size={14} style={{ color: 'var(--purple3)' }} /> Cuatro pasos</span>}
        action={<Badge tone={ESTADO_TONO[estadoVisible]}>{ESTADO_TXT[estadoVisible]}</Badge>}
      >
        <div className="flujo-pasos">
          {[
            { t: 'Subís tus piezas', d: `${PIEZAS_ENTRENO} piezas tuyas (${REDES_ENTRENO}): las que ya tenés publicadas sirven, no hay que grabar de nuevo.` },
            { t: 'Aprende tu cara y tu voz', d: AVATAR.voz + '.' },
            { t: 'Crea con eso', d: 'Nia escribe el guion y el avatar lo hace con tu cara y tu voz: tus manos no están en cámara y el ritmo no se corta.' },
            { t: 'Vos aprobás y sale', d: `El panel de 5 puntúa la pieza (mínimo ${MINIMO_PANEL}) y nada se publica sin tu OK.` },
          ].map((p, i) => {
            // Mientras no esté listo, el paso donde está hoy queda marcado: sin entrenar → 1, entrenando → 2.
            const pasoHoy = entrenamiento === 'sin-entrenar' ? 0 : entrenamiento === 'entrenando' ? 1 : 4;
            const clase = i < pasoHoy ? 'done' : i === pasoHoy ? 'on' : '';
            return (
              <div key={p.t} className={`flujo-paso ${clase}`} title={`Paso ${i + 1}: ${p.t}. ${p.d}`}>
                <span className="flujo-paso-n">{i + 1}</span>
                <span style={{ minWidth: 0 }}>
                  <span className="flujo-paso-t">{p.t}</span>
                  <span className="flujo-paso-d">{p.d}</span>
                </span>
              </div>
            );
          })}
        </div>

        <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
          {entrenamiento === 'sin-entrenar' && (
            <Button title={`Arranca el entrenamiento con tus ${PIEZAS_ENTRENO} piezas (${REDES_ENTRENO}). Mientras aprende no crea nada ni gasta créditos, y el proceso se puede cancelar.`}
              onClick={entrenar}><I_Upload size={13} /> Entrenarlo con mis {PIEZAS_ENTRENO} piezas</Button>
          )}
          {entrenamiento === 'entrenando' && (
            <Button title="Termina el entrenamiento: el avatar queda listo y arranca a crear con tu cara y tu voz. Es reversible." onClick={terminarEntrenamiento}>
              <I_Check size={13} /> Terminar el entrenamiento
            </Button>
          )}
          {entrenamiento === 'listo' && encendido && (
            <Button variant="ghost" className="btn-sm"
              title="Muestra qué aprendió, con cuántas piezas y qué tan parecido es a vos. No cambia nada del avatar."
              onClick={() => detalle({
                titulo: 'El entrenamiento de tu avatar',
                sub: `Con ${AVATAR.entrenadoCon} el avatar aprendió tu cara y tu voz: hoy está en ${AVATAR.parecido}% de parecido.`,
                bloques: [
                  { tipo: 'pasos', items: [
                    `Subís tus piezas: ${PIEZAS_ENTRENO} piezas tuyas (${REDES_ENTRENO}).`,
                    `El equipo aprende tu cara y tu voz: ${AVATAR.voz}.`,
                    'El avatar crea con eso: Nia escribe el guion y el avatar lo hace con tu cara y tu voz.',
                    `Vos aprobás y sale: el panel de 5 puntúa la pieza (mínimo ${MINIMO_PANEL}) y nada se publica sin tu OK.`,
                  ] },
                  { tipo: 'datos', filas: [
                    { k: 'Entrenado con', v: AVATAR.entrenadoCon },
                    { k: 'Parecido', v: `${AVATAR.parecido}%`, s: 'medido sobre las piezas que ya creó' },
                    { k: 'Lo que crea por vos', v: `${AVATAR.quePuede.length} cosas`, s: AVATAR.quePuede.map(q => q.t).join(' · ') },
                  ] },
                  { tipo: 'aviso', tono: 'green', texto: 'Para entrenarlo no hace falta grabar de nuevo: sirve lo que ya publicaste. Y si lo apagás, el entrenamiento no se borra.' },
                ],
                fuente: 'El entrenamiento del avatar: tus piezas, tu cara, tu voz y el parecido que ya alcanzó.',
              })}>
              Ver el entrenamiento
            </Button>
          )}
          <Button variant="ghost" className="btn-sm"
            title="Muestra el ciclo completo de una pieza, paso por paso, con quién lo hace en cada uno"
            onClick={() => detalle({
              titulo: 'El ciclo de una pieza, paso por paso',
              sub: 'Del guion que escribe Nia a la pieza que se publica en tus redes: tu avatar entra en el primer paso.',
              bloques: [
                { tipo: 'filas', items: CICLO_PASOS.map((c, i) => ({
                  t: `${i + 1}. ${c.nombre}`, s: `${c.quien}: ${c.que}`,
                  etiqueta: c.nombre === PASO_AVATAR.nombre ? 'acá entra tu avatar' : 'después',
                  tono: c.nombre === PASO_AVATAR.nombre ? 'purple' as const : 'muted' as const,
                })) },
                { tipo: 'datos', filas: [
                  { k: 'Estados de una pieza', v: CICLO_PIEZA.join(' → '), s: 'así se sigue una pieza de punta a punta' },
                  { k: 'Piezas del avatar este mes', v: `${piezasDelAvatar}`, s: `${creditosTotales.toLocaleString('es-AR')} créditos` },
                ] },
                { tipo: 'aviso', tono: 'green', texto: 'El avatar nunca publica: produce. Publicar es el paso de Kai y necesita tu OK.' },
              ],
              fuente: 'Ciclo de una pieza: producir, verificar, publicar y crecer.',
              acciones: [
                { label: 'Ver en Contenido', variante: 'primary', title: 'Va a Contenido: las piezas del avatar con su puntaje y su estado', onClick: () => setVista('campanas') },
                { label: 'Ver la publicación', title: 'Va a Publicación: qué sale, en qué red y en qué ventana', onClick: () => setVista('publicacion') },
              ],
            })}>
            Ver el ciclo completo
          </Button>
        </div>
        <div className="acc-why">
          Entrenar el avatar es <b>una sola vez</b>: se hace con el material que ya publicaste. Después, cuando
          no tengas tiempo de grabar, le pedís una pieza y la revisás vos.
        </div>
      </Card>
    </div>
  );
}
