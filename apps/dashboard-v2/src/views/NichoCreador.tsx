import { useState } from 'react';
import { Card, Badge, Button } from '../components/ui';
import { ViewHead, BarRow } from '../components/viz';
import {
  I_Globe, I_Eye, I_Trend, I_Film, I_Question, I_Clock, I_Credit, I_Check, I_Plus, I_ArrowRight,
  I_Refresh,
} from '../components/icons';
import { useDetalle } from '../components/Detalle';
import type { Vista } from '../components/Layout';
import {
  NICHO, FICHA_CREADOR, AGENTES_CREADOR, GRILLA_CREDITOS, PIEZAS_CREADOR, PLANES_CREADOR,
  PLAN_DEL_MES, TIPOS_CREADOR, TIPO_DE_LA_CUENTA, VISTAS_CREADOR,
} from '../data/creador';

// =============================================================================================
// NICHO, EN PIEL DE CREADOR — «qué trendea en tu tema, qué formato retiene y qué te piden».
//
// Es la entrada «mercado» del menú, con el idioma de un creador: acá no se espía a nadie ni se
// negocia nada. Se mira el NICHO PROPIO para decidir qué grabar esta semana, en qué no gastar
// créditos, qué le pide la audiencia y cuándo mira. Quien lo lee es Lux, el vigía del nicho: el
// mismo agente market-analyst del motor, calibrado a un creador desde su Ficha.
//
// MODELO NUEVO (corrección del dueño): el panel sirve para crear, verificar, publicar y hacer
// crecer la cuenta. Por eso acá NO hay marcas, ni pitches, ni deals, ni precios por pieza: lo que
// se mide en créditos es lo que CUESTA PRODUCIR, y lo que se muestra en porcentajes es el reparto
// del feed de tu tema.
//
// NADA ASUME UN RUBRO: la herramienta es la misma para todo tipo de creador de contenido. Lo que
// cambia entre uno y otro es qué publica, qué persigue y cada cuánto — eso sale del tipo de cuenta
// (TIPOS_CREADOR) y de la Ficha, nunca de una suposición de esta pantalla.
//
// Regla del panel, igual que en Hoy: cada botón abre el detalle con el dato real adentro o cambia
// algo que SE VE (un trend marcado «en el plan del lunes», una franja fijada para Kai). Nada de
// avisos que se van solos, y todo lo que se cambia se puede volver atrás.
// =============================================================================================

/** Los créditos que dice un texto de la data: `'75 créditos'` → 75. */
const creditosDe = (rango: string) => Number((/\d[\d.]*/.exec(rango)?.[0] ?? '0').replace(/\./g, ''));

/** Una variación que baja viene con el signo menos adelante: `'-9%'`. */
const esBaja = (variacion: string) => variacion.trim().startsWith('-');

/** Un nivel de producción, por cómo lo nombra la data. */
const nivelDe = (arranque: string) =>
  NICHO.precioProduccion.find(p => p.nivel.startsWith(arranque)) ?? NICHO.precioProduccion[0];

/** Las líneas reales de la grilla que se producen con esos créditos. */
const grillaDe = (creditos: number) => GRILLA_CREDITOS.filter(g => g.creditos === creditos).map(g => g.pieza);

/** Quién produce esas líneas: sale de la grilla, no se escribe a mano. */
const quienesDe = (creditos: number) =>
  [...new Set(GRILLA_CREDITOS.filter(g => g.creditos === creditos).map(g => g.quien))].join(' + ');

/** Lo que cuesta, en créditos, un tipo de pieza del plan del mes: `'1 crédito el remaster'` → 1. */
const creditosDePieza = (nombre: string) =>
  creditosDe(PIEZAS_CREADOR.find(p => p.nombre === nombre)?.creditos ?? '0');

