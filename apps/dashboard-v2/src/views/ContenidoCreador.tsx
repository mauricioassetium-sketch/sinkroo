// =============================================================================================
// CONTENIDO, EN PIEL DE CREADOR — «Tus piezas: borrador, verificadas por el panel y publicadas».
//
// EL MODELO (la corrección del dueño manda sobre lo anterior): esta herramienta sirve para CREAR
// CONTENIDO, VERIFICARLO y PUBLICARLO en las redes del creador, y para hacer crecer su cuenta según
// su nicho. Acá no hay marcas, ni pitches, ni deals, ni rates: el trabajo del equipo es el ciclo de
// una pieza —
//
//    1. PRODUCIR   · Nia escribe el guion, el hook y el caption; tu avatar arma la pieza con tu material.
//    2. VERIFICAR  · el panel de 5 la puntúa de 0 a 100: con 80 o más aprueba, si no vuelve con la objeción.
//    3. PUBLICAR   · Kai la programa y la publica en tus redes, en la ventana que le conviene a tu audiencia.
//    4. CRECER     · Rex y Sol miden qué retuvo y qué hizo crecer la cuenta.
//
// LA REGLA DEL PANEL, que se ve en la pantalla: la pieza que el panel rechaza NO le cuesta créditos al
// creador — la regeneración por gate la paga el sistema. Por eso la pieza frenada muestra «0 créditos
// tuyos» y su botón de regenerar no suma nada a la semana.
//
// ES PARA CUALQUIER CREADOR: nada de acá asume un rubro. El tipo de cuenta —el que publica por gusto, el
// que hace crecer su audiencia, el que graba para otros, el que muestra su oficio, el que habla de su
// ciudad— cambia QUÉ se publica y QUÉ se mide, nunca cómo funciona el ciclo.
//
// NINGÚN NÚMERO ESTÁ ESCRITO A MANO: las piezas y sus puntajes salen de PIEZAS_DEL_MES, los tipos de
// PIEZAS_CREADOR, los créditos de GRILLA_CREDITOS, el mes de PLAN_DEL_MES, los pasos de CICLO_PASOS y
// los agentes de AGENTES_CREADOR. Un crédito en dólares sale del pack extra de PLANES_CREADOR.
// =============================================================================================

import { useState } from 'react';
import { Card, Badge, Button, Dinero, NotaMoneda } from '../components/ui';
import { ViewHead } from '../components/viz';
import {
  I_File, I_Play, I_Star, I_Check, I_Refresh, I_Eye, I_Vote, I_Zap, I_Credit, I_Cal,
} from '../components/icons';
import { useDetalle } from '../components/Detalle';
import type { Vista } from '../components/Layout';
import { usePlan } from '../lib/plan';
import { usePerfil } from '../lib/perfil';
import { importe } from '../lib/moneda';
import {
  VISTAS_CREADOR, PIEZAS_CREADOR, GRILLA_CREDITOS, PLANES_CREADOR, PIEZAS_DEL_MES, CICLO_PIEZA,
  CICLO_PASOS, PLAN_DEL_MES, AGENTES_CREADOR, FICHA_CREADOR, type EstadoPieza,
} from '../data/creador';

/** Una pieza del mes, con su estado en el ciclo y el puntaje que le puso el panel. */
type Pieza = typeof PIEZAS_DEL_MES[number];

// ---------------------------------------------------------------------------------------------
// LAS CUENTAS Y LOS MAPAS QUE SALEN DE LA DATA (nada escrito dos veces)
// ---------------------------------------------------------------------------------------------

/** Las piezas que el panel frenó: volvieron con menos de 80 y no salen hasta corregirse. */
const FRENADAS = PIEZAS_DEL_MES.filter(p => p.puntaje > 0 && p.puntaje < 80).map(p => p.id);
/** …y las paga el sistema: corregirlas no le cuesta créditos al creador. */
const esFrenada = (id: string) => FRENADAS.includes(id);

/** Las que ya pasaron el panel. El puntaje de una pieza nueva es el promedio de las que aprobó el mes. */
const APROBADAS_MES = PIEZAS_DEL_MES.filter(p => p.puntaje >= 80);
const PUNTAJE_PANEL = Math.round(APROBADAS_MES.reduce((s, p) => s + p.puntaje, 0) / APROBADAS_MES.length);

/** 1 crédito en dólares, leído del pack extra del creador (1.000 créditos por su precio): no se inventa. */
const USD_POR_CREDITO = (() => {
  const pack = PLANES_CREADOR.find(p => p.key === 'topup');
  return pack && pack.creditosMes ? pack.precio / pack.creditosMes : 0;
})();
const enPlata = (creditos: number) => Math.round(creditos * USD_POR_CREDITO * 100) / 100;

/** El tipo de una pieza, leído de PIEZAS_CREADOR: su icono, su red y para qué sirve. */
const tipoDe = (nombre: string) =>
  PIEZAS_CREADOR.find(t => t.nombre === nombre) ?? PIEZAS_CREADOR.find(t => t.key === nombre);

/**
 * El estado de una pieza dice en qué paso del ciclo está: cada paso trabaja sobre las piezas que
 * están en un estado. Producir las deja en borrador, Verificar las puntúa, lo aprobado espera en
 * Publicar y lo que ya salió a las redes se mide en Crecer.
 */