export function ViewNichoCreador({ setToast, setVista }: { setToast: (t: string) => void; setVista: (v: Vista) => void }) {
  const detalle = useDetalle();

  // --- Lo que el creador decidió mirando su nicho: queda a la vista y se puede deshacer.
  /** Trends que Rex pone en el plan del lunes. */
  const [alPlan, setAlPlan] = useState<string[]>([]);
  /** Trends donde decidió no gastar créditos esta semana. */
  const [enPausa, setEnPausa] = useState<string[]>([]);
  /** Trends que bajaron en el nicho pero quiere seguir considerando. */
  const [reactivados, setReactivados] = useState<string[]>([]);
  /** Temas que la audiencia pide y que Nia convierte en pieza. */
  const [temasEnPlan, setTemasEnPlan] = useState<string[]>([]);
  /** La franja horaria que Kai respeta siempre, si el creador la fijó. */
  const [franjaFijada, setFranjaFijada] = useState<string | null>(null);

  const lux = AGENTES_CREADOR.find(a => a.id === 'lux')!;
  const rex = AGENTES_CREADOR.find(a => a.id === 'rex')!;
  const nia = AGENTES_CREADOR.find(a => a.id === 'nia')!;
  const kai = AGENTES_CREADOR.find(a => a.id === 'kai')!;
  const sol = AGENTES_CREADOR.find(a => a.id === 'sol')!;
  const rumi = AGENTES_CREADOR.find(a => a.id === 'rumi')!;
  /** El tipo de cuenta elegido: lo que se publica y se mide sale de acá, no de un rubro. */
  const tipo = TIPOS_CREADOR.find(t => t.key === TIPO_DE_LA_CUENTA.key) ?? TIPOS_CREADOR[0];

  // --- Los números: todos salen de la data del creador y de sus propias cuentas.
  const formatoTop = NICHO.formatosDelFeed[0];
  const formatoUltimo = NICHO.formatosDelFeed[NICHO.formatosDelFeed.length - 1];
  const dominanteEnFeed = NICHO.formatosDelFeed.find(f => f.f === FICHA_CREADOR.formatoDominante);
  const mejorVentana = NICHO.ventanas.find(v => v.usarla) ?? NICHO.ventanas[0];
  const masPedido = NICHO.temasQuePiden[0];
  const totalConsultas = NICHO.temasQuePiden.reduce((s, t) => s + t.consultas, 0);
  const nivelCaro = nivelDe('Lo más caro');
  const nivelRinde = nivelDe('Lo que más rendimiento');
  const nivelBarato = nivelDe('Lo más barato');
  const credCaro = creditosDe(nivelCaro.rango);
  const credRinde = creditosDe(nivelRinde.rango);
  const credBarato = creditosDe(nivelBarato.rango);
  /** Cuántas veces más caro es el premium que el formato que más rinde. */
  const vecesMasCaro = Math.round((credCaro / (credRinde || 1)) * 10) / 10;
  const plan = PLANES_CREADOR.find(p => p.key === 'creador') ?? PLANES_CREADOR[0];
  const piezasQueRinden = Math.floor(plan.creditosMes / (credRinde || 1));
  /** Lo que costaría la mezcla que propone Rex para la semana, en créditos. */
  const costoMezcla = PLAN_DEL_MES.mezcla.reduce((s, m) => s + creditosDePieza(m.tipo) * m.cuantas, 0);
  /** Lo que NO conviene grabar: lo que bajó en el nicho y lo que el creador pausó. */
  const noGastar = NICHO.trends.filter(t => enPausa.includes(t.t) || (esBaja(t.num) && !reactivados.includes(t.t)));
  /** Lo que sí conviene grabar esta semana. */
  const grabar = NICHO.trends.filter(t => !noGastar.includes(t));

  // -------------------------------------------------------------------------------------------
  // LO QUE CADA BOTÓN CAMBIA: todo deja marca en la pantalla.
  // -------------------------------------------------------------------------------------------
  const ponerEnElPlan = (trend: string) => {
    setAlPlan(p => (p.includes(trend) ? p : [...p, trend]));
    setEnPausa(p => p.filter(x => x !== trend));
    setReactivados(p => p.filter(x => x !== trend));
    setToast(`Rex lo pone en el plan del lunes: ${trend}`);
  };
  const sacarDelPlan = (trend: string) => {
    setAlPlan(p => p.filter(x => x !== trend));
    setToast(`Sale del plan del lunes y Lux lo sigue vigilando: ${trend}`);
  };
  const pausarTrend = (trend: string) => {
    setEnPausa(p => (p.includes(trend) ? p : [...p, trend]));
    setAlPlan(p => p.filter(x => x !== trend));
    setToast(`No se gastan créditos en «${trend}» esta semana`);
  };
  const volverAConsiderarlo = (trend: string) => {
    setEnPausa(p => p.filter(x => x !== trend));
    setAlPlan(p => p.filter(x => x !== trend));
    setReactivados(p => (p.includes(trend) ? p : [...p, trend]));
    setToast(`Vuelve a la lista de lo que se puede grabar: ${trend}`);
  };
  const armarPieza = (tema: string) => {
    setTemasEnPlan(p => (p.includes(tema) ? p : [...p, tema]));
    setToast(`Nia arma una pieza de «${tema}»: entra en el plan del lunes`);
  };
  const soltarTema = (tema: string) => {
    setTemasEnPlan(p => p.filter(x => x !== tema));
    setToast(`«${tema}» sale del plan: vuelve a la lista de lo que te piden`);
  };
  const alternarFranja = (franja: string) => {
    const suelta = franjaFijada === franja;
    setFranjaFijada(suelta ? null : franja);
    setToast(suelta
      ? `Kai vuelve a elegir la franja por su cuenta: hoy la mejor es de ${mejorVentana.franja}`
      : `Kai publica siempre de ${franja}: queda fijado y se puede volver atrás`);
  };

  // -------------------------------------------------------------------------------------------
  // LOS BOTONES QUE INFORMAN: abren el panel de detalle con el dato real adentro.
  // -------------------------------------------------------------------------------------------

  /** El detalle de un trend: la variación, la lectura y los créditos en juego. */
  const verTrend = (t: (typeof NICHO.trends)[number]) => {
    const baja = esBaja(t.num);
    const enPlan = alPlan.includes(t.t);
    detalle({
      titulo: `${t.t} · ${t.num} en tu nicho`,
      sub: t.lectura,
      bloques: [
        { tipo: 'datos', filas: [
          { k: 'Variación de la semana', v: t.num, tono: baja ? 'amber' : 'green', s: 'en tu nicho, contra la semana anterior: no es tu desempeño' },
          { k: 'Qué conviene hacer', v: baja ? 'No gastar créditos' : 'Grabar una pieza', s: baja ? 'El formato bajó: el equipo deja de proponerlo.' : 'Es de los que suben: Rex lo pone primero en la propuesta del lunes.' },
          { k: 'Lo que cuesta grabar eso', v: `${credRinde} créditos`, s: `${nivelRinde.nivel}: ${grillaDe(credRinde).join(' · ')}` },
          { k: 'Lo que no conviene gastar', v: `${credCaro} créditos`, s: `${nivelCaro.nivel}: es para la pieza principal de la semana, no para probar un formato que baja` },
          { k: 'Quién lo mira', v: lux.nombre, s: lux.enCreadores },
          { k: 'Quién lo pone en el plan', v: rex.nombre, s: rex.enCreadores },
          { k: 'Quién lo produce', v: nia.nombre, s: nia.enCreadores },
        ] },
        { tipo: 'aviso', tono: baja ? 'amber' : 'green', texto: baja
          ? `El formato bajó ${t.num} en tu nicho. Cada pieza del formato que rinde cuesta ${credRinde} créditos y el premium ${credCaro}: gastarlos donde el feed baja es la forma más rápida de quedarse sin créditos para la que sí sube.`
          : `${grabar.length} de los ${NICHO.trends.length} trends de tu nicho se pueden grabar esta semana. Este entra en el plan del lunes y el panel de 5 lo puntúa antes de que salga a tus redes.` },
      ],
      fuente: 'Lux vigila tu nicho cada 15 minutos. La variación es del nicho y los créditos salen de tu grilla de producción.',
      acciones: [
        noGastar.includes(t)
          ? { label: 'Volver a considerarlo', variante: 'primary', title: `Vuelve a considerar «${t.t}»: sale de la lista de lo que no se graba, no se gasta nada y Lux lo sigue vigilando para ver si repunta.`, onClick: () => volverAConsiderarlo(t.t) }
          : enPlan
            ? { label: 'Sacarlo del plan', title: `Saca «${t.t}» del plan del lunes: Rex reprograma la semana sin esa pieza y Lux lo sigue vigilando. Se puede volver a poner.`, onClick: () => sacarDelPlan(t.t) }
            : { label: 'Que Rex lo ponga el lunes', variante: 'primary', title: `Rex suma «${t.t}» al plan del lunes, con su guion y su hook. Reversible desde la misma fila.`, onClick: () => ponerEnElPlan(t.t) },
        ...(!noGastar.includes(t)
          ? [{ label: 'No gastar créditos acá', title: `Deja «${t.t}» fuera de la semana: el equipo deja de proponerlo y no se gasta ahí. Reversible con «Volver a considerarlo».`, onClick: () => pausarTrend(t.t) }]
          : []),
        { label: 'Ver mis créditos', title: 'Abre Créditos: el saldo, la grilla de producción y los días de autonomía.', onClick: () => setVista('creditos') },
      ],
    });
  };

  /** Qué conviene grabar esta semana, con el plan que arma Rex y lo que costaría. */
  const verSemana = () => detalle({
    titulo: 'Qué conviene grabar esta semana',
    sub: `Lux leyó ${NICHO.trends.length} trends de tu nicho: ${grabar.length} se pueden grabar y ${noGastar.length} no conviene.`,
    bloques: [
      { tipo: 'filas', items: NICHO.trends.map(t => ({
        t: `${t.t} · ${t.num}`,
        s: t.lectura,
        etiqueta: noGastar.includes(t) ? 'no gastar créditos' : alPlan.includes(t.t) ? 'en el plan del lunes' : 'para grabar',
        tono: (noGastar.includes(t) ? 'amber' : alPlan.includes(t.t) ? 'green' : 'purple') as 'amber' | 'green' | 'purple',
      })) },
      { tipo: 'datos', filas: [
        { k: 'Piezas que sostiene Rex', v: `${PLAN_DEL_MES.piezasPorSemana} por semana`, s: `Hoy vas por ${FICHA_CREADOR.ritmoActual.toLowerCase()}; la meta es ${FICHA_CREADOR.ritmoObjetivo.toLowerCase()}.` },
        { k: 'La mezcla del mes', v: PLAN_DEL_MES.mezcla.map(m => `${m.cuantas} ${m.tipo}`).join(' · '), s: PLAN_DEL_MES.objetivo },
        { k: 'Lo que costaría la semana', v: `${costoMezcla} créditos`, s: `${nivelRinde.nivel} para las piezas fuertes y ${nivelBarato.nivel} para sostener el ritmo` },
      ] },
      { tipo: 'aviso', texto: 'El gasto se decide por lo que rinde, no por lo que cuesta menos: una pieza del formato que sube mueve más la cuenta que tres baratas en un formato que baja.' },
    ],
    fuente: 'La vigilancia del nicho de Lux, tu grilla de producción y el plan del mes de Rex.',
    acciones: [
      { label: 'Que Rex arme la semana', variante: 'primary', title: `Suma los ${grabar.length} trends que conviene grabar al plan del lunes. Se puede sacar uno por uno desde su fila.`, onClick: () => { grabar.forEach(t => ponerEnElPlan(t.t)); setToast(`Rex arma la semana con ${grabar.length} trends que conviene grabar`); } },
      { label: 'Ver mis créditos', title: 'Abre Créditos: el saldo, la grilla y los días de autonomía.', onClick: () => setVista('creditos') },
    ],
  });

  /** El formato que copa el feed, contra el formato que declara la Ficha. */
  const verFormato = () => detalle({
    titulo: `El formato que copa el feed: ${formatoTop.f}`,
    sub: `${formatoTop.pct}% de las piezas que se publican en tu nicho usan este formato. Tu Ficha declara «${FICHA_CREADOR.formatoDominante}».`,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Del feed de tu nicho', v: `${formatoTop.pct}%`, tono: 'green', s: `contra el ${formatoUltimo.pct}% del último («${formatoUltimo.f}»)` },
        { k: 'Tu formato dominante', v: FICHA_CREADOR.formatoDominante, s: dominanteEnFeed ? `es el mismo que gana el feed: ${dominanteEnFeed.pct}% de las piezas` : 'no aparece en el reparto del feed: conviene grabar el que gana' },
        { k: 'Tu tema declarado', v: FICHA_CREADOR.nicho, s: 'sale de tu Ficha: sobre eso se leen los trends y los formatos' },
        { k: 'Cómo lo grabás', v: FICHA_CREADOR.equipamiento, s: FICHA_CREADOR.tiempoSemana },
        { k: 'Qué cuesta producir', v: `${credRinde} créditos`, s: `${nivelRinde.rango} · ${nivelRinde.nota}` },
        { k: 'Quién lo produce', v: nia.nombre, s: nia.enCreadores },
        { k: 'Quién mide si retiene', v: sol.nombre, s: sol.enCreadores },
      ] },
      { tipo: 'aviso', tono: 'green', texto: 'Es el reparto real del feed, no una recomendación: donde está tu formato, ahí está tu audiencia. Verificar cada pieza no cuesta créditos y no se puede saltear.' },
    ],
    fuente: 'Reparto de formatos del feed de tu nicho, leído por Lux cada 15 minutos. El formato dominante sale de tu Ficha de creador.',
    acciones: [
      alPlan.includes(formatoTop.f)
        ? { label: 'Sacarlo del plan', title: `Saca «${formatoTop.f}» del plan del lunes: Rex reprograma la semana. Se puede volver a poner.`, onClick: () => sacarDelPlan(formatoTop.f) }
        : { label: 'Que Rex lo ponga el lunes', variante: 'primary', title: `Rex suma «${formatoTop.f}» al plan del lunes: es el formato que gana el reparto del feed. Reversible.`, onClick: () => ponerEnElPlan(formatoTop.f) },
      { label: 'Ver mi Ficha', title: 'Abre Cuenta y autonomía, donde está tu Ficha de creador con tu tema, tu formato y tu equipamiento.', onClick: () => setVista('cuenta') },
    ],
  });

  /** Un tema que la audiencia pide, con lo que cuesta convertirlo en pieza. */
  const verTema = (tema: (typeof NICHO.temasQuePiden)[number]) => {
    const enPlan = temasEnPlan.includes(tema.t);
    detalle({
      titulo: `«${tema.t}» · ${tema.consultas} veces te lo pidieron`,
      sub: tema.lectura,
      bloques: [
        { tipo: 'datos', filas: [
          { k: 'Veces que te lo preguntaron', v: String(tema.consultas), tono: 'amber', s: `de ${totalConsultas} consultas contadas en tus comentarios y mensajes` },
          { k: 'En qué formato sale', v: FICHA_CREADOR.formatoDominante, s: 'el que más retiene en tu nicho: es el mismo que copa el feed' },
          { k: 'Qué cuesta producirla', v: `${credRinde} créditos`, s: `${nivelRinde.nivel}: ${grillaDe(credRinde).join(' · ')}` },
          { k: 'Quién la escribe', v: nia.nombre, s: nia.enCreadores },
          { k: 'Quién escuchó la pregunta', v: rumi.nombre, s: rumi.enCreadores },
          { k: 'Dónde se verifica', v: 'El panel de 5', s: 'arriba de 80 sale; abajo vuelve con la objeción y corregirla no te cuesta créditos' },
        ] },
        { tipo: 'aviso', tono: 'green', texto: 'La pieza la escribe Nia con el guion y la produce tu avatar: no hace falta que grabes de nuevo. Nada sale a tus redes sin pasar el panel y sin tu OK.' },
      ],
      fuente: 'Los temas salen de los comentarios y mensajes que cuenta Rumi; los créditos, de tu grilla de producción.',
      acciones: [
        enPlan
          ? { label: 'Volver a considerarlo', title: `Saca «${tema.t}» del plan del lunes: vuelve a la lista de lo que te piden y Nia no la escribe.`, onClick: () => soltarTema(tema.t) }
          : { label: 'Que Nia arme una pieza', variante: 'primary', title: `Nia escribe la pieza de «${tema.t}» y entra en el plan del lunes. Reversible con «Volver a considerarlo».`, onClick: () => armarPieza(tema.t) },
        { label: 'Ver los comentarios', title: 'Abre Comunidad: los comentarios y mensajes de tu audiencia, con la respuesta que propone Rumi.', onClick: () => setVista('conversaciones') },
      ],
    });
  };

  /** Una franja horaria, con su rendimiento y quién publica ahí. */
  const verVentana = (v: (typeof NICHO.ventanas)[number]) => {
    const fijada = franjaFijada === v.franja;
    detalle({
      titulo: `Quién mira de ${v.franja}`,
      sub: v.rendimiento,
      bloques: [
        { tipo: 'datos', filas: [
          { k: 'Rendimiento', v: v.usarla ? 'La mejor de tu audiencia' : 'Por debajo de la mejor', tono: v.usarla ? 'green' : 'amber', s: v.rendimiento },
          { k: 'Lo que dice tu Ficha', v: v.usarla ? 'Es la franja que tenés declarada' : 'No es la que tenés declarada', s: `${FICHA_CREADOR.mejorVentana}. ${FICHA_CREADOR.peorVentana}.` },
          { k: 'Quién publica', v: kai.nombre, s: kai.enCreadores },
          { k: 'Cuánto publica', v: `${PLAN_DEL_MES.piezasPorSemana} piezas por semana`, s: `Hoy vas por ${FICHA_CREADOR.ritmoActual.toLowerCase()}; la meta es ${FICHA_CREADOR.ritmoObjetivo.toLowerCase()}.` },
          { k: 'Qué cuesta cada pieza', v: `${credRinde} créditos`, s: `${nivelRinde.nivel}: ${grillaDe(credRinde).join(' · ')}` },
          { k: 'Quién mide el resultado', v: sol.nombre, s: sol.enCreadores },
        ] },
        { tipo: 'aviso', tono: v.usarla ? 'green' : 'amber', texto: v.usarla
          ? 'Es la franja que más rinde: fijarla hace que Kai publique siempre acá, incluso cuando el calendario se llena.'
          : 'Publicar acá no rompe nada, pero rinde menos: conviene dejarla para historias cortas y no para la pieza fuerte de la semana.' },
      ],
      fuente: 'Las franjas salen de cuándo mira tu audiencia, medido por Sol en tus últimas publicaciones.',
      acciones: [
        fijada
          ? { label: 'Volver a la automática', title: `Kai deja de publicar siempre de ${v.franja} y vuelve a elegir la franja por su cuenta, según el día y la pieza.`, onClick: () => alternarFranja(v.franja) }
          : { label: 'Que Kai publique siempre en esta franja', variante: 'primary', title: `Fija ${v.franja} para todo lo que se publique: Kai la respeta incluso si el calendario se llena. Reversible con «Volver a la automática».`, onClick: () => alternarFranja(v.franja) },
        { label: 'Ver el contenido del mes', title: 'Abre Contenido: las piezas del mes con su puntaje del panel y su estado.', onClick: () => setVista('campanas') },
      ],
    });
  };

  /** Un nivel de producción: qué se produce con esos créditos y qué rinde. */
  const verProduccion = (n: (typeof NICHO.precioProduccion)[number]) => {
    const creditos = creditosDe(n.rango);
    const esRinde = n.nivel === nivelRinde.nivel;
    detalle({
      titulo: `${n.nivel}: ${n.rango}`,
      sub: n.nota,
      bloques: [
        { tipo: 'datos', filas: [
          { k: 'Créditos por pieza', v: `${creditos} ${creditos === 1 ? 'crédito' : 'créditos'}`, tono: esRinde ? 'green' : 'muted', s: 'de tu grilla de producción' },
          { k: 'Qué se produce con eso', v: grillaDe(creditos).join(' · '), s: `lo produce ${quienesDe(creditos)}` },
          { k: 'Relación con lo que rinde', v: `${(Math.round((creditos / (credRinde || 1)) * 10) / 10).toLocaleString('es-AR')}× el que rinde`, s: esRinde ? 'es la referencia de la semana: la pieza que más retiene' : `${nivelRinde.nivel}, que sale con ${credRinde} créditos` },
          { k: 'Cuántas entran por mes', v: `${Math.floor(plan.creditosMes / (creditos || 1))} piezas`, s: `con los ${plan.creditosMes.toLocaleString('es-AR')} créditos del plan ${plan.nombre}` },
        ] },
        { tipo: 'aviso', tono: 'amber', texto: 'La pieza que el panel frena no te cuesta créditos: la regeneración la paga el sistema. Lo que sí se gasta es el formato que no rinde.' },
      ],
      fuente: 'Tu grilla de producción y el plan del mes. El costo por pieza no cambia con el tema ni con el tipo de creador.',
      acciones: [
        { label: 'Ver mis créditos', title: 'Abre Créditos: el saldo, la grilla completa y los días de autonomía.', onClick: () => setVista('creditos') },
      ],
    });
  };

  /** La grilla completa, con los tres niveles y su relación con lo que rinde. */
  const verGrilla = () => detalle({
    titulo: 'Lo que cuesta producir cada pieza',
    sub: `Tres niveles en créditos: el premium (${credCaro}), el que más rinde (${credRinde}) y el más barato (${credBarato}). Ninguno depende del tema del creador.`,
    bloques: [
      { tipo: 'filas', items: GRILLA_CREDITOS.map(g => ({
        t: g.pieza,
        s: `lo produce ${g.quien}`,
        etiqueta: `${g.creditos} ${g.creditos === 1 ? 'crédito' : 'créditos'}`,
        tono: (g.creditos === credRinde ? 'green' : g.creditos === credCaro ? 'amber' : 'muted') as 'green' | 'amber' | 'muted',
      })) },
      { tipo: 'datos', filas: [
        { k: 'El premium cuesta', v: `${vecesMasCaro.toLocaleString('es-AR')}× el que más rinde`, s: `${credCaro} créditos contra ${credRinde}: da para una sola pieza principal por semana` },
        { k: 'El que más rinde', v: `${credRinde} créditos`, s: nivelRinde.nota },
        { k: 'El más barato', v: `${credBarato} ${credBarato === 1 ? 'crédito' : 'créditos'}`, s: nivelBarato.nota },
        { k: 'Cuántas entran por mes', v: `${piezasQueRinden} del que rinde`, s: `o ${Math.floor(plan.creditosMes / (credCaro || 1))} del premium, con los ${plan.creditosMes.toLocaleString('es-AR')} créditos del plan ${plan.nombre}` },
      ] },
      { tipo: 'aviso', texto: 'Verificar una pieza no cuesta créditos y no se puede saltear: el panel de 5 la puntúa antes de publicarse, y lo que frena no se te cobra.' },
    ],
    fuente: 'Tu grilla de producción, el plan del mes y el reparto del feed: los tres números salen de la data del creador.',
    acciones: [
      { label: 'Ver mis créditos', title: 'Abre Créditos: el saldo, la grilla y los días de autonomía.', onClick: () => setVista('creditos') },
    ],
  });

  /** El tipo de cuenta: es lo que cambia entre creadores, no el motor. */
  const verTipo = () => detalle({
    titulo: `Tu tipo de cuenta: ${tipo.icono} ${tipo.nombre}`,
    sub: TIPO_DE_LA_CUENTA.nota,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Para quién es', v: tipo.nombre, s: tipo.quien },
        { k: 'Qué publicás', v: tipo.publica, s: 'es lo que el equipo prioriza cada semana' },
        { k: 'Qué se persigue', v: tipo.persigue, s: 'lo miran Rex al planificar y Sol al medir' },
        { k: 'Cuánto publicás', v: tipo.ritmo, s: 'el equipo sostiene ese ritmo con tu avatar y tus piezas' },
      ] },
      { tipo: 'filas', items: TIPOS_CREADOR.map(t => ({
        t: `${t.icono} ${t.nombre}`,
        s: t.persigue,
        etiqueta: t.key === tipo.key ? 'el tuyo' : t.ritmo,
        tono: (t.key === tipo.key ? 'green' : 'muted') as 'green' | 'muted',
      })) },
      { tipo: 'aviso', texto: 'La herramienta es la misma para todos los tipos de creador: cambia lo que publicás y lo que se mide, nunca el motor. Nada en este panel asume de qué hablás.' },
    ],
    fuente: 'Los tipos de creador de la data: el elegido, con lo que publica, lo que persigue y su ritmo.',
    acciones: [
      { label: 'Ver mi Ficha', title: 'Abre Cuenta y autonomía, donde está tu Ficha de creador.', onClick: () => setVista('cuenta') },
    ],
  });

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Globe size={19} />}
        titulo={VISTAS_CREADOR.mercado.nombre}
        sub={`${VISTAS_CREADOR.mercado.sub}. Tu tema declarado es ${FICHA_CREADOR.nicho}: lo mira Lux cada 15 minutos y lo trabaja Rex el lunes, según tu tipo de cuenta.`}
        nums={[
          { v: String(NICHO.trends.length), l: 'trends detectados en tu nicho', c: 'var(--purple3)' },
          { v: `${formatoTop.pct}%`, l: `del feed de tu nicho es «${formatoTop.f}»`, c: 'var(--green)' },
          { v: mejorVentana.franja, l: 'la franja que más rinde en tu audiencia', c: 'var(--purple3)' },
          { v: String(masPedido.consultas), l: `veces te pidieron «${masPedido.t}»`, c: 'var(--amber)' },
        ]}
      />

      {/* QUÉ TIPO DE CREADOR SOS: lo que cambia entre creadores no es el motor, es lo que se publica. */}
      <div className="onb-infiere" style={{ marginTop: 16 }}>
        <span className="onb-infiere-ic">{tipo.icono}</span>
        <span>
          <b>{tipo.nombre}. </b>
          {tipo.quien} Publicás {tipo.publica.toLowerCase()} y el equipo persigue {tipo.persigue.toLowerCase()}: {tipo.ritmo.toLowerCase()}.
        </span>
        <Button variant="ghost" className="btn-sm"
          title="Muestra tu tipo de cuenta y los otros tipos: es lo que define qué se publica y qué se mide, nunca el tema del que hablás."
          onClick={verTipo}>Ver mi tipo de cuenta</Button>
      </div>

      {/* ================= 1 · LO QUE VIGILA LUX Y EL REPARTO DEL FEED ================= */}
      <div className="csec">
        <span className="csec-n">1</span>
        <span className="csec-t">Lo que vigila Lux en tu nicho</span>
        <span className="csec-c purple">{NICHO.trends.length} trends</span>
        <span className="csec-s">{grabar.length} se pueden grabar esta semana · {noGastar.length} donde no conviene gastar créditos</span>
      </div>
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Eye size={14} style={{ color: lux.color }} /> Lo que vigila Lux</span>}
          action={<Badge tone="purple">{NICHO.trends.length} trends · cada 15 min</Badge>}
        >
          <div className="como-se-lee">
            <b>Cómo se lee:</b> el número de cada trend es la variación de la semana contra la anterior
            en tu nicho, <b>no tu desempeño</b>. Abajo de cada uno está la lectura de negocio: qué
            conviene grabar esta semana y en qué no conviene gastar créditos.
          </div>
          <div className="grow-list">
            {NICHO.trends.map(t => {
              const baja = esBaja(t.num);
              const enPlan = alPlan.includes(t.t);
              const pausado = noGastar.includes(t);
              return (
                <div key={t.t} className="guard"
                  style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8, paddingTop: 12, paddingBottom: 12, opacity: pausado ? .55 : 1 }}>
                  <span className="row" style={{ gap: 8, width: '100%', flexWrap: 'wrap' }}>
                    <I_Trend size={14} style={{ color: baja ? 'var(--amber)' : 'var(--green)', flexShrink: 0 }} />
                    <span className="bt">{t.t}</span>
                    <Badge tone={baja ? 'amber' : 'green'}>{t.num}</Badge>
                    {enPlan && <Badge tone="green">en el plan del lunes</Badge>}
                    {pausado && <Badge tone="amber">no se gastan créditos acá</Badge>}
                  </span>
                  <span className="guard-lb" style={{ minWidth: 0 }}>
                    {baja ? 'Qué hacer con esto' : 'Qué dice el vigía'}
                    <small>{t.lectura}</small>
                  </span>
                  <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <Button className="btn-sm"
                      title={`Abre la lectura completa de «${t.t}» (${t.num}): qué conviene hacer, qué cuesta en créditos y qué hace cada agente con eso.`}
                      onClick={() => verTrend(t)}>
                      Ver qué hacer <I_ArrowRight size={13} />
                    </Button>
                    {pausado && (
                      <Button variant="outline" className="btn-sm"
                        title={`Vuelve a considerar «${t.t}»: sale de la lista de lo que no se graba, no se gasta nada y Lux lo sigue vigilando.`}
                        onClick={() => volverAConsiderarlo(t.t)}>
                        <I_Refresh size={12} /> Volver a considerarlo
                      </Button>
                    )}
                    {enPlan && !pausado && (
                      <Button variant="outline" className="btn-sm"
                        title={`Saca «${t.t}» del plan del lunes: Rex reprograma la semana sin esa pieza. Se puede volver a poner.`}
                        onClick={() => sacarDelPlan(t.t)}>
                        <I_Check size={12} /> Ya está en el plan — sacarlo
                      </Button>
                    )}
                    {!pausado && !enPlan && (
                      <Button variant="ghost" className="btn-sm"
                        title={`Rex lo pone en el plan del lunes: es uno de los formatos que conviene grabar esta semana. Reversible desde la misma fila.`}
                        onClick={() => ponerEnElPlan(t.t)}>
                        <I_Plus size={12} /> Que Rex lo ponga el lunes
                      </Button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="datos-row" style={{ paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato" title="Los trends que suben en tu nicho más los que decidiste seguir considerando.">
              <span className="dato-l">Conviene grabar</span>
              <span className="dato-v" style={{ color: 'var(--green)' }}>{grabar.length} de {NICHO.trends.length}</span>
            </div>
            <div className="dato" title="Los trends que mandaste al plan de contenido del lunes: los trabaja Rex.">
              <span className="dato-l">En el plan del lunes</span>
              <span className="dato-v">{alPlan.length}</span>
            </div>
            <div className="dato" title={`Lo que cuesta cada pieza del formato que más rinde: ${nivelRinde.rango}.`}>
              <span className="dato-l">Cada pieza que rinde</span>
              <span className="dato-v" style={{ color: 'var(--purple3)' }}>{credRinde} créditos</span>
            </div>
            <div className="dato" title="Los formatos que bajaron en el nicho o que pausaste: ahí no se gastan créditos esta semana.">
              <span className="dato-l">No se gastan créditos en</span>
              <span className="dato-v" style={{ color: 'var(--amber)' }}>{noGastar.length} formato{noGastar.length === 1 ? '' : 's'}</span>
            </div>
          </div>
          <div className="acc-why">
            Grabá {grabar.length} de los {NICHO.trends.length} trends —{grabar.map(t => ` «${t.t}»`).join(', ')}— y no gastes
            créditos en {noGastar.map(t => `«${t.t}»`).join(', ')}: cada pieza del formato que más rinde cuesta
            <b> {credRinde} créditos</b> y el premium {credCaro}, así que el equipo los pone donde el formato sube.
            Lo que decidas acá lo arma Rex el lunes.
          </div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button className="btn-sm"
              title="Abre qué conviene grabar esta semana: los trends que suben, la mezcla que propone Rex y lo que costaría la semana en créditos."
              onClick={verSemana}>
              Ver la semana completa <I_ArrowRight size={13} />
            </Button>
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Film size={14} style={{ color: 'var(--green)' }} /> Los formatos que copan el feed</span>}
          action={<Badge tone="green">{formatoTop.pct}% el que gana</Badge>}
        >
          <div className="como-se-lee">
            <b>Cómo se lee:</b> de cada 100 piezas que se publican en tu nicho, cuántas usan ese formato.
            Es el reparto real del feed, no una recomendación: donde está tu formato, ahí está tu audiencia.
          </div>
          <div className="grow-list">
            {NICHO.formatosDelFeed.map(f => {
              const gana = f.f === formatoTop.f;
              const esDominante = f.f === FICHA_CREADOR.formatoDominante;
              return (
                <div key={f.f} style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="row spread" style={{ gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span className="bt">{f.f}</span>
                    <span className="row" style={{ gap: 8 }}>
                      {gana && <Badge tone="green">el que gana</Badge>}
                      {esDominante && <Badge tone="purple">tu formato</Badge>}
                      <span className="tiny" style={{ fontWeight: 800 }}>{f.pct}%</span>
                    </span>
                  </div>
                  <BarRow valor={f.pct} max={100} color={gana ? 'var(--purple2)' : 'var(--border2)'} formato={`${f.pct}%`} />
                </div>
              );
            })}
          </div>
          <div className="bs">
            Tu Ficha declara <b>{FICHA_CREADOR.formatoDominante}</b>{dominanteEnFeed
              ? `: es el mismo formato que copa el feed, con ${dominanteEnFeed.pct}% de las piezas.`
              : `, que no aparece en el reparto del feed: el que gana es «${formatoTop.f}» con ${formatoTop.pct}%.`}
            {' '}Tu equipamiento alcanza para sostenerlo: {FICHA_CREADOR.equipamiento}, {FICHA_CREADOR.tiempoSemana.toLowerCase()}.
          </div>
          <div className="acc-why">
            El último del reparto («{formatoUltimo.f}», {formatoUltimo.pct}%) es el que menos mira la gente del nicho:
            grabar ahí cuesta los mismos créditos que grabar el que gana. La comparación con tu Ficha se ve en el detalle.
          </div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button className="btn-sm"
              title={`Abre el formato que gana («${formatoTop.f}», ${formatoTop.pct}% del feed): cómo se compara con tu Ficha, qué cuesta producirlo y quién lo produce.`}
              onClick={verFormato}>
              <I_Film size={13} /> Ver cómo se graba el que gana
            </Button>
          </div>
        </Card>
      </div>

      {/* ================= 2 · LO QUE PIDE LA AUDIENCIA Y CUÁNDO MIRA ================= */}
      <div className="csec">
        <span className="csec-n">2</span>
        <span className="csec-t">Lo que te pide tu gente y cuándo mira</span>
        <span className="csec-c amber">{totalConsultas} consultas</span>
        <span className="csec-s">{NICHO.temasQuePiden.length} temas que te preguntan · la mejor franja es de {mejorVentana.franja}</span>
      </div>
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Question size={14} style={{ color: 'var(--amber)' }} /> Lo que tu gente te pide</span>}
          action={<Badge tone={temasEnPlan.length ? 'green' : 'amber'}>{temasEnPlan.length ? `${temasEnPlan.length} en el plan del lunes` : `${NICHO.temasQuePiden.length} temas`}</Badge>}
        >
          <div className="bs">
            Lo que más te preguntan en los comentarios y los mensajes, contado por Rumi. Cada tema se puede
            convertir en una pieza: Nia la escribe, tu avatar la produce y entra en el plan del lunes.
          </div>
          <div className="grow-list">
            {NICHO.temasQuePiden.map(tema => {
              const enPlan = temasEnPlan.includes(tema.t);
              return (
                <div key={tema.t} className="guard"
                  style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8, paddingTop: 12, paddingBottom: 12 }}>
                  <span className="row" style={{ gap: 8, width: '100%', flexWrap: 'wrap' }}>
                    <span className="bt">{tema.t}</span>
                    <Badge tone="amber">{tema.consultas} veces</Badge>
                    {enPlan && <Badge tone="green">en el plan del lunes</Badge>}
                  </span>
                  <span className="guard-lb" style={{ minWidth: 0 }}>
                    Lo que te piden
                    <small>{tema.lectura}</small>
                  </span>
                  <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    {enPlan ? (
                      <Button variant="outline" className="btn-sm"
                        title={`Saca «${tema.t}» del plan del lunes: Nia no la escribe y el tema vuelve a la lista de lo que te piden. Reversible.`}
                        onClick={() => soltarTema(tema.t)}>
                        <I_Refresh size={12} /> Volver a considerarlo
                      </Button>
                    ) : (
                      <Button className="btn-sm"
                        title={`Nia arma una pieza con «${tema.t}» y la deja en el plan del lunes. Se puede volver atrás con «Volver a considerarlo».`}
                        onClick={() => armarPieza(tema.t)}>
                        <I_Plus size={12} /> Que Nia arme una pieza
                      </Button>
                    )}
                    <Button variant="ghost" className="btn-sm"
                      title={`Abre el tema «${tema.t}»: cuántas veces te lo pidieron, qué formato conviene y qué cuesta producir la pieza en créditos.`}
                      onClick={() => verTema(tema)}>
                      Ver las preguntas <I_ArrowRight size={13} />
                    </Button>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="datos-row" style={{ paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato" title="La suma de las veces que te preguntaron los temas de la lista, contadas por Rumi.">
              <span className="dato-l">Consultas contadas</span>
              <span className="dato-v">{totalConsultas}</span>
            </div>
            <div className="dato" title="Los temas que más se repiten en tus comentarios y mensajes.">
              <span className="dato-l">Temas que te piden</span>
              <span className="dato-v">{NICHO.temasQuePiden.length}</span>
            </div>
            <div className="dato" title="Los temas que Nia ya está convirtiendo en pieza para el plan del lunes.">
              <span className="dato-l">En el plan del lunes</span>
              <span className="dato-v" style={{ color: 'var(--green)' }}>{temasEnPlan.length}</span>
            </div>
          </div>
          <div className="acc-why">
            El más pedido es «{masPedido.t}» con {masPedido.consultas} consultas: {masPedido.lectura.toLowerCase()}
            {' '}Una pieza de tu formato dominante cuesta <b>{credRinde} créditos</b>, así que contestar con contenido
            sale mucho menos que contestar lo mismo cien veces.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Clock size={14} style={{ color: 'var(--purple3)' }} /> Cuándo publica tu audiencia</span>}
          action={franjaFijada
            ? <Badge tone="purple">Kai publica de {franjaFijada}</Badge>
            : <Badge tone="green">{mejorVentana.franja} la mejor</Badge>}
        >
          <div className="como-se-lee">
            <b>Cómo se lee:</b> el rendimiento de cada franja sale de cuándo mira tu audiencia, medido por Sol
            en tus últimas publicaciones. Más rendimiento es más gente mirando el primer minuto.
          </div>
          <div className="grow-list">
            {NICHO.ventanas.map(v => {
              const esMejor = v.usarla;
              const fijada = franjaFijada === v.franja;
              return (
                <div key={v.franja} className="guard"
                  style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8, paddingTop: 12, paddingBottom: 12, opacity: esMejor || fijada ? 1 : .75 }}>
                  <span className="row" style={{ gap: 8, width: '100%', flexWrap: 'wrap' }}>
                    <I_Clock size={14} style={{ color: esMejor ? 'var(--green)' : 'var(--purple3)', flexShrink: 0 }} />
                    <span className="bt">{v.franja}</span>
                    {esMejor && <Badge tone="green">la mejor</Badge>}
                    {fijada && <Badge tone="purple">fijada para Kai</Badge>}
                  </span>
                  <span className="guard-lb" style={{ minWidth: 0 }}>
                    {esMejor ? 'La franja que más rinde' : 'Cómo rinde'}
                    <small>{v.rendimiento}</small>
                  </span>
                  <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <Button variant={fijada ? 'outline' : esMejor ? 'primary' : 'ghost'} className="btn-sm"
                      title={fijada
                        ? `Kai deja de publicar siempre de ${v.franja} y vuelve a elegir la franja por su cuenta según el día y la pieza.`
                        : `Fija ${v.franja} para todo lo que se publique: Kai la respeta aunque el calendario se llene. Reversible con «Volver a la automática».`}
                      onClick={() => alternarFranja(v.franja)}>
                      {fijada ? <><I_Refresh size={12} /> Volver a la automática</> : 'Que Kai publique siempre en esta franja'}
                    </Button>
                    <Button variant="ghost" className="btn-sm"
                      title={`Abre la franja de ${v.franja}: su rendimiento, lo que dice tu Ficha y quién publica ahí.`}
                      onClick={() => verVentana(v)}>
                      Ver qué mirar ahí
                    </Button>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="datos-row" style={{ paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato" title="La franja que más rinde en tu audiencia, medida por Sol.">
              <span className="dato-l">La mejor franja</span>
              <span className="dato-v" style={{ color: 'var(--green)' }}>{mejorVentana.franja}</span>
            </div>
            <div className="dato" title="Cuando fijás una franja, Kai la respeta para todo lo que se publique.">
              <span className="dato-l">Franja fijada para Kai</span>
              <span className="dato-v" style={{ color: 'var(--purple3)' }}>{franjaFijada ?? 'la automática'}</span>
            </div>
            <div className="dato" title="Las piezas que Kai sostiene por semana, según el plan del mes.">
              <span className="dato-l">Piezas por semana</span>
              <span className="dato-v">{PLAN_DEL_MES.piezasPorSemana}</span>
            </div>
          </div>
          <div className="acc-why">
            {franjaFijada
              ? <>Con la franja fijada, <b>Kai publica siempre de {franjaFijada}</b>: las piezas que aprueba el panel salen en esa ventana y Sol mide si sigue siendo la mejor. Se puede volver a la automática cuando quieras.</>
              : <>Kai elige la franja por su cuenta y hoy la mejor es de <b>{mejorVentana.franja}</b>. Fijarla sirve cuando querés que la constancia no dependa de la medición de cada día.</>}
          </div>
        </Card>
      </div>

      {/* ================= 3 · LO QUE CUESTA PRODUCIR ================= */}
      <div className="csec">
        <span className="csec-n">3</span>
        <span className="csec-t">Lo que cuesta producir</span>
        <span className="csec-c purple">el que más rinde: {credRinde} créditos</span>
        <span className="csec-s">Los tres niveles de producción en créditos y qué rinde cada uno</span>
      </div>
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Credit size={14} style={{ color: 'var(--purple3)' }} /> Lo que cuesta producir cada pieza</span>}
        action={<Badge tone="purple">{credCaro} el premium · {credRinde} el que rinde · {credBarato} el más barato</Badge>}
      >
        <div className="como-se-lee">
          <b>Cómo se lee:</b> los tres niveles de producción, en créditos. El premium se usa para una sola
          pieza de la semana; el del medio es el que más retiene; el barato sostiene el ritmo entre las
          piezas grandes. Verificar una pieza nunca cuesta créditos.
        </div>
        {NICHO.precioProduccion.map(n => {
          const creditos = creditosDe(n.rango);
          const esRinde = n.nivel === nivelRinde.nivel;
          const color = esRinde ? 'var(--green)' : n.nivel === nivelCaro.nivel ? 'var(--amber)' : 'var(--purple3)';
          return (
            <div key={n.nivel} className="guard">
              <span style={{ color, flexShrink: 0 }}><I_Credit size={14} /></span>
              <span className="guard-lb">{n.nivel}
                <small>{n.nota}</small>
                <small>Grilla: {grillaDe(creditos).join(' · ')} · lo produce {quienesDe(creditos)}</small>
              </span>
              <span className="guard-val" style={{ color }}>{creditos} {creditos === 1 ? 'crédito' : 'créditos'}</span>
              <Button variant="ghost" className="btn-sm"
                title={`Abre ${n.nivel.toLowerCase()}: qué se produce con ${creditos} ${creditos === 1 ? 'crédito' : 'créditos'}, cómo se compara con el que más rinde y cuántas piezas entran por mes.`}
                onClick={() => verProduccion(n)}>
                Ver qué se produce
              </Button>
            </div>
          );
        })}
        <div className="datos-row" style={{ paddingTop: 13, borderTop: '1px solid var(--border)' }}>
          <div className="dato" title={`${nivelRinde.nivel}: ${nivelRinde.nota}`}>
            <span className="dato-l">El que más rinde</span>
            <span className="dato-v" style={{ color: 'var(--green)' }}>{credRinde} créditos</span>
          </div>
          <div className="dato" title={`${nivelCaro.nivel}: ${nivelCaro.nota}`}>
            <span className="dato-l">El más caro</span>
            <span className="dato-v" style={{ color: 'var(--amber)' }}>{credCaro} créditos</span>
          </div>
          <div className="dato" title={`${nivelBarato.nivel}: ${nivelBarato.nota}`}>
            <span className="dato-l">El más barato</span>
            <span className="dato-v" style={{ color: 'var(--purple3)' }}>{credBarato} {credBarato === 1 ? 'crédito' : 'créditos'}</span>
          </div>
          <div className="dato" title={`El premium cuesta ${vecesMasCaro} veces lo que cuesta el formato que más rinde.`}>
            <span className="dato-l">El premium cuesta</span>
            <span className="dato-v">{vecesMasCaro.toLocaleString('es-AR')}× el que rinde</span>
          </div>
          <div className="dato" title={`Con los ${plan.creditosMes.toLocaleString('es-AR')} créditos del plan ${plan.nombre} entran ${piezasQueRinden} piezas del formato que más rinde.`}>
            <span className="dato-l">Entran por mes</span>
            <span className="dato-v">{piezasQueRinden} del que rinde</span>
          </div>
        </div>
        <div className="acc-why">
          El formato que más retiene de tu nicho sale con <b>{credRinde} créditos</b> y el premium con {credCaro}:
          el premium cuesta {vecesMasCaro} veces más y da para una sola pieza principal. Con los{' '}
          {plan.creditosMes.toLocaleString('es-AR')} créditos del plan {plan.nombre} entran {piezasQueRinden} piezas
          del que rinde, así que lo primero que se recorta es el formato que bajó en el feed.
        </div>
        <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
          <Button className="btn-sm"
            title="Abre la grilla completa: cada tipo de pieza con sus créditos, quién la produce y cuántas entran con el plan del mes."
            onClick={verGrilla}>
            Ver la grilla completa <I_ArrowRight size={13} />
          </Button>
          <Button variant="ghost" className="btn-sm"
            title="Abre Créditos: el saldo, la grilla de producción y los días de autonomía que te quedan."
            onClick={() => setVista('creditos')}>
            <I_Credit size={13} /> Ver mis créditos
          </Button>
          <Button variant="ghost" className="btn-sm"
            title="Abre Contenido: las piezas del mes con su puntaje del panel y lo que cuesta cada una."
            onClick={() => setVista('campanas')}>
            Ver mi contenido
          </Button>
        </div>
      </Card>
    </div>
  );
}