const ESTADOS_DEL_PASO: number[][] = [[0], [1], [2], [3, 4]];
const estadosDePaso = (i: number) => ESTADOS_DEL_PASO[i].map(k => CICLO_PIEZA[k]);
/** En qué paso del ciclo está una pieza, según su estado. */
const pasoDe = (estado: EstadoPieza) => {
  const i = ESTADOS_DEL_PASO.findIndex(k => k.some(n => CICLO_PIEZA[n] === estado));
  return i < 0 ? 0 : i;
};

/** El color de cada estado de la pieza en el ciclo. */
const TONO_ESTADO: Record<EstadoPieza, 'purple' | 'green' | 'amber' | 'muted'> = {
  'Borrador': 'muted',
  'En verificación': 'amber',
  'Aprobada por el panel': 'purple',
  'Publicada': 'green',
  'Medida': 'green',
};

/** El día en que una pieza sale a las redes: se calcula con la fecha de hoy, no se escribe a mano. */
const hoy = () => new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });

export function ViewContenidoCreador({ setToast, setVista }: { setToast: (t: string) => void; setVista: (v: Vista) => void }) {
  const detalle = useDetalle();
  const { perfil } = usePerfil();
  const { plan } = usePlan();

  // --- Lo que cada botón cambia, y se ve en la misma pantalla: el estado de la pieza en el ciclo, el
  // puntaje del panel, el día en que salió, las que volvieron del panel y el lote que salió de una.
  const [estados, setEstados] = useState<Record<string, EstadoPieza>>({});
  const [paneles, setPaneles] = useState<Record<string, number>>({});
  const [salidas, setSalidas] = useState<Record<string, string>>({});
  const [regeneradas, setRegeneradas] = useState<string[]>([]);
  const [lote, setLote] = useState<string[] | null>(null);

  const estadoDe = (p: Pieza): EstadoPieza => estados[p.id] ?? p.estado;
  const puntajeDe = (p: Pieza) => paneles[p.id] ?? p.puntaje;
  const regen = (id: string) => regeneradas.includes(id);
  /** Un cambio hecho con un botón: es lo que hace aparecer «Volver a como estaba» al lado. */
  const cambio = (p: Pieza) => estados[p.id] !== undefined || regen(p.id) || salidas[p.id] !== undefined;

  /** El color del puntaje: verde con 80 o más (el panel aprueba), ámbar abajo. */
  const colorPanel = (s: number) => (s >= 80 ? 'var(--green)' : s > 0 ? 'var(--amber)' : 'var(--muted)');
  /** Los créditos que le cuesta al creador: lo que el panel frenó no se le cobra. */
  const costoDePieza = (p: Pieza) => (esFrenada(p.id) ? 0 : p.creditos);
  const costoDelSistema = (p: Pieza) => (esFrenada(p.id) ? p.creditos : 0);

  /** El importe con sus dos textos, para los paneles de detalle (ahí entra texto, no JSX). */
  const plata = (monto: number) => {
    const t = importe(monto, perfil.moneda);
    return `${t.principal}${t.equivalente ? ` ${t.equivalente}` : ''}`;
  };

  // ============================ LOS NÚMEROS, TODOS DE LA DATA ============================
  const piezas = PIEZAS_DEL_MES.length;
  const arriba80 = PIEZAS_DEL_MES.filter(p => puntajeDe(p) >= 80).length;
  const publicadas = PIEZAS_DEL_MES.filter(p => estadoDe(p) === 'Publicada').length;
  const costoMes = PIEZAS_DEL_MES.reduce((s, p) => s + costoDePieza(p), 0);
  const costoGate = PIEZAS_DEL_MES.reduce((s, p) => s + costoDelSistema(p), 0);
  const pctPlan = plan.creditosMes ? Math.round((costoMes / plan.creditosMes) * 100) : 0;
  const esperan = PIEZAS_DEL_MES.filter(p => estadoDe(p) === 'Aprobada por el panel');
  const enElPanel = PIEZAS_DEL_MES.filter(p => estadoDe(p) === 'En verificación');
  const enBorrador = PIEZAS_DEL_MES.filter(p => estadoDe(p) === 'Borrador');
  const mezclaTotal = PLAN_DEL_MES.mezcla.reduce((s, m) => s + m.cuantas, 0);
  const veredictoPanel = esperan.length
    ? `${esperan.length} ${esperan.length === 1 ? 'espera' : 'esperan'} tu OK`
    : enElPanel.length ? `${enElPanel.length} en verificación`
      : enBorrador.length ? `${enBorrador.length} en borrador` : 'todo en tus redes';

  /** Cuándo sale (o salió) una pieza: lo que dice el ciclo, y lo que cambió un botón. */
  const cuandoDe = (p: Pieza) => {
    const e = estadoDe(p);
    if (salidas[p.id]) return `Salió el ${salidas[p.id]}, en tu mejor ventana`;
    if (e === 'Publicada') return `Salió ${p.cuando}`;
    if (e === 'Aprobada por el panel') return p.cuando === '—' ? 'Sale en tu próxima ventana' : `Sale ${p.cuando}`;
    if (e === 'En verificación') return 'Todavía sin fecha: está en el panel';
    if (esFrenada(p.id) && !regen(p.id)) return 'Espera la corrección: el panel la frenó';
    return 'Todavía sin fecha: es un borrador';
  };

  /** Lo que cuesta una pieza, contado como el creador lo va a ver en su saldo. */
  const costoTexto = (p: Pieza) => (esFrenada(p.id)
    ? `0 créditos tuyos: los ${p.creditos} de regenerarla los paga el sistema`
    : `${p.creditos} ${p.creditos === 1 ? 'crédito' : 'créditos'} · ${plata(enPlata(p.creditos))}`);

  // ============================ LOS BOTONES QUE HACEN (y se ve en la pantalla) ============================

  /** Producir → Verificar: la pieza entró al panel de 5. */
  const mandarAlPanel = (p: Pieza) => {
    setEstados(s => ({ ...s, [p.id]: 'En verificación' }));
    setToast(`«${p.titulo}» entró al panel de 5: la puntúa de 0 a 100 y con 80 o más la aprueba`);
  };

  /** Verificar: el panel la puntúa y, si llega a 80, queda aprobada y pasa a la cola de publicación. */
  const verificar = (p: Pieza) => {
    setPaneles(s => ({ ...s, [p.id]: PUNTAJE_PANEL }));
    setEstados(s => ({ ...s, [p.id]: 'Aprobada por el panel' }));
    setToast(`El panel puntuó «${p.titulo}» ${PUNTAJE_PANEL} de 100: aprobada y esperando tu OK para salir`);
  };

  /** Publicar: sale a la red de la pieza, en la ventana que le conviene a la audiencia. */
  const publicar = (p: Pieza) => {
    setEstados(s => ({ ...s, [p.id]: 'Publicada' }));
    setSalidas(s => ({ ...s, [p.id]: hoy() }));
    setToast(`«${p.titulo}» salió a ${p.red} el ${hoy()}, en tu mejor ventana`);
  };

  /** El lote de la semana: todas las que el panel aprobó y esperan tu OK, de una. */
  const publicarSemana = () => {
    const ids = esperan.map(p => p.id);
    setEstados(s => { const n = { ...s }; ids.forEach(id => { n[id] = 'Publicada'; }); return n; });
    setSalidas(s => { const n = { ...s }; ids.forEach(id => { n[id] = hoy(); }); return n; });
    setLote(ids);
    setToast(`${ids.length} ${ids.length === 1 ? 'pieza salió' : 'piezas salieron'} a tus redes el ${hoy()}`);
  };
  const deshacerSemana = () => {
    const ids = lote ?? [];
    setEstados(s => { const n = { ...s }; ids.forEach(id => { n[id] = 'Aprobada por el panel'; }); return n; });
    setSalidas(s => { const n = { ...s }; ids.forEach(id => { delete n[id]; }); return n; });
    setLote(null);
    setToast(`${ids.length} ${ids.length === 1 ? 'pieza volvió' : 'piezas volvieron'} a esperar tu OK: no quedó nada publicado del lote`);
  };

  /** La pieza que el panel frenó: la regenera el sistema y no le cuesta créditos al creador. */
  const regenerar = (p: Pieza) => {
    setRegeneradas(r => [...r, p.id]);
    setPaneles(s => ({ ...s, [p.id]: PUNTAJE_PANEL }));
    setEstados(s => ({ ...s, [p.id]: 'Aprobada por el panel' }));
    setToast(`«${p.titulo}» volvió del panel con ${PUNTAJE_PANEL}: 0 créditos tuyos, los ${p.creditos} los pagó el sistema`);
  };

  /** La baja de las redes: vuelve a esperar tu OK. */
  const sacarDeRedes = (p: Pieza) => {
    setEstados(s => ({ ...s, [p.id]: 'Aprobada por el panel' }));
    setSalidas(s => { const n = { ...s }; delete n[p.id]; return n; });
    setToast(`«${p.titulo}» ya no está en tus redes: vuelve a esperar tu OK y no pierde su historial`);
  };

  /** Deshace cualquier cambio de la fila: la pieza vuelve a como está en el plan del mes. */
  const volverAComoEstaba = (p: Pieza) => {
    setEstados(s => { const n = { ...s }; delete n[p.id]; return n; });
    setPaneles(s => { const n = { ...s }; delete n[p.id]; return n; });
    setSalidas(s => { const n = { ...s }; delete n[p.id]; return n; });
    setRegeneradas(r => r.filter(x => x !== p.id));
    setToast(`«${p.titulo}» vuelve a como está en el plan del mes: ${p.estado.toLowerCase()}${p.puntaje > 0 ? `, con ${p.puntaje} del panel` : ', sin puntaje del panel'}`);
  };

  // ============================ LOS PANELES DE DETALLE ============================

  /** El puntaje, el costo, el estado y la regla del gate: el por qué de una pieza. */
  const verPieza = (p: Pieza) => {
    const e = estadoDe(p);
    const s = puntajeDe(p);
    const paso = pasoDe(e);
    const t = tipoDe(p.tipo);
    return detalle({
      titulo: p.titulo,
      sub: `${p.tipo} para ${p.red}. El panel la puntúa de 0 a 100 y con 80 o más la aprueba: el estado dice en qué parte del ciclo está.`,
      bloques: [
        { tipo: 'datos', filas: [
          { k: 'Puntaje del panel', v: s > 0 ? `${s} de 100` : 'todavía sin puntaje',
            tono: s >= 80 ? 'green' : s > 0 ? 'amber' : 'muted',
            s: s >= 80 ? 'pasa: con 80 o más el panel la aprueba' : s > 0 ? 'no llega al mínimo de 80: vuelve con la objeción' : 'la puntúa cuando entra al panel de 5' },
          { k: 'Estado en el ciclo', v: e, s: `paso ${paso + 1} de ${CICLO_PASOS.length} · ${CICLO_PASOS[paso].nombre}: lo hace ${CICLO_PASOS[paso].quien}` },
          { k: 'Cuándo sale', v: cuandoDe(p) },
          { k: 'Lo que cuesta', v: esFrenada(p.id) ? `0 créditos tuyos · ${p.creditos} los paga el sistema` : `${p.creditos} ${p.creditos === 1 ? 'crédito' : 'créditos'} · ${plata(enPlata(p.creditos))}`,
            s: esFrenada(p.id) ? 'la regeneración de una pieza que el panel frena no se le cobra al creador' : 'sale de la grilla de producción' },
          { k: 'Quién la hizo', v: p.quien, s: 'Nia escribe el guion, el hook y el caption; el avatar pone tu cara y tu voz' },
          { k: 'Tipo de pieza', v: p.tipo, s: t?.para },
          { k: 'Red', v: p.red, s: 'ahí la programa y la publica Kai' },
          ...(p.retencion ? [{ k: 'Cómo rindió', v: p.retencion, tono: 'green' as const, s: 'medida por Sol: es lo que mueve el alcance' }] : []),
        ] },
        { tipo: 'filas', items: CICLO_PIEZA.map(est => ({
          t: est,
          s: `${CICLO_PASOS[pasoDe(est)].nombre} · lo hace ${CICLO_PASOS[pasoDe(est)].quien}`,
          etiqueta: est === e ? 'está acá' : CICLO_PASOS[pasoDe(est)].nombre,
          tono: est === e ? 'purple' as const : 'muted' as const,
        })) },
        ...(p.nota ? [{ tipo: 'texto' as const, texto: `Lo que dijo el panel al frenarla: ${p.nota}` }] : []),
        ...(regen(p.id) ? [{ tipo: 'texto' as const, texto: `La regeneró el sistema y el panel la volvió a votar en ${PUNTAJE_PANEL}: la objeción quedó contestada y no gastó créditos tuyos.` }] : []),
        { tipo: 'aviso' as const, texto: 'El panel puntúa cada pieza de 0 a 100 y con 80 o más la aprueba. Si la frena, regenerarla no te cuesta créditos: los paga el sistema.' },
      ],
      fuente: 'Las piezas del mes y el ciclo de una pieza · el costo sale de la grilla de producción.',
      acciones: [
        ...(e === 'Borrador' && !esFrenada(p.id) ? [{ label: 'Mandar al panel', variante: 'primary' as const, title: 'Entra al panel de 5: la puntúa y con 80 o más la aprueba. No cuesta créditos y es reversible con «Volver a como estaba».', onClick: () => mandarAlPanel(p) }] : []),
        ...(e === 'Borrador' && esFrenada(p.id) && !regen(p.id) ? [{ label: 'Regenerarla sin costo', variante: 'primary' as const, title: `Nia contesta la objeción y el panel la vuelve a votar. No gasta créditos tuyos: los ${p.creditos} los paga el sistema. Es reversible.`, onClick: () => regenerar(p) }] : []),
        ...(e === 'En verificación' ? [{ label: 'Verificar', variante: 'primary' as const, title: 'El panel de 5 la puntúa ahora: con 80 o más queda aprobada y espera tu OK. No cuesta créditos y es reversible.', onClick: () => verificar(p) }] : []),
        ...(e === 'Aprobada por el panel' ? [{ label: 'Publicar', variante: 'primary' as const, title: `Sale a ${p.red} en tu mejor ventana. Es reversible: la bajás de tus redes cuando quieras.`, onClick: () => publicar(p) }] : []),
        ...(salidas[p.id] ? [{ label: 'Sacarla de mis redes', title: 'La baja de tus redes y vuelve a esperar tu OK. Es reversible: la volvés a publicar cuando quieras.', onClick: () => sacarDeRedes(p) }] : []),
        { label: 'Ver el calendario', title: 'Abre Publicación: qué sale, en qué red y a qué hora', onClick: () => setVista('publicacion') },
      ],
    });
  };

  /** Un paso del ciclo: quién lo hace, qué hace y qué piezas del mes están ahí en este momento. */
  const verPaso = (i: number, enEstePaso: Pieza[]) => {
    const c = CICLO_PASOS[i];
    const agentes = AGENTES_CREADOR.filter(a => c.quien.includes(a.nombre));
    return detalle({
      titulo: `${i + 1}. ${c.nombre}`,
      sub: `${c.quien}: ${c.que}`,
      bloques: [
        { tipo: 'datos', filas: [
          { k: 'Quién lo hace', v: c.quien },
          { k: 'Qué hace', v: c.que },
          { k: 'Estado de la pieza en este paso', v: estadosDePaso(i).join(' · ') },
          { k: 'Piezas del mes acá ahora', v: String(enEstePaso.length), s: enEstePaso.length ? 'son las mismas piezas de la lista de abajo' : 'ninguna pieza está en este paso en este momento' },
        ] },
        ...(agentes.length ? [{ tipo: 'filas' as const, items: agentes.map(a => ({ t: a.nombre, s: a.enCreadores, etiqueta: a.tecnico, tono: 'purple' as const })) }] : []),
        ...(agentes.length ? agentes.map(a => ({ tipo: 'texto' as const, texto: `${a.nombre}: ${a.que}` })) : []),
        ...(enEstePaso.length ? [{ tipo: 'filas' as const, items: enEstePaso.map(p => ({ t: p.titulo, s: `${p.tipo} · ${p.red} · lo hizo ${p.quien}`, etiqueta: estadoDe(p), tono: TONO_ESTADO[estadoDe(p)] })) }] : []),
        { tipo: 'aviso' as const, texto: 'La pieza pasa al paso siguiente cuando cambia de estado: es el recorrido que muestra la lista de piezas del mes.' },
      ],
      fuente: 'El ciclo de una pieza: producir, verificar, publicar y crecer.',
    });
  };

  /** El plan del mes, con lo que ya tiene cada tipo en la lista de piezas. */
  const verPlan = () => detalle({
    titulo: `El plan del mes · serie «${PLAN_DEL_MES.serie}»`,
    sub: `${PLAN_DEL_MES.piezasPorSemana} piezas por semana sobre tu Ficha: ${FICHA_CREADOR.nicho}, en tu tono.`,
    bloques: [
      { tipo: 'filas', items: PLAN_DEL_MES.mezcla.map(m => {
        const hechas = PIEZAS_DEL_MES.filter(p => p.tipo === m.tipo).length;
        return {
          t: `${m.cuantas}× ${m.tipo} por semana`,
          s: m.para,
          etiqueta: hechas ? `${hechas} ya en el mes` : 'todavía ninguna este mes',
          tono: hechas ? 'green' as const : 'muted' as const,
        };
      }) },
      { tipo: 'datos', filas: [
        { k: 'Piezas por semana', v: `${PLAN_DEL_MES.piezasPorSemana}`, s: 'es el ritmo que armó Rex, no un tope del sistema' },
        { k: 'La serie del mes', v: PLAN_DEL_MES.serie, s: 'el hilo que sostiene las piezas entre sí' },
        { k: 'Tu ritmo de hoy', v: FICHA_CREADOR.ritmoActual },
        { k: 'A dónde apunta', v: FICHA_CREADOR.ritmoObjetivo, tono: 'green' as const },
        { k: 'Tu mejor ventana', v: FICHA_CREADOR.mejorVentana.split(',')[0], s: FICHA_CREADOR.mejorVentana },
      ] },
      { tipo: 'texto', texto: `El objetivo del mes: ${PLAN_DEL_MES.objetivo}` },
      { tipo: 'aviso' as const, texto: 'El plan se rearma cada lunes con lo que midió Sol: lo que no rinde se cae y lo que el panel frena se corrige sin costo.' },
    ],
    fuente: 'El plan de contenido del mes y tu Ficha de creador.',
  });

  /** La grilla de producción: de dónde sale el costo de cada pieza del mes. */
  const verGrilla = () => detalle({
    titulo: 'La grilla de créditos',
    sub: `Cada pieza se cobra por su línea de la grilla y un crédito son ${plata(USD_POR_CREDITO)}. La verificación del panel no cuesta créditos.`,
    bloques: [
      { tipo: 'filas', items: GRILLA_CREDITOS.map(g => ({
        t: g.pieza,
        s: `lo hace ${g.quien} · ${plata(enPlata(g.creditos))}`,
        etiqueta: `${g.creditos.toLocaleString('es-AR')} ${g.creditos === 1 ? 'crédito' : 'créditos'}`,
        tono: g.quien === 'Avatar' ? 'purple' as const : 'muted' as const,
      })) },
      { tipo: 'datos', filas: [
        { k: 'Las piezas del mes', v: `${costoMes} créditos`, s: `${plata(enPlata(costoMes))} · el ${pctPlan}% de los ${plan.creditosMes.toLocaleString('es-AR')} del plan ${plan.nombre}` },
        { k: 'Lo pagó el sistema', v: `${costoGate} créditos`, tono: 'green' as const, s: 'la regeneración de la pieza que el panel frenó: no salió de tu cuenta' },
        { k: 'La verificación', v: '0 créditos', s: 'el panel de 5 puntúa cada pieza antes de que salga y no se cobra' },
      ] },
      { tipo: 'aviso' as const, texto: 'Con 80 o más el panel aprueba; si la frena, la regeneración la paga el sistema: corregir una pieza nunca te saca créditos de la semana.' },
    ],
    fuente: 'La grilla de producción del creador: cada pieza con sus créditos y quién la hace.',
  });

  const vista = (
    <div className="dash">
      <ViewHead
        icon={<I_File size={19} />}
        titulo={VISTAS_CREADOR.campanas.nombre}
        sub={VISTAS_CREADOR.campanas.sub}
        nums={[
          { v: String(piezas), l: 'piezas del mes' },
          { v: String(arriba80), l: 'con el panel arriba de 80', c: 'var(--green)' },
          { v: String(publicadas), l: 'publicadas esta semana', c: 'var(--purple3)' },
          { v: String(costoMes), l: 'créditos que va a costar la semana', c: 'var(--amber)' },
        ]}
      />

      {/* LA REGLA DEL PANEL, CON LAS PIEZAS DEL MES ADENTRO: el gate no se le cobra al creador. */}
      <div className="onb-infiere" style={{ marginTop: 0 }}>
        <span className="onb-infiere-ic"><I_Zap size={13} /></span>
        <span>
          <b>El panel puntúa cada pieza de 0 a 100 y con 80 o más la aprueba. </b>
          De las {piezas} piezas del mes, {FRENADAS.length} {FRENADAS.length === 1 ? 'volvió' : 'volvieron'} del panel
          y sus {costoGate} créditos no salieron de tu cuenta: si el panel la frena, corregirla la paga el sistema.
        </span>
      </div>

      {/* ============ 1 · EL CICLO: en qué parte está cada pieza ============ */}
      <div className="csec" style={{ marginTop: 18 }}>
        <span className="csec-n">1</span>
        <span className="csec-t">El ciclo de una pieza</span>
        <span className="csec-c purple">{CICLO_PASOS.length} pasos</span>
        <span className="csec-s">Producir → Verificar → Publicar → Crecer, con quién lo hace en cada paso</span>
      </div>
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Play size={14} style={{ color: 'var(--purple3)' }} /> De la idea a la cuenta que crece</span>}
        action={<Badge tone="purple">Estados: {CICLO_PIEZA.join(' → ')}</Badge>}
      >
        <div className="bs">
          Toda pieza pasa por estos {CICLO_PASOS.length} pasos. <b>Su estado dice en qué parte está</b>, así que
          una pieza en borrador no es lo mismo que una esperando tu OK o una que ya salió a tus redes.
        </div>

        <div className="transv" style={{ marginTop: 12 }}>
          {CICLO_PASOS.map((c, i) => {
            const enEstePaso = PIEZAS_DEL_MES.filter(p => estadosDePaso(i).includes(estadoDe(p)));
            const agentes = AGENTES_CREADOR.filter(a => c.quien.includes(a.nombre));
            return (
              <button key={c.nombre} className="transv-item"
                title={`Abre el paso ${i + 1} «${c.nombre}»: quién lo hace, qué hace y qué piezas del mes están acá ahora. No cambia nada de ninguna pieza.`}
                onClick={() => verPaso(i, enEstePaso)}>
                <span className="transv-ic">{i + 1}</span>
                <span className="transv-t">{c.nombre}</span>
                <span className="transv-q">{c.quien}: {c.que}</span>
                <span className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {agentes.map(a => (
                    <span key={a.id} className="row" style={{ gap: 5, fontSize: 10.5, fontWeight: 800, color: a.color }}>
                      <span style={{ width: 7, height: 7, borderRadius: 99, background: a.color }} />
                      {a.nombre}
                    </span>
                  ))}
                  <Badge tone={enEstePaso.length ? 'purple' : 'muted'}>
                    {enEstePaso.length ? `${enEstePaso.length} ${enEstePaso.length === 1 ? 'pieza del mes' : 'piezas del mes'}` : 'sin piezas acá'}
                  </Badge>
                </span>
              </button>
            );
          })}
        </div>

        <div className="acc-why">
          Lo que el panel no aprueba no sale a tus redes: <b>una pieza se corrige hasta llegar a 80</b>, y esa
          corrección no te cuesta créditos. El estado de cada pieza de abajo es el mismo idioma que este ciclo.
        </div>
      </Card>

      {/* ============ 2 · EL PLAN DEL MES: la serie, la mezcla y el objetivo ============ */}
      <div className="csec">
        <span className="csec-n">2</span>
        <span className="csec-t">El plan del mes</span>
        <span className="csec-c purple">Serie «{PLAN_DEL_MES.serie}»</span>
        <span className="csec-s">Cuántas piezas por semana, la mezcla por tipo con su por qué y el objetivo</span>
      </div>
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Star size={14} style={{ color: 'var(--purple3)' }} /> La mezcla que armó Rex esta semana</span>}
        action={<Badge tone="purple">{PLAN_DEL_MES.piezasPorSemana} piezas por semana</Badge>}
      >
        <div className="bs">
          Rex armó el mes sobre tu Ficha: <b>{FICHA_CREADOR.nicho}</b>, en tu tono. Tu ritmo hoy es{' '}
          <b>{FICHA_CREADOR.ritmoActual.toLowerCase()}</b> y el plan apunta a <b>{FICHA_CREADOR.ritmoObjetivo.toLowerCase()}</b>.
        </div>

        {PLAN_DEL_MES.mezcla.map(m => {
          const t = tipoDe(m.tipo);
          const hechas = PIEZAS_DEL_MES.filter(p => p.tipo === m.tipo).length;
          return (
            <div key={m.tipo} className="guard">
              <span style={{ fontSize: 16, flexShrink: 0 }}>{t?.icono}</span>
              <span className="guard-lb">{m.tipo}
                <small>{m.para}{t?.red ? ` Sale en ${t.red}.` : ''}</small>
              </span>
              <Badge tone="purple">{m.cuantas} por semana</Badge>
              <span className="guard-val" style={{ color: hechas ? 'var(--green)' : 'var(--muted)' }}>
                {hechas ? `${hechas} en el mes` : 'ninguna todavía'}
              </span>
            </div>
          );
        })}

        <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
          <div className="dato" title="La mezcla del plan, sumada: es el ritmo semanal que armó Rex.">
            <span className="dato-l">La mezcla suma</span>
            <span className="dato-v">{mezclaTotal} de {PLAN_DEL_MES.piezasPorSemana} por semana</span>
          </div>
          <div className="dato" title="Las piezas que ya están en la lista del mes, con las que ya salieron.">
            <span className="dato-l">Piezas ya en el mes</span>
            <span className="dato-v" style={{ color: 'var(--purple3)' }}>{piezas} · {publicadas} publicadas</span>
          </div>
          <div className="dato" title="La serie que sostiene el mes: es el hilo que elige Rex para tus piezas.">
            <span className="dato-l">La serie del mes</span>
            <span className="dato-v">«{PLAN_DEL_MES.serie}»</span>
          </div>
        </div>

        <div className="acc-why">
          <b>El objetivo del mes:</b> {PLAN_DEL_MES.objetivo}
        </div>

        <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
          <Button variant="outline" className="btn-sm"
            title="Abre el plan completo: cada tipo con lo que ya salió este mes, tu ritmo de hoy y tu mejor ventana. No cambia nada."
            onClick={verPlan}><I_Eye size={13} /> Ver el plan completo</Button>
        </div>
      </Card>

      {/* ============ 3 · LAS PIEZAS DEL MES: el puntaje del panel y el estado en el ciclo ============ */}
      <div className="csec">
        <span className="csec-n">3</span>
        <span className="csec-t">Las piezas del mes y el puntaje del panel</span>
        <span className="csec-c purple">{arriba80} arriba de 80</span>
        <span className="csec-s">Cada pieza con su tipo, su estado en el ciclo, la red, cuándo sale y quién la hizo</span>
      </div>
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_File size={14} style={{ color: 'var(--purple3)' }} /> Las piezas del mes</span>}
        action={<Badge tone={esperan.length ? 'amber' : enElPanel.length || enBorrador.length ? 'purple' : 'green'}>{veredictoPanel}</Badge>}
      >
        {PIEZAS_DEL_MES.map(p => {
          const e = estadoDe(p);
          const s = puntajeDe(p);
          const paso = pasoDe(e);
          const t = tipoDe(p.tipo);
          const frenada = esFrenada(p.id);
          const regenerada = regen(p.id);
          return (
            <div key={p.id} className="guard" style={{ alignItems: 'flex-start', paddingTop: 12, paddingBottom: 12 }}>
              <span style={{ width: 34, flexShrink: 0, textAlign: 'center', fontSize: 17, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: colorPanel(s) }}
                title={s > 0
                  ? `Puntaje del panel: ${s} de 100. Con 80 o más la aprueba.`
                  : 'Todavía no pasó por el panel de 5: no tiene puntaje.'}>
                {s > 0 ? s : '—'}
              </span>

              <span className="guard-lb" style={{ minWidth: 0 }}>
                <span className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
                  <span className="bt">{p.titulo}</span>
                  <Badge tone={TONO_ESTADO[e]}>{e}</Badge>
                  <Badge tone="muted">{t?.icono} {p.tipo}</Badge>
                  <Badge tone="muted">{p.red}</Badge>
                  {p.retencion && <Badge tone="green">medida · {p.retencion}</Badge>}
                </span>
                <small>
                  Paso {paso + 1} de {CICLO_PASOS.length} · {CICLO_PASOS[paso].nombre}: {CICLO_PASOS[paso].quien} · {cuandoDe(p)}
                </small>
                <small>{costoTexto(p)} · la hizo {p.quien}</small>
                {p.nota && (
                  <small style={{ color: frenada && !regenerada ? 'var(--amber)' : 'var(--muted2)' }}>
                    Objeción del panel: {p.nota}
                  </small>
                )}
                {regenerada && (
                  <small style={{ color: 'var(--green)', fontWeight: 700 }}>
                    Regenerada sin costo: el panel la volvió a votar en {PUNTAJE_PANEL}. 0 créditos tuyos, los {p.creditos} los pagó el sistema.
                  </small>
                )}
              </span>

              <span className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
                {e === 'Borrador' && !frenada && (
                  <Button className="btn-sm"
                    title="Manda la pieza al panel de 5: la puntúa de 0 a 100 y con 80 o más la aprueba. La verificación no cuesta créditos. Es reversible: con «Volver a como estaba» vuelve a borrador."
                    onClick={() => mandarAlPanel(p)}><I_Vote size={13} /> Mandar al panel</Button>
                )}
                {e === 'Borrador' && frenada && !regenerada && (
                  <Button className="btn-sm"
                    title={`Nia contesta la objeción y el panel la vuelve a votar. No gasta créditos tuyos: los ${p.creditos} los paga el sistema. Es reversible: con «Volver a como estaba» queda como el panel la frenó.`}
                    onClick={() => regenerar(p)}><I_Refresh size={13} /> Regenerarla sin costo</Button>
                )}
                {e === 'En verificación' && (
                  <Button className="btn-sm"
                    title="El panel de 5 la puntúa ahora: con 80 o más queda aprobada y pasa a la cola de publicación. No cuesta créditos. Es reversible: con «Volver a como estaba» vuelve a verificación."
                    onClick={() => verificar(p)}><I_Check size={13} /> Verificar</Button>
                )}
                {e === 'Aprobada por el panel' && (
                  <Button className="btn-sm"
                    title={`Kai la publica en ${p.red}, en tu mejor ventana. Es reversible: con «Sacarla de mis redes» vuelve a esperar tu OK y no pierde el historial.`}
                    onClick={() => publicar(p)}><I_Check size={13} /> Publicar</Button>
                )}
                {salidas[p.id] && (
                  <Button variant="ghost" className="btn-sm"
                    title="La baja de tus redes y vuelve a «Aprobada por el panel», esperando tu OK. Es reversible: la volvés a publicar cuando quieras."
                    onClick={() => sacarDeRedes(p)}><I_Refresh size={12} /> Sacarla de mis redes</Button>
                )}
                {cambio(p) && !salidas[p.id] && (
                  <Button variant="ghost" className="btn-sm"
                    title={`La deja como está en el plan del mes: ${p.estado.toLowerCase()}${p.puntaje > 0 ? `, con ${p.puntaje} del panel` : ', sin puntaje del panel'}. Es reversible: podés volver a cambiarla.`}
                    onClick={() => volverAComoEstaba(p)}><I_Refresh size={12} /> Volver a como estaba</Button>
                )}
                <Button variant="ghost" className="btn-sm"
                  title="Muestra el puntaje del panel, en qué parte del ciclo está, cuándo sale, quién la hizo y lo que cuesta. No cambia nada de la pieza."
                  onClick={() => verPieza(p)}><I_Eye size={13} /> Ver por qué</Button>
              </span>
            </div>
          );
        })}

        <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
          <div className="dato" title="La suma de lo que cuesta producir las piezas del mes, sin contar la que el panel frenó.">
            <span className="dato-l">Va a costar la semana</span>
            <span className="dato-v" style={{ color: 'var(--purple3)' }}>{costoMes} créditos · <Dinero monto={enPlata(costoMes)} /></span>
          </div>
          <div className="dato" title="La regeneración de la pieza que el panel frenó: no salió de tu cuenta, la pagó el sistema.">
            <span className="dato-l">Lo pagó el sistema</span>
            <span className="dato-v" style={{ color: 'var(--green)' }}>{costoGate} créditos</span>
          </div>
          <div className="dato" title={`Créditos que entran por mes con el plan ${plan.nombre}.`}>
            <span className="dato-l">Del plan del mes</span>
            <span className="dato-v">{pctPlan}% de {plan.creditosMes.toLocaleString('es-AR')}</span>
          </div>
        </div>

        <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
          {esperan.length > 0 ? (
            <>
              <Button className="btn-sm"
                title={`Publica de una las ${esperan.length} piezas que el panel aprobó y esperan tu OK, cada una en su red y en tu mejor ventana. Es reversible: con Deshacer vuelven a esperar tu OK.`}
                onClick={publicarSemana}><I_Check size={13} /> Publicar las {esperan.length} de la semana</Button>
              <span className="tiny muted" style={{ alignSelf: 'center' }}>
                Las que están abajo de 80 no entran: {enElPanel.length
                  ? `${enElPanel.length === 1 ? 'la que está' : `las ${enElPanel.length} que están`} en verificación primero pasa${enElPanel.length === 1 ? '' : 'n'} el panel.`
                  : 'primero se corrigen.'}
              </span>
            </>
          ) : lote ? (
            <>
              <span className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--green)', fontWeight: 700, alignSelf: 'center' }}>
                <I_Check size={13} /> {lote.length} {lote.length === 1 ? 'pieza salió' : 'piezas salieron'} a tus redes el {hoy()}.
              </span>
              <Button variant="ghost" className="btn-sm"
                title="Deshace la publicación del lote: las piezas vuelven a «Aprobada por el panel» y esperan tu OK. Se despublica todo lo que salió junto."
                onClick={deshacerSemana}><I_Refresh size={12} /> Deshacer</Button>
            </>
          ) : (
            <span className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--green)', fontWeight: 700 }}>
              <I_Check size={13} /> Nada espera tu OK: todo lo que el panel aprobó ya está en tus redes.
            </span>
          )}
          <Button variant="ghost" className="btn-sm"
            title="Abre la grilla de producción: cada pieza con sus créditos, quién la hace y lo que cuesta en plata. No cambia nada."
            onClick={verGrilla}><I_Credit size={13} /> Ver la grilla de créditos</Button>
          <Button variant="ghost" className="btn-sm"
            title="Abre Publicación: qué sale, en qué red y a qué hora, con las redes conectadas."
            onClick={() => setVista('publicacion')}><I_Cal size={13} /> Ver el calendario</Button>
        </div>

        <div className="acc-why">
          El panel puntúa cada pieza antes de que salga: <b>con 80 o más sale, abajo no</b>. Y lo que el panel
          frena no te cuesta: la regeneración la paga el sistema, así que corregir una pieza nunca te saca
          créditos de la semana.
        </div>
        <NotaMoneda />
      </Card>
    </div>
  );

  return vista;
}
