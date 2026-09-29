import { lista } from '../lib/lista';
import { useEffect, useState } from 'react';
import { Card, Badge, Button, Dinero, NotaMoneda } from '../components/ui';
import { ViewHead, Bars, Ring } from '../components/viz';
import { FlujoMiroFish } from '../components/FlujoMiroFish';
import { Stepper, IngestaManual, Galeria, PASOS_CAMPANA, type PasoCampana } from '../components/CampanaPasos';
import { MotorEnVivo } from '../components/MotorEnVivo';
import { EnLinea } from '../components/EnLinea';
import { Publicar } from '../components/Publicar';
import { PRESUPUESTOS } from '../data/onboarding';
import { CampanaViva } from '../components/CampanaViva';
import { I_Megaphone, I_Check, I_Refresh, I_Vote, I_File, I_Zap, I_Trend, I_Eye, I_Robot, I_Play, I_Upload, I_Pause, I_Plus } from '../components/icons';
import type { Vista } from '../components/Layout';
import type { Campana, Modo } from '../data/demo';
import { TARIFA } from '../data/mirofish';
import { useDetalle } from '../components/Detalle';
import { numeroConMiles } from '../lib/perfil';
import { useDatos, type Campana as CampanaBack } from '../api/datos';
import { EstadoVacio } from '../components/EstadoVacio';
import { baseApi, token } from '../api/cliente';
import { useEvaluacion, etiquetaReaccion, colorReaccion, fechaCorta, numONulo } from '../components/mirofishDatos';

// =============================================================================================
// DE DÓNDE SALEN LAS CAMPAÑAS DE ESTA PANTALLA
//
// La lista sale de las campañas del negocio, tal como están en el servidor. No hay respaldo de
// ejemplo: sin campañas, la pantalla muestra su estado vacío. La decisión se toma una sola vez, en
// `fuente`: de ahí para abajo todo lee lo mismo.
//
// Lo que el back no manda todavía (el techo del mes, el alcance, las conversiones, el costo por
// venta) no se inventa: queda en «—» y la pantalla lo dice. Rellenarlo con un número de ejemplo
// sería mentir sobre lo que hay.
// =============================================================================================

/** El número detrás del ROAS como se lee en la pantalla: «7,3x» → 7.3. Sin dato, cero. */
const roasNum = (r: string) => Number(String(r).replace('x', '').replace(',', '.')) || 0;

/**
 * Las dos campañas que nombran las recomendaciones del panel: la que mejor devuelve y la que va
 * más abajo. Se leen de los datos, no se escriben a mano: si cambia el número, cambia la
 * recomendación. Las que todavía no tienen retorno no entran; si ninguna lo tiene, la primera de
 * la lista ocupa su lugar.
 */
const mejorYPeor = (cs: Campana[]) => {
  const conDatos = cs.filter(c => c.roas !== '—');
  const orden = [...(conDatos.length ? conDatos : cs)].sort((a, b) => roasNum(b.roas) - roasNum(a.roas));
  return { pack: orden[0], marca: orden[orden.length - 1] };
};

/** La primera letra en mayúscula: la forma que guarda el back («ventas») se lee «Ventas». */
const capitalizar = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : '');

/**
 * El estado del back, en el vocabulario de esta pantalla. El back guarda en minúscula y hoy sólo
 * escribe «borrador»; lo que no reconoce queda en Borrador, que es el estado que no gasta nada.
 */
const estadoDeBack = (estado: string): Campana['estado'] => {
  const e = (estado || '').toLowerCase();
  if (e.startsWith('activ')) return 'Activa';
  if (e.includes('pausa')) return 'En pausa';
  if (e.includes('final') || e.includes('termin')) return 'Finalizada';
  return 'Borrador';
};

/** La fecha del back, en corto: «creada el 12 de septiembre». */
const fechaDeBack = (iso: string) => {
  const f = new Date(iso);
  return isNaN(f.getTime()) ? 'sin fecha' : f.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
};

/**
 * Una pieza juzgada, con lo que se muestra en la lista y en el veredicto del paso 5: el título y el
 * puntaje de su evaluación en el back, y el voto de sus jueces, que se pide aparte con el detalle.
 */
type PiezaJuzgada = {
  id: string;
  titulo: string;
  formato: string;
  medida: string;
  puntaje: number;
};

/** Los días que le quedan al mes: sale del calendario, no de un número escrito a mano. */
const diasQueQuedanDelMes = () => {
  const hoy = new Date();
  const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  return Math.max(0, fin.getDate() - hoy.getDate());
};

/**
 * Una campaña del back, con la forma que ya usa esta pantalla: nombre, forma, estado, presupuesto,
 * destinos, piezas, ROAS y gasto son los del back, tal como vienen.
 *
 * Lo que el back todavía no manda de una campaña no se rellena con un dato inventado: va en «—» o en
 * blanco, y la pantalla lo dice. `formato` y `medida` de la pieza que corre no llegan en la ficha de
 * la campaña, así que quedan vacíos; `color` no es un dato del negocio, es sólo el tono del marco.
 */
const campanaDeBack = (c: CampanaBack): Campana => ({
  id: c.id,
  nombre: c.nombre,
  tipo: capitalizar(c.forma) || 'Campaña',
  emoji: '📣',
  estado: estadoDeBack(c.estado),
  roas: Number(c.roas) > 0 ? `${Number(c.roas).toFixed(1).replace('.', ',')}x` : '—',
  presupuesto: `$${Math.round(Number(c.presupuesto) || 0)}/día`,
  alcance: '—',
  conversiones: 0,
  pct: 0,
  score: 0,
  artefactos: Number(c.piezas) || 0,
  // El formato y la medida de la pieza que corre no llegan en la ficha de la campaña: quedan vacíos y
  // la tarjeta lo dice. Poner acá uno deducido de la forma de la campaña sería inventar un dato suyo.
  formato: '' as Campana['formato'],
  medida: '',
  copy: c.objetivo || '',
  cta: '—',
  color: 'var(--bg3)',
  plataforma: lista(c.destinos).join(' + ') || 'sin destinos cargados',
  publico: '—',
  fechas: `creada el ${fechaDeBack(c.created_at)}`,
  gastado: `$${Math.round(Number(c.gasto) || 0)}`,
  costo: '—',
});

/** Lo que una campaña tiene asignado por día, leído de sus propios datos: '$40/día' → 40. */
const presuDelTexto = (presupuesto: string) => Number(presupuesto.replace(/[^0-9]/g, ''));
const presuBase = (c: Campana) => presuDelTexto(c.presupuesto);


type EstadoCamp = Campana['estado'];

export function ViewCampanas({ setToast, modo, setVista }: { setToast: (t: string) => void; modo: Modo; setVista: (v: Vista) => void }) {
  const detalle = useDetalle();
  const d = useDatos();
  // --- La fuente de esta pantalla: las campañas del negocio, tal como están en el servidor. De aquí
  // salen la lista, el gasto por día, el conteo de artefactos y las dos campañas que nombran las
  // recomendaciones. Sin campañas no hay nada de ejemplo: va el estado vacío que dice cómo crear la
  // primera.
  const fuente: Campana[] = d.campanas.map(campanaDeBack);
  const sinNada = fuente.length === 0;
  const { pack: PACK, marca: MARCA } = mejorYPeor(fuente);
  const gastoLb = fuente.map(c => c.nombre.split(' ')[0]);
  // El ROAS que corona la cabecera: el promedio de las campañas que ya devuelven algo, y «—» mientras
  // ninguna lo mida. Sale de sus propios datos.
  const conRetorno = fuente.filter(c => c.roas !== '—');
  const roasMes = conRetorno.length
    ? `${(conRetorno.reduce((s, c) => s + roasNum(c.roas), 0) / conRetorno.length).toFixed(1).replace('.', ',')}x`
    : '—';
  const [paso, setPaso] = useState<PasoCampana>(1);
  // Las decisiones de la cuenta salen del onboarding: una sola fuente para el motor y el panel.
  const decisiones = (d.onboarding?.datos ?? {}) as Record<string, unknown>;
  /**
   * Lo que se acaba de presionar se pinta al instante: el viaje al servidor tarda lo suyo y una
   * elección que no se ve marcada parece que no se registró. El valor del servidor manda en cuanto
   * llega; esto solo cubre el hueco.
   */
  const [recienElegido, setRecienElegido] = useState<Record<string, string | string[]>>({});
  /** El valor que se muestra: lo recién presionado o, si no, lo que hay guardado. */
  const valorDe = (campo: string): string | string[] | undefined => recienElegido[campo] ?? (decisiones[campo] as string | string[] | undefined);
  /** Lo que el sistema necesita saber para decidir solo: si falta algo, se dice y se manda a Primeros pasos. */
  const chequeos = [
    { listo: !!d.negocio?.name && String(d.negocio?.description || '').length >= 20, t: 'Su negocio: cómo se llama y qué hace' },
    { listo: !!(decisiones.negocio_que && decisiones.prod_1), t: 'Qué vende y a qué precio' },
    { listo: (d.archivos?.length ?? 0) > 0, t: 'Su material: fotos, videos o catálogo' },
    { listo: Array.isArray(decisiones.canales) && (decisiones.canales as string[]).length > 0, t: 'Dónde quiere que trabaje (sus redes)' },
  ];
  const primerosPasosListos = chequeos.every(c => c.listo);
  /** La decisión que tomó Tino en la última corrida (es lo que el cliente ve en Automático). */
  const decisionTino = (d.corridas.flatMap(c => c.tareas ?? []).find(t => t.agente === 'tino')?.resultado ?? null) as any;

  // LA PIEZA ESCRITA: el texto que el motor dejó listo para publicar, con lo que lo sostiene. Si todavía
  // no hay ninguna, no se muestra una de ejemplo: se dice que el motor la escribe en la próxima corrida.
  const piezaLista = (d.piezas && d.piezas[0]) ? d.piezas[0] : null;
  const piezaDet = (piezaLista?.generacion ?? {}) as any;
  // El veredicto de la pieza escrita, tal como está en el back (los 5 jueces, el público y la predicción).
  const veredictoPieza = useEvaluacion(piezaLista?.evaluacion_id ?? null);
  const [probando, setProbando] = useState(false);
  /** Pasa la pieza escrita por MiroFish: 5 jueces y 500 del público. Cuesta 48 créditos (lo dice el back). */
  const pasarPorMiroFish = async () => {
    if (!piezaLista || probando) return;
    setProbando(true);
    try {
      const r = await fetch(baseApi() + '/api/mirofish/evaluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
        body: JSON.stringify({ pieza_id: piezaLista.id }),
      });
      const j = (await r.json().catch(() => ({}))) as any;
      if (r.ok) {
        setToast(j?.pin_requerido ? `MiroFish probó la pieza: ${j.puntaje} de 100, puesto ${j.orden}. ${j?.aviso || ''}` : `MiroFish probó la pieza: ${j.puntaje} de 100, puesto ${j.orden}`);
        await d.refrescar();
      } else {
        setToast(String(j?.detalle || j?.error || 'el back no dejó probar la pieza'));
      }
    } catch {
      setToast('no se pudo hablar con el back para probar la pieza');
    }
    setProbando(false);
  };
  const copiarPieza = async (texto: string, que: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setToast(`${que} copiado: ya lo puede pegar en su red`);
    } catch {
      setToast('el navegador no dejó copiar solo: seleccione el texto y cópielo a mano');
    }
  };

  /** El estatus de un grupo, en corto: «Automático», «WhatsApp, Instagram», «sin definir». */
  const estatusDe = (campo: string) => {
    const v = valorDe(campo);
    if (Array.isArray(v)) return v.length ? v.join(', ') : 'sin definir';
    return v ? String(v) : 'sin definir';
  };
  /** Cómo trabaja el modelo: Automático (decide y crea) o Manual (lo arma el cliente). Arranca en Automático. */
  // Si el negocio ya había elegido manual, el panel lo respeta al abrir.
  useEffect(() => { if (decisiones.modo) setManual(String(decisiones.modo) === 'Manual'); }, [decisiones.modo]);
  /** Guarda una decisión en el onboarding, con su aviso: se puede cambiar cuando quiera. */
  const decidir = (campo: string, etiqueta: string, valor: string, multi?: boolean) => {
    const actual = valorDe(campo);
    const nuevo = multi
      ? (Array.isArray(actual) ? (actual.includes(valor) ? actual.filter(x => x !== valor) : [...actual, valor]) : [valor])
      : valor;
    setRecienElegido(prev => ({ ...prev, [campo]: nuevo }));   // se pinta ya, en morado
    void d.guardar({ datos: { [campo]: nuevo } });              // y se guarda
    // El modo manda la vista: en Manual la pantalla trabaja con el material que sube el cliente.
    if (campo === 'modo') setManual(valor === 'Manual');
    setToast(`${etiqueta}: ${Array.isArray(nuevo) ? (nuevo.join(', ') || 'ninguno') : String(nuevo)}`);
  };
  const [manual, setManual] = useState(false);
  // --- Lo que un botón cambia en la pantalla. Nada de avisos que se van solos: la campaña se muda
  // de lista, el presupuesto cambia en la fila y en el gráfico, el contador sube, y cada acción deja
  // el botón que la deshace al lado. Los avisos (setToast) acompañan; el estado es lo que queda.
  const [estados, setEstados] = useState<Record<string, EstadoCamp>>({});
  const [presuExtra, setPresuExtra] = useState<Record<string, number>>({});
  const [aplicadas, setAplicadas] = useState<string[]>([]);
  const [publicadas, setPublicadas] = useState<string[]>([]);
  const [corregidas, setCorregidas] = useState<string[]>([]);
  const [aviso, setAviso] = useState<{ t: string; tono: 'green' | 'amber' } | null>(null);
  // --- Crear una campaña de verdad: nace en el back, en borrador. Sin servidor no hay dónde crearla,
  // así que el botón aparece cuando hay con quién hablar.
  const [nueva, setNueva] = useState(false);
  const [borradorNuevo, setBorradorNuevo] = useState({ nombre: '', forma: 'ventas', presupuesto: '20', destinos: 'Instagram', objetivo: '' });
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState('');
  const listos = PASOS_CAMPANA.filter(p => p.n < paso).map(p => p.n) as PasoCampana[];
  // --- Última fila del paso 5: LISTA + DETALLE con una sola fuente de datos: las evaluaciones del
  // negocio, ordenadas por el puesto que les dio MiroFish, y el voto de los 5 jueces de la elegida,
  // leído de `GET /api/mirofish/:id`. Sin evaluaciones, cada tarjeta muestra su estado vacío.
  const juzgadas: PiezaJuzgada[] = [...d.evaluaciones]
    .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999) || (Number(b.puntaje) || 0) - (Number(a.puntaje) || 0))
    .map(e => ({
      id: e.id, titulo: e.titulo, formato: '', medida: '',
      puntaje: Number(e.puntaje) || 0,
    }));
  const [elegida, setElegida] = useState<string | null>(null);
  const idPieza = elegida ?? juzgadas[0]?.id ?? null;
  const pieza = juzgadas.find(o => o.id === idPieza) ?? juzgadas[0] ?? null;
  // El veredicto de la elegida: se pide el detalle real de esa evaluación, y el voto juez por juez con
  // su opinión es lo que se muestra.
  const { dato: veredicto, cargando: leyendoVeredicto } = useEvaluacion(idPieza ? idPieza : null);
  const votosPieza: { nombre: string; mira: string; score: number; opinion: string }[] = (veredicto?.votos ?? [])
    .map(v => ({ nombre: v.juez, mira: v.criterio, score: v.voto, opinion: v.opinion }));
  const scorePieza = pieza ? pieza.puntaje : 0;
  const pasaPieza = scorePieza >= 80;
  const votoMasBajo = votosPieza.length ? votosPieza.reduce((a, b) => (b.score < a.score ? b : a)) : null;
  // Cuántos jueces votaron y qué objetó cada uno: sale de los votos de esta pieza, que son los del back.
  const nJueces = votosPieza.length || 5;
  const conObjecion = [...votosPieza].filter(v => v.score < 80).sort((a, b) => a.score - b.score);
  const objecionesPieza = (conObjecion.length ? conObjecion : votosPieza.slice(0, 1))
    .map(v => ({ juez: v.nombre, texto: v.opinion, voto: v.score }));
  const colorScore = (s: number) => (s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--red)');
  const palabraVeredicto = (s: number) => (s >= 80 ? 'Lista' : s >= 60 ? 'Revisar' : 'No lanzar');
  const tonoVeredicto = (s: number): 'green' | 'amber' | 'red' => (s >= 80 ? 'green' : s >= 60 ? 'amber' : 'red');
  // El puntaje es el que quedó guardado en MiroFish: se dice tal cual, sin atribuirle una cuenta que no
  // es la suya.
  const criterioDePieza = (s: number) => `El puntaje es el que le dio MiroFish: ${s} de 100. El voto juez por juez está abajo.`;
  // Cuántas piezas juzgó el negocio y cuántas pasaron el mínimo: sale de sus evaluaciones, contado aquí.
  const juzgadasTotal = d.evaluaciones.length;
  const pasarondelMes = d.evaluaciones.filter(e => Number(e.puntaje) >= 80).length;
  const frenadas = d.evaluaciones.filter(e => Number(e.puntaje) < 80).length;
  const artefactos = fuente.reduce((s, c) => s + c.artefactos, 0);

  // --- Las campañas, con el estado y el presupuesto que tienen AHORA (no los de la data original).
  // Así lo que hace un botón se ve en la misma pantalla: la fila, la tarjeta en vivo, el contador y
  // el gráfico del día salen todos de aquí. La data original queda intacta para poder volver atrás.
  const estadoDe = (c: Campana): EstadoCamp => estados[c.id] ?? c.estado;
  const presuDia = (c: Campana) => {
    const base = fuente.find(o => o.id === c.id);
    return (base ? presuDelTexto(base.presupuesto) : presuDelTexto(c.presupuesto)) + (presuExtra[c.id] ?? 0);
  };
  const conLoDeAhora = (c: Campana): Campana => ({ ...c, estado: estadoDe(c), presupuesto: `$${presuDia(c)}/día` });
  const campanas = fuente.map(conLoDeAhora);
  const gasto = fuente.map(presuDia);                 // lo asignado por día, campaña por campaña
  const diario = gasto.reduce((s, v) => s + v, 0);
  const vivas = campanas.filter(c => c.estado === 'Activa');
  const otras = campanas.filter(c => c.estado !== 'Activa');
  // --- El dinero del mes. Lo invertido sale de sus campañas —lo gastado, tal como está en el
  // servidor— y el techo del mes y el cierre proyectado todavía no llegan: van en «—», nunca en un
  // número escrito a mano.
  const invertido = d.campanas.reduce((s, c) => s + (Number(c.gasto) || 0), 0);
  const gastadoPorCampana = d.campanas.map(c => Number(c.gasto) || 0);
  const diasQueQuedan = diasQueQuedanDelMes();
  // Lo que cambiaría el presupuesto por día si marca las acciones de arriba. Sale de los presupuestos
  // suyos que están cargados, sumados acá: es cuenta sobre datos del negocio, no una cifra de ejemplo.
  const efectoPresu = (PACK && MARCA)
    ? (aplicadas.includes('presu') ? 5 : 0) - (aplicadas.includes('pausar') && MARCA.id !== PACK.id ? presuBase(MARCA) : 0)
    : 0;
  const techoAviso = 'El techo del mes y el cierre proyectado todavía no llegan del servidor: van en «—». Lo que sí llega —lo invertido, el presupuesto por día y lo gastado campaña por campaña— se muestra tal cual, sin rellenar nada.';

  // El rótulo del botón de cada fila. No dice «Publicar»: dice «Marcar activa», porque el panel
  // todavía no le manda ese cambio al servidor.
  const lblAccion = (e: EstadoCamp) => (e === 'Finalizada'
    ? 'Ver el informe'
    : e === 'Activa'
      ? 'Marcar en pausa'
      : 'Marcar activa');
  const titleAccion = (e: EstadoCamp) =>
    e === 'Borrador'
      ? 'Marca la campaña como activa en el panel. El cambio todavía no llega al servidor: por esto no sale a sus redes ni empieza a gastar. Es reversible.'
      : e === 'En pausa'
        ? 'La marca como activa en el panel. El cambio todavía no llega al servidor: la campaña sigue donde está en el back. Es reversible.'
        : e === 'Finalizada'
          ? 'Abre el informe final: qué rindió, cuánto gastó y qué dejó para la próxima.'
          : 'La marca en pausa en el panel. El cambio todavía no llega al servidor: no se pierde nada del historial y es reversible.';

  // ============================ LOS BOTONES QUE HACEN (y se ve en la pantalla) ============================

  /** La fila de «las que no están corriendo»: publicar, reactivar o pausar. La campaña se muda de sección. */
  const moverCampana = (c: Campana) => {
    const e = estadoDe(c);
    if (e === 'Finalizada') {
      detalle({
        titulo: `El informe de «${c.nombre}»`,
        sub: 'Qué rindió, cuánto gastó y qué dejó para la próxima. La campaña terminó, pero sus piezas y su historial siguen aquí.',
        bloques: [
          { tipo: 'datos', filas: [
            { k: 'Cómo terminó', v: 'Finalizada', s: `corrió ${c.fechas}` },
            { k: 'Gastado en total', v: c.gastado, s: 'lo que costó la campaña completa' },
            { k: 'Devolvió por peso invertido', v: c.roas, tono: c.roas === '—' ? 'muted' : 'green', s: c.roas === '—'
              ? 'el servidor todavía no lo mide para esta campaña'
              : 'lo que devolvió, tal como está en el servidor' },
            { k: 'Conversiones', v: '— todavía no llegan', s: 'la ficha de la campaña todavía no las manda' },
            { k: 'Alcance', v: '— todavía no llega', s: 'personas distintas que la vieron' },
            { k: 'Piezas que dejó', v: String(c.artefactos), s: 'quedan guardadas para reusar' },
          ] },
          { tipo: 'texto', texto: `Salió en ${c.plataforma}. Lo que el servidor todavía no manda de esta campaña —las conversiones y el alcance— va en «—»: aquí no se rellena con un número inventado.` },
          { tipo: 'aviso', texto: 'Lo que funcionó se puede volver a usar: la campaña no se borra y sus piezas quedan.' },
        ],
        fuente: 'Los números finales de la campaña, tal como quedaron al terminar.',
      });
      return;
    }
    const nuevo: EstadoCamp = e === 'Activa' ? 'En pausa' : 'Activa';
    setEstados(s => ({ ...s, [c.id]: nuevo }));
    setAviso(nuevo === 'Activa'
      ? { tono: 'green', t: `«${c.nombre}» quedó activa en el panel: el cambio todavía no llega al servidor, así que la campaña sigue como está en el back.` }
      : { tono: 'amber', t: `«${c.nombre}» quedó en pausa en el panel: el cambio todavía no llega al servidor y no se pierde nada del historial.` });
    setToast(nuevo === 'Activa'
      ? `«${c.nombre}» quedó activa en el panel: el estado real lo sigue mandando el servidor`
      : `«${c.nombre}» en pausa: la reactiva cuando quiera`);
  };

  /** Recomendación 1: subirle $5 por día a la que mejor devuelve. Queda en $14 y vuelve a correr. */
  const aplicarSubir = () => {
    const antes = presuDia(PACK);
    setPresuExtra(s => ({ ...s, [PACK.id]: 5 }));
    setEstados(s => ({ ...s, [PACK.id]: 'Activa' }));
    setAplicadas(a => (a.includes('presu') ? a : [...a, 'presu']));
    setToast(`${PACK.nombre}: de $${antes} a $${antes + 5} por día en el panel. El servidor sigue igual: todavía no le llega el cambio`);
  };
  const deshacerSubir = () => {
    setPresuExtra(s => { const n = { ...s }; delete n[PACK.id]; return n; });
    setEstados(s => { const n = { ...s }; delete n[PACK.id]; return n; });
    setAplicadas(a => a.filter(k => k !== 'presu'));
    setToast(`${PACK.nombre} queda como estaba en el panel: $${presuBase(PACK)} por día`);
  };

  /** Recomendación 2: marcar en pausa la que va abajo del promedio. No le manda nada al servidor. */
  const aplicarPausar = () => {
    setEstados(s => ({ ...s, [MARCA.id]: 'En pausa' }));
    setAplicadas(a => (a.includes('pausar') ? a : [...a, 'pausar']));
    setToast(`${MARCA.nombre}: marcada en pausa en el panel. El servidor sigue igual hasta que le llegue el cambio`);
  };
  const deshacerPausar = () => {
    setEstados(s => { const n = { ...s }; delete n[MARCA.id]; return n; });
    setAplicadas(a => a.filter(k => k !== 'pausar'));
    setToast(`${MARCA.nombre} queda activa en el panel, como estaba`);
  };

  /** Recomendación 3: marcar 3 variantes del mismo mensaje para rotar el creativo. Nada se escribe acá. */
  const aplicarVariantes = () => {
    setAplicadas(a => (a.includes('variantes') ? a : [...a, 'variantes']));
    setToast(`Marcado: 3 variantes de ${PACK.nombre} por ${3 * TARIFA.crearVariante} créditos. Pedírselas al motor todavía no sale de esta pantalla`);
  };
  const deshacerVariantes = () => {
    setAplicadas(a => a.filter(k => k !== 'variantes'));
    setToast('Se quitó la marca: no se escribió ninguna variante y no se gastó ningún crédito');
  };

  /** El techo del mes: qué manda hoy el servidor y qué todavía no llega. No se cambia desde acá. */
  const cambiarTecho = () => detalle({
    titulo: 'El techo del mes',
    sub: 'El techo es el freno de gasto del mes: el motor no lo pasa sin su permiso. El servidor todavía no manda el techo en la ficha, así que acá va en «—» y no se cambia desde esta pantalla.',
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Techo de este mes', v: '— todavía no llega', s: 'el servidor todavía no manda el techo del mes' },
        { k: 'Invertido hasta hoy', v: `$${numeroConMiles(invertido)}`, s: 'lo gastado por sus campañas, tal como está en el servidor' },
        { k: 'Le queda', v: '— todavía no llega', s: 'sin el techo no se puede calcular' },
        { k: 'Cierre proyectado', v: '— todavía no llega', s: 'el servidor todavía no lo proyecta' },
        { k: 'Días que quedan', v: String(diasQueQuedan), s: 'hasta el cierre del mes' },
        { k: 'Campañas que lo comparten', v: String(fuente.length), s: `$${numeroConMiles(diario)} por día entre todas` },
      ] },
      { tipo: 'texto', texto: `Cada campaña tiene su presupuesto por día y el motor los reparte según lo que rinde: hoy son $${numeroConMiles(diario)} por día entre las ${fuente.length}.` },
      { tipo: 'aviso', tono: 'amber', texto: techoAviso },
    ],
    fuente: 'Lo invertido sale de lo gastado por sus campañas en el servidor. El techo del mes y el cierre proyectado todavía no llegan del back: por eso van en «—».',
    acciones: [
      { label: 'Entendido', variante: 'primary', onClick: () => setToast('El techo del mes todavía no llega del servidor: lo que se ve acá es lo que sí llegó') },
    ],
  });

  /** En qué se va cada peso del día, campaña por campaña, con lo que cada una devuelve. */
  const verDetalleGasto = () => detalle({
    titulo: 'En qué se va cada peso del día',
    sub: `Son $${diario} por día repartidos entre sus ${fuente.length} campañas. El reparto no es fijo: el motor lo mueve todos los días hacia la que mejor devuelve.`,
    bloques: [
      { tipo: 'filas', items: campanas.map(c => ({
        t: c.nombre,
        s: `${c.estado === 'Activa' ? 'corriendo' : c.estado.toLowerCase()} · ${c.roas === '—' ? 'todavía sin datos de retorno' : `devuelve ${c.roas}`}`,
        etiqueta: `$${presuDia(c)}/día`,
        tono: c.estado === 'Activa' ? 'green' : 'muted',
      })) },
      { tipo: 'datos', filas: [
        { k: 'Total por día', v: `$${numeroConMiles(diario)}`, s: 'lo que sale por día con sus campañas así' },
        { k: 'Por semana', v: `$${numeroConMiles(diario * 7)}`, s: '7 días al mismo ritmo' },
        { k: 'Por mes', v: `$${numeroConMiles(diario * 30)}`, s: '30 días al mismo ritmo' },
        { k: 'La que más rinde', v: `${PACK.nombre} · ${PACK.roas}`, tono: 'green', s: roasMes === '—'
          ? 'todavía sin promedio de retorno entre sus campañas'
          : `${roasMes} es el promedio de sus campañas` },
        ...(MARCA.id !== PACK.id
          ? [{ k: 'La que menos rinde', v: `${MARCA.nombre} · ${MARCA.roas}`, tono: 'amber' as const, s: 'por eso encabeza las acciones de abajo' }]
          : []),
      ] },
      { tipo: 'aviso', texto: 'El reparto sale de los presupuestos que el servidor tiene cargados, campaña por campaña. El techo del mes todavía no llega: cuando llegue, manda sobre todas.' },
    ],
    fuente: 'Los presupuestos que tiene asignados hoy, campaña por campaña.',
  });

  /** La pieza que no llegó al mínimo: se muestra qué objetó cada juez, con su voto guardado en MiroFish. */
  const corregirPieza = () => detalle({
    titulo: `Lo que hay que corregir en «${pieza?.titulo ?? 'esta pieza'}»`,
    sub: `Los ${nJueces} jueces le dieron ${scorePieza}: abajo de 80 no se gasta un peso. Aquí está lo que objetó cada uno, como quedó guardado en MiroFish.`,
    bloques: [
      { tipo: 'filas', items: objecionesPieza.map(o => ({
        t: o.juez,
        s: `«${o.texto}»`,
        etiqueta: `${o.voto} de 100`,
        tono: o.voto < 60 ? 'red' : 'amber',
      })) },
      { tipo: 'datos', filas: [
        { k: 'Qué hay que cambiar', v: 'la objeción, nada más', s: 'mismo formato, mismo producto y mismo público' },
        { k: 'Quién la volvería a juzgar', v: `${nJueces} jueces + 500 del público`, s: 'al público no se le cobra nunca' },
        { k: 'Lo que costaría', v: `${TARIFA.crearVariante + TARIFA.evaluarPieza} créditos`, s: `1 variante (${TARIFA.crearVariante}) + volver a juzgarla (${TARIFA.evaluarPieza})` },
        { k: 'Créditos que tiene', v: d.creditos ? String(d.creditos.saldo) : '— todavía no llegan del servidor', s: d.creditos ? 'el saldo que trae el servidor' : 'el servidor todavía no manda el saldo' },
      ] },
      { tipo: 'aviso', texto: 'La versión de ahora no se pierde: queda guardada con el voto de cada juez. Pedirle la corrección al motor es un paso aparte, y todavía no sale desde esta pantalla.' },
    ],
    fuente: 'Las objeciones salen del voto de cada juez en MiroFish, sobre esta pieza.',
    acciones: [
      { label: 'Marcar para corrección', variante: 'primary', onClick: () => {
        setCorregidas(p => (p.includes(pieza?.id ?? '') ? p : [...p, pieza?.id ?? '']));
        setToast(`«${pieza?.titulo ?? 'la pieza'}» quedó marcada para corrección: todavía no se le pidió nada al motor`);
      } },
      { label: 'Dejarla como está', onClick: () => setToast('Sin cambios: la pieza queda como está') },
    ],
  });


  /**
   * Crea la campaña en el back y la deja en borrador: queda en la lista del negocio, sin salir a sus
   * redes y sin gastar un peso. Si el back no responde, lo que escribió no se pierde y la pantalla lo dice.
   */
  const crearCampana = async () => {
    const nombre = borradorNuevo.nombre.trim();
    if (!nombre) { setToast('Póngale un nombre a la campaña: con ese nombre la reconoce después en la lista'); return; }
    setCreando(true); setErrorCrear('');
    try {
      const r = await fetch(baseApi() + '/api/campanas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
        body: JSON.stringify({
          nombre,
          forma: borradorNuevo.forma,
          presupuesto: Number(borradorNuevo.presupuesto) || 0,
          destinos: borradorNuevo.destinos.split(',').map(x => x.trim()).filter(Boolean),
          objetivo: borradorNuevo.objetivo.trim(),
        }),
      });
      if (!r.ok) throw new Error(`error ${r.status}`);
      await d.refrescar();
      setNueva(false);
      setBorradorNuevo({ nombre: '', forma: 'ventas', presupuesto: '20', destinos: 'Instagram', objetivo: '' });
      setToast(`«${nombre}» quedó creada en borrador: ya está en la lista y no gasta un peso hasta que la publique`);
    } catch {
      setErrorCrear('No se pudo crear la campaña en el servidor. Lo que escribió sigue aquí: vuelva a intentar cuando el back esté en línea.');
      setToast('No se pudo crear la campaña: el servidor no respondió');
    } finally { setCreando(false); }
  };

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Megaphone size={19} />}
        titulo="Campañas"
        sub="Es un flujo por etapas: usted sube lo que tiene, Sinkroo crea, MiroFish vota y usted decide mirando las piezas."
        nums={[
          { v: String(fuente.length), l: 'campañas' },
          { v: <Dinero monto={diario} />, l: 'invertido por día', c: 'var(--green)' },
          { v: roasMes, l: 'ROAS promedio de sus campañas' },
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
                  <div className="bt">Paso 1 · Dígale a Sinkroo qué quiere</div>
                  <div className="bs">Suba la información y el material. Sinkroo elige el tipo de campaña, el ángulo y el público, crea todo y lo manda a MiroFish. <b>Todo lo que suba pasa por ahí.</b></div>
                </div>
              </div>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                {!manual && (
                  primerosPasosListos ? (
                    <Button title="Lo lleva al paso 2, donde se ve el mercado trabajando con lo que su negocio tenga evaluado en MiroFish. Todavía no le pide nada al motor: para eso hay que subir el material y mandarlo a evaluar."
                      onClick={() => { setToast('El paso 2 muestra lo que su negocio tenga evaluado en MiroFish: todavía no se le pidió nada al motor'); setPaso(2); }}>
                      <I_Play size={14} /> Ir al paso 2
                    </Button>
                  ) : (
                    <Button variant="outline" title="Para avanzar, el sistema necesita la información de su negocio. Se completa en Primeros pasos: qué hace, qué vende, su material y sus redes."
                      onClick={() => { setVista('onboarding'); setToast('Complete Primeros pasos: con eso el sistema ya puede decidir solo qué publicar y qué campaña armar'); }}>
                      <I_Upload size={14} /> Completar Primeros pasos
                    </Button>
                  )
                )}
                <Button variant="outline" className="btn-sm" title={manual ? 'Volver al camino con Sinkroo' : 'Si ya tiene las imágenes o los videos hechos, súbalos y MiroFish los puntúa'}
                  onClick={() => setManual(!manual)}>
                  {manual ? <><I_Robot size={13} /> Mejor que lo haga Sinkroo</> : <><I_Upload size={13} /> Ya tengo todo listo</>}
                </Button>
              </div>
            </div>
          </Card>


          {/* ---------- LAS DECISIONES RÁPIDAS: cómo trabaja su cuenta ----------
              Es lo mismo que se contesta en Primeros pasos, pero a un toque desde acá. Arranca en
              Automático: si el negocio no eligió nada, el sistema decide y crea, y él aprueba. Cada
              decisión se guarda en el onboarding: el motor y el panel leen de ahí, no de dos sitios. */}
          <Card
            title={<span className="row" style={{ gap: 8 }}><I_Robot size={14} style={{ color: 'var(--purple3)' }} /> Cómo trabaja su cuenta</span>}
            action={<Badge tone="purple">{estatusDe('modo') === 'sin definir' ? 'Automático' : estatusDe('modo')}</Badge>}
          >
            <div className="bs" style={{ marginBottom: 12 }}>
              El motor usa esto para decidir, y se puede cambiar cuando quiera. <b>Empieza en Automático:</b> el sistema elige el tipo de publicación y de campaña, lo crea, lo prueba en MiroFish y usted solo aprueba.
            </div>
            {([
              { k: 'modo', label: 'Quién decide', ops: ['Automático', 'Compartido', 'Manual'], ayuda: 'Automático: el sistema elige y crea, y usted aprueba. Compartido: hace solo lo reversible. Manual: usted arma todo.' },
              { k: 'presupuesto', label: 'Cuánto invertir por día en campañas', ops: PRESUPUESTOS, ayuda: 'Es el techo del gasto en la red. Publicar en sus redes no toca este dinero.' },
              { k: 'canales', label: 'Dónde quiere que trabaje', ops: ['WhatsApp', 'Instagram', 'Facebook', 'TikTok'], multi: true, ayuda: 'WhatsApp cierra la conversación; las redes llevan la gente a ella.' },
              { k: 'publicaciones_semana', label: 'Cuánto quiere publicar en sus redes', ops: ['1 a 2 por semana', '3 a 5 por semana', '6 a 10 por semana', 'Que lo decida el sistema'], ayuda: 'Contenido propio, sin pauta.' },
              { k: 'contenido_diario', label: 'Publicación diaria de contenido', ops: ['Sí: mantengan mis redes activas', 'No: solo cuando haya campaña'], ayuda: 'Con «sí», el sistema propone piezas cada semana aunque no haya campaña encendida.' },
            ] as { k: string; label: string; ops: string[]; multi?: boolean; ayuda: string }[]).map(g => {
              const sel = (op: string) => {
                const v = valorDe(g.k);
                return Array.isArray(v) ? v.includes(op) : v === op;
              };
              const estatus = estatusDe(g.k);
              return (
                <div key={g.k} style={{ marginBottom: 14 }}>
                  <div className="bs" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b>{g.label}</b>
                    <Badge tone={estatus === 'sin definir' ? 'muted' : 'purple'}>{estatus}</Badge>
                  </div>
                  <div className="chip-grid" style={{ gap: 8 }}>
                    {g.ops.map(op => (
                      <span
                        key={op}
                        className={`chip${sel(op) ? ' sel' : ''}`}
                        title={`${g.ayuda} Se guarda en Primeros pasos y se puede cambiar cuando quiera.`}
                        onClick={() => decidir(g.k, g.label, op, g.multi)}
                      >{op}</span>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="acc-why">
              <b>El costo no es el mismo, y por eso van separados:</b> una <b>campaña</b> gasta su presupuesto por día en la red.
              Una <b>publicación en sus redes</b> no gasta pauta: consume los créditos del plan (producir, probar en MiroFish y medir).
              Así se ve de una si lo que quiere es campaña, contenido diario, o las dos.
            </div>
          </Card>

          {manual
            ? (
              <div style={{ marginTop: 16 }}>
                {/* EN MANUAL SÍ SE ELIGE. Es el camino del cliente que ya sabe qué quiere: acá elige qué
                    publicar, sube su material y desde acá completa lo que le falte para que el motor
                    trabaje con todo. En Automático esto no se muestra: lo decide el sistema. */}
                <Publicar setToast={setToast} modo={modo} irAConversaciones={() => setVista('conversaciones')} soloIngesta />
                <IngestaManual setToast={setToast} ir={setPaso} />
                {/* Y desde acá también se completa lo que le falte al negocio: en Manual el cliente manda. */}
                <div className="acc-why" style={{ marginTop: 14 }}>
                  <b>Para que el motor trabaje con todo:</b>{' '}
                  {primerosPasosListos
                    ? 'ya tiene su negocio, sus precios, su material y sus redes: puede publicar por su cuenta y el motor igual le prueba las piezas.'
                    : `falta ${chequeos.filter(c => !c.listo).map(c => c.t.toLowerCase()).join(', ')}.`}
                  <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <Button variant={primerosPasosListos ? 'outline' : 'primary'}
                      title="Primeros pasos: su negocio, lo que vende, su material, sus redes y cómo quiere trabajar."
                      onClick={() => { setVista('onboarding'); setToast('Primeros pasos: ahí queda completo lo que el motor necesita para trabajar con todo'); }}>
                      {primerosPasosListos ? 'Revisar Primeros pasos' : `Completar lo que falta (${chequeos.filter(c => !c.listo).length})`}
                    </Button>
                  </div>
                </div>
              </div>
            )
            : (
              <>
                {/* ==================== EN AUTOMÁTICO NO SE ELIGE NADA ====================
                    El sistema decide con el mercado y los datos del negocio; el cliente ve QUÉ decidió y
                    aprueba. Las decisiones de publicación y de campaña se contestan en Primeros pasos,
                    no acá: por eso acá solo se muestra lo que el sistema resolvió. */}
                <Card
                  className="decide"
                  title={<span className="row" style={{ gap: 8 }}><I_Robot size={14} style={{ color: 'var(--purple3)' }} /> Lo que decide el sistema</span>}
                  action={<Badge tone="purple">{estatusDe('modo') === 'sin definir' ? 'Automático' : estatusDe('modo')}</Badge>}
                >
                  {decisionTino ? (
                    <>
                      <div className="bs" style={{ marginBottom: 10 }}>
                        En Automático usted no elige: el sistema decide con su mercado y sus datos, y usted aprueba. Esto fue lo que decidió:
                      </div>
                      <div className="guards">
                        {([
                          { k: 'Qué publica', v: decisionTino.propuesta_publicacion?.tipo, s: decisionTino.propuesta_publicacion?.por_que, e: decisionTino.propuesta_publicacion?.referencia ? `Se apoya en ${decisionTino.propuesta_publicacion.referencia}` : '' },
                          { k: 'Qué campaña', v: decisionTino.propuesta_campana?.objetivo, s: decisionTino.propuesta_campana?.por_que, e: `Techo por día: ${decisionTino.propuesta_campana?.presupuesto_diario || 'sin definir'}` },
                          { k: 'Contenido en sus redes', v: decisionTino.contenido?.publicacion_diaria, s: decisionTino.contenido?.cadencia, e: lista(decisionTino.contenido?.formato_por_red).join(' · ') || String(decisionTino.contenido?.formato_por_red_nota || '') },
                          { k: 'Cuándo cambia', v: decisionTino.cuando_cambiar?.regla, s: decisionTino.cuando_cambiar?.sin_las_cuentas, e: decisionTino.cuando_cambiar?.base_medida || '' },
                        ] as { k: string; v?: string; s?: string; e?: string }[]).filter(x => x.v).map(x => (
                          <div key={x.k} className="guard">
                            <span className="guard-lb">{x.k}<small>{x.v}</small>{x.s ? <small>{x.s}</small> : null}{x.e ? <small>{x.e}</small> : null}</span>
                          </div>
                        ))}
                      </div>
                      {((decisionTino.falta || []) as string[]).length > 0 && (
                        <div className="acc-why"><b>Para que decida con todo:</b> {lista(decisionTino.falta).join(' · ')}</div>
                      )}
                    </>
                  ) : (
                    <EstadoVacio
                      titulo="Todavía no hay una decisión que mostrar"
                      texto="El sistema decide cuando tiene su mercado leído y sus datos. Corre la investigación cada mañana, y se puede adelantar desde el paso 2 con el material cargado."
                      accion="Ver el mercado investigado"
                      onAccion={() => setVista('mercado')}
                    />
                  )}
                </Card>

                {/* ==================== LO QUE HACE FALTA PARA QUE PUEDA DECIDIR SOLO ==================== */}
                <Card
                  title={<span className="row" style={{ gap: 8 }}><I_Upload size={14} style={{ color: 'var(--purple3)' }} /> Con esto el sistema trabaja solo</span>}
                  action={<Badge tone={primerosPasosListos ? 'green' : 'amber'}>{primerosPasosListos ? 'completo' : `${chequeos.filter(c => !c.listo).length} por completar`}</Badge>}
                >
                  <div className="bs" style={{ marginBottom: 10 }}>
                    El sistema decide solo cuando tiene el mercado, sus redes y su modelo de negocio. Eso se completa en <b>Primeros pasos</b>, no acá: por eso no le pedimos que elija nada.
                  </div>
                  <div className="guards">
                    {chequeos.map(c => (
                      <div key={c.t} className="guard">
                        <span className="guard-lb">{c.t}</span>
                        <span className="guard-val" style={{ color: c.listo ? 'var(--green)' : 'var(--amber)' }}>{c.listo ? 'listo' : 'falta'}</span>
                      </div>
                    ))}
                  </div>
                  <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <Button variant={primerosPasosListos ? 'outline' : 'primary'}
                      title="Primeros pasos: su negocio, lo que vende, su material, sus redes y las decisiones de cómo quiere trabajar."
                      onClick={() => { setVista('onboarding'); setToast('Primeros pasos: con eso el sistema ya puede decidir solo qué publicar y qué campaña armar'); }}>
                      {primerosPasosListos ? 'Revisar Primeros pasos' : 'Completar Primeros pasos'}
                    </Button>
                    <Button disabled={!primerosPasosListos}
                      title={primerosPasosListos ? 'Pasa al paso 2: el mercado y MiroFish trabajando con lo que su negocio tiene.' : 'Para avanzar falta completar Primeros pasos: el sistema necesita esa información para trabajar solo.'}
                      onClick={() => { if (primerosPasosListos) { setPaso(2); setToast('Paso 2: el mercado y MiroFish con lo que su negocio tiene'); } else { setToast('Falta completar Primeros pasos para que el sistema pueda trabajar solo'); } }}>
                      <I_Play size={14} /> Pasar al paso 2
                    </Button>
                  </div>
                </Card>

                {/* ==================== LA PIEZA, ESCRITA: LO QUE SE PUBLICA ====================
                    Todo lo de acá sale del servidor: el texto del motor y lo que lo sostiene (el ángulo que
                    ningún comparable usa, el arte medido en su propia web). Lo que no se pudo medir se dice. */}
                {piezaLista ? (
                  <>
                  <div className="duo" style={{ marginTop: 16 }}>
                    <Card
                      title={<span className="row" style={{ gap: 8 }}><I_File size={14} style={{ color: 'var(--purple3)' }} /> La pieza, lista para publicar</span>}
                      action={<Badge tone="purple">{piezaLista.formato}</Badge>}
                    >
                      <div className="bs" style={{ marginBottom: 10 }}>
                        Escrita con su material, no con el de otros: esto es lo que se publica. Cópielo y publíquelo en su red — el sistema todavía no publica por usted.
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.7, borderLeft: '3px solid var(--purple2)', paddingLeft: 12, marginBottom: 12 }}>
                        {piezaLista.texto || 'la pieza quedó sin texto: su material no alcanzó para armarlo'}
                      </div>
                      {(piezaDet.partes || []).length > 0 && (
                        <div className="guards" style={{ marginBottom: 12 }}>
                          {(piezaDet.partes as { k: string; v: string }[]).map(p => (
                            <div key={p.k} className="guard">
                              <span className="guard-lb">{p.k}<small>{p.v || 'sin material para esta parte'}</small></span>
                            </div>
                          ))}
                        </div>
                      )}
                      {piezaLista.guion ? (
                        <div className="bs" style={{ whiteSpace: 'pre-wrap', marginBottom: 12 }}>
                          <b>El guion, escena por escena</b>{'\n'}{piezaLista.guion}
                        </div>
                      ) : null}
                      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                        <Button variant="primary" title="Copia el texto de la pieza para pegarlo en su red" onClick={() => copiarPieza(piezaLista.texto || '', 'el texto')}>
                          Copiar el texto
                        </Button>
                        {piezaLista.guion ? (
                          <Button variant="outline" title="Copia el guion, escena por escena, para grabarlo" onClick={() => copiarPieza(piezaLista.guion || '', 'el guion')}>
                            Copiar el guion
                          </Button>
                        ) : null}
                      </div>
                    </Card>

                    <Card
                      title={<span className="row" style={{ gap: 8 }}><I_Trend size={14} style={{ color: 'var(--purple3)' }} /> Con qué sale esta pieza</span>}
                      action={<Badge tone={piezaDet.angulo_que_ninguno_usa?.que ? 'green' : 'muted'}>{piezaDet.angulo_que_ninguno_usa?.que ? 'con ángulo medido' : 'sin mercado medido'}</Badge>}
                    >
                      <div className="guards">
                        {([
                          { k: 'El ángulo que ninguno usa', v: piezaDet.angulo_que_ninguno_usa?.que ? String(piezaDet.angulo_que_ninguno_usa.que).replace(/^de /, '') : 'todavía no hay hueco medido: falta la lectura de su mercado', s: piezaDet.angulo_que_ninguno_usa?.como },
                          { k: 'En qué lengua sale', v: `el texto está en ${piezaDet.lengua_del_texto || 'sin medir'}`, s: `su mercado anuncia en ${piezaDet.lengua_del_mercado || 'sin medir'}: traducir la pieza es trabajo del escritor, no se inventa` },
                          { k: 'Contra qué se mide', v: piezaDet.referencia_del_mercado?.anunciante ? `${piezaDet.referencia_del_mercado.anunciante} — ${piezaDet.referencia_del_mercado.dias} días con el mismo anuncio` : 'sin comparables leídos', s: piezaDet.referencia_del_mercado?.dice ? `dice: «${String(piezaDet.referencia_del_mercado.dice).slice(0, 120)}»` : '' },
                          { k: 'Dónde va', v: (piezaDet.donde_va || []).length ? (piezaDet.donde_va as string[]).join(' · ') : 'sin redes declaradas', s: piezaDet.boton ? `cierra con: ${piezaDet.boton}` : '' },
                        ] as { k: string; v?: string; s?: string }[]).filter(x => x.v).map(x => (
                          <div key={x.k} className="guard">
                            <span className="guard-lb">{x.k}<small>{x.v}</small>{x.s ? <small>{x.s}</small> : null}</span>
                          </div>
                        ))}
                      </div>

                      {piezaDet.arte?.colores?.length ? (
                        <>
                          <div className="bs" style={{ margin: '12px 0 8px' }}>
                            <b>El arte, medido en su propia web:</b> estos colores y esta tipografía son los que su web ya usa. La pieza sale con su cara, no con una prestada.
                          </div>
                          <div className="duo" style={{ gap: 8 }}>
                            {(piezaDet.arte.colores as { hex: string; veces: number; rol: string }[]).slice(0, 4).map(c => (
                              <div key={c.hex} className="swatch" title={`${c.hex}: aparece ${c.veces} veces en el CSS de su web`}>
                                <span className="swatch-color" style={{ background: c.hex }} />
                                <span><span className="swatch-n">{c.rol || 'color'}</span><span className="swatch-hex">{c.hex} · {c.veces} usos</span></span>
                              </div>
                            ))}
                          </div>
                          {(piezaDet.arte.tipografias || []).length > 0 && (
                            <div className="tiny muted" style={{ marginTop: 8 }}>
                              Tipografía: {(piezaDet.arte.tipografias as { familia: string; tamano: string }[]).map(x => `${x.familia}${x.tamano ? ` (${x.tamano})` : ''}`).join(' · ')}
                              {(piezaDet.arte.imagenes_reales || []).length > 0 ? ` · ${(piezaDet.arte.imagenes_reales as string[]).length} imágenes suyas para usar` : ''}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="bs" style={{ marginTop: 12 }}>{piezaDet.arte?.sin_fuente || 'sin identidad medida: no hay una web legible que leer'}</div>
                      )}

                      {piezaDet.aviso_del_cuerpo ? (
                        <div className="acc-why" style={{ marginTop: 12 }}><b>Falta material:</b> {piezaDet.aviso_del_cuerpo}</div>
                      ) : null}
                      {piezaDet.aviso_de_material ? (
                        <div className="acc-why" style={{ marginTop: 8 }}><b>Ojo con el material:</b> {piezaDet.aviso_de_material}</div>
                      ) : null}
                      {(piezaDet.lo_que_falta || []).length > 0 && (
                        <div className="tiny muted" style={{ marginTop: 10 }}>
                          Lo que todavía no se puede poner: {(piezaDet.lo_que_falta as string[]).join(' · ')}
                        </div>
                      )}
                    </Card>
                  </div>

                  {/* ==================== EL VEREDICTO SOBRE LA PIEZA ====================
                      El número que el dueño no tenía: la pieza pasa por los 5 jueces y los 500 del público
                      antes de que gaste un peso. Todo sale del back (la evaluación guardada de ESTA pieza):
                      los votos, lo que hizo el público, sus comentarios y el desvío de la predicción. */}
                  {veredictoPieza.cargando ? (
                    <Card title={<span className="row" style={{ gap: 8 }}><I_Vote size={14} style={{ color: 'var(--purple3)' }} /> El veredicto sobre esta pieza</span>}>
                      <div className="bs">Trayendo del servidor la prueba de esta pieza: los 5 jueces y los 500 del público…</div>
                    </Card>
                  ) : veredictoPieza.dato ? (
                    (() => {
                      const v = veredictoPieza.dato!;
                      const puntaje = numONulo(v.evaluacion.puntaje);
                      const total = v.reacciones.reduce((s, r) => s + r.n, 0);
                      const mejor = [...v.votos].sort((a, b) => b.voto - a.voto)[0];
                      const peor = [...v.votos].sort((a, b) => a.voto - b.voto)[0];
                      return (
                        <Card
                          title={<span className="row" style={{ gap: 8 }}><I_Vote size={14} style={{ color: 'var(--purple3)' }} /> El veredicto sobre esta pieza</span>}
                          action={<Badge tone={puntaje !== null && puntaje >= 70 ? 'green' : puntaje !== null && puntaje >= 55 ? 'amber' : 'muted'}>
                            {puntaje !== null ? `${puntaje} de 100 · puesto ${v.evaluacion.orden ?? '—'}` : 'sin puntaje'}
                          </Badge>}
                        >
                          <div className="bs" style={{ marginBottom: 10 }}>
                            La probaron los 5 jueces y los {v.evaluacion.total_publico ?? 500} del público el {fechaCorta(v.evaluacion.created_at)}. El puntaje mezcla los jueces (60%) y lo que haría el público (40%): esto es lo que va a pasar antes de que gaste un peso.
                          </div>

                          <div className="duo">
                            <div>
                              <div className="bs" style={{ marginBottom: 8 }}><b>Los cinco jueces</b></div>
                              <div className="guards">
                                {v.votos.map(j => (
                                  <div key={j.juez} className="guard">
                                    <span className="guard-lb">{j.juez}
                                      <small>{j.opinion}</small>
                                    </span>
                                    <span className="guard-val" style={{ color: j.voto >= 70 ? 'var(--green)' : j.voto >= 55 ? 'var(--amber)' : 'var(--red)', fontWeight: 800 }}>{j.voto}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="bs" style={{ marginBottom: 8 }}><b>Lo que hizo el público</b></div>
                              <div className="guards">
                                {v.reacciones.map(r => (
                                  <div key={r.reaccion} className="guard">
                                    <span className="guard-lb">
                                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: colorReaccion(r.reaccion), marginRight: 7 }} />
                                      {etiquetaReaccion(r.reaccion)}
                                    </span>
                                    <span className="guard-val">{r.n}{total ? ` · ${Math.round((r.n / total) * 100)}%` : ''}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {(v.opiniones || []).length > 0 && (
                            <>
                              <div className="bs" style={{ margin: '12px 0 8px' }}><b>Lo que dijeron, con sus palabras</b></div>
                              <div className="guards">
                                {v.opiniones.slice(0, 3).map(o => (
                                  <div key={o.agente_numero} className="guard">
                                    <span className="guard-lb">Del público #{o.agente_numero} — {etiquetaReaccion(o.reaccion)}
                                      <small>«{o.comentario}»</small>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}

                          <div className="tiny muted" style={{ marginTop: 10 }}>
                            {v.prediccion
                              ? `El modelo predijo ${v.prediccion.predicho} y el público dio ${v.prediccion.observado}: desvío de ${v.prediccion.desvio_pct ?? '—'}%. `
                              : 'Todavía no hay predicción guardada de esta pieza. '}
                            {mejor && peor ? `Lo que más sostiene la pieza: ${mejor.juez} (${mejor.voto}). Lo que hay que reescribir: ${peor.juez} (${peor.voto}).` : ''}
                          </div>
                        </Card>
                      );
                    })()
                  ) : (
                    <Card
                      title={<span className="row" style={{ gap: 8 }}><I_Vote size={14} style={{ color: 'var(--purple3)' }} /> El veredicto sobre esta pieza</span>}
                      action={<Badge tone="amber">sin probar</Badge>}
                    >
                      <div className="bs" style={{ marginBottom: 10 }}>
                        Esta pieza todavía no pasó por MiroFish. Probarla cuesta 48 créditos: la ven los 5 jueces y los 500 del público de su negocio, y de ahí sale su puntaje, su puesto y lo que el modelo espera que pase. Se prueba una sola vez.
                      </div>
                      <Button variant="primary" disabled={probando} title="Pasa esta pieza por los 5 jueces y los 500 del público. Cuesta 48 créditos y se prueba una sola vez."
                        onClick={pasarPorMiroFish}>
                        {probando ? 'Probando con los 500…' : 'Pasar por MiroFish (48 créditos)'}
                      </Button>
                    </Card>
                  )}
                  </>
                ) : (
                  <EstadoVacio
                    titulo="Todavía no hay una pieza escrita"
                    texto="El motor la escribe al final de cada corrida, con el material que usted subió: queda acá con su texto, su formato y el arte medido de su web."
                    icono={<I_File size={22} />}
                  />
                )}
              </>
            )}
        </>
      )}

      {paso === 2 && (
        <>
          <div className="csec" style={{ marginTop: 16 }}>
            <span className="csec-n">2</span>
            <span className="csec-t">MiroFish</span>
            <span className="csec-c purple">{'5 jueces · 500 del público'}</span>
            <span className="csec-s">Todo lo que suba cae aquí: el mercado lo mira, vota y lo ordena del 1 al 5</span>
          </div>
          <MotorEnVivo setToast={setToast} ir={setPaso} />
          <FlujoMiroFish modo={modo} setToast={setToast} esAnuncio ir={setPaso} />
        </>
      )}

      {paso === 3 && <Galeria modo={modo} setToast={setToast} ir={setPaso} />}

      {paso === 4 && <EnLinea setToast={setToast} ir={setPaso} />}

      {paso === 5 && (<>
      <div className="csec" style={{ marginTop: 0 }}>
        <span className="csec-n">5</span>
        <span className="csec-t">Sus campañas y el panel</span>
        <span className="csec-s">Primero lo que está corriendo ahora, después los gráficos del mes y al final el veredicto de la última pieza</span>
        {/* La campaña se crea de verdad: nace en el back, en borrador. Sin servidor con sesión no hay
            a quién mandársela, así que el botón no está y la pantalla queda en su estado vacío. */}
        {d.real && (
          <Button variant="outline" className="btn-sm csec-act" onClick={() => setNueva(n => !n)}
            title="Crea una campaña nueva en el servidor y la deja en borrador: aparece en esta pantalla y no sale a sus redes ni gasta un peso hasta que usted la publique.">
            <I_Plus size={13} /> {nueva ? 'Cancelar' : 'Nueva campaña'}
          </Button>
        )}
      </div>

      {nueva && d.real && (
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Plus size={14} style={{ color: 'var(--purple3)' }} /> Nueva campaña</span>}
          action={<Badge tone="muted">queda en borrador</Badge>}
        >
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <input className="input" style={{ flex: '2 1 220px', minWidth: 0 }} placeholder="Nombre: «Mi campaña de septiembre»"
              value={borradorNuevo.nombre} onChange={e => setBorradorNuevo({ ...borradorNuevo, nombre: e.target.value })} />
            <select className="input" style={{ flex: '1 1 150px', minWidth: 0 }} value={borradorNuevo.forma}
              title="El tipo de campaña: es la forma con la que el motor la arma y la que después se lee en la fila."
              onChange={e => setBorradorNuevo({ ...borradorNuevo, forma: e.target.value })}>
              <option value="ventas">Ventas</option>
              <option value="mensajes">Mensajes (WhatsApp)</option>
              <option value="marca">Marca</option>
              <option value="retargeting">Retargeting</option>
              <option value="lanzamiento">Lanzamiento</option>
            </select>
            <input className="input" style={{ flex: '1 1 130px', minWidth: 0 }} inputMode="numeric" placeholder="Por día: 20"
              value={borradorNuevo.presupuesto} onChange={e => setBorradorNuevo({ ...borradorNuevo, presupuesto: e.target.value })} />
          </div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap', marginTop: 9 }}>
            <input className="input" style={{ flex: '1 1 220px', minWidth: 0 }} placeholder="Dónde sale: Instagram, Facebook…"
              value={borradorNuevo.destinos} onChange={e => setBorradorNuevo({ ...borradorNuevo, destinos: e.target.value })} />
            <input className="input" style={{ flex: '2 1 260px', minWidth: 0 }} placeholder="Qué quiere lograr con esta campaña"
              value={borradorNuevo.objetivo} onChange={e => setBorradorNuevo({ ...borradorNuevo, objetivo: e.target.value })} />
          </div>
          <div className="row" style={{ gap: 9, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button className="btn-sm" disabled={creando} onClick={crearCampana}
              title="Crea la campaña en el servidor y la deja en borrador. No gasta nada: el gasto arranca el día que usted la publique.">
              <I_Check size={13} /> {creando ? 'Creando…' : 'Crear la campaña'}
            </Button>
            <Button variant="ghost" className="btn-sm" onClick={() => setNueva(false)}
              title="Cierra el formulario sin crear nada: lo que escribió no llega al servidor.">Cancelar</Button>
            <span className="tiny muted">Queda en borrador: no sale a sus redes ni gasta hasta que usted la publique.</span>
          </div>
          {errorCrear && <div className="tiny" style={{ marginTop: 9, color: 'var(--red)', fontWeight: 700 }}>{errorCrear}</div>}
        </Card>
      )}


      {d.cargando && fuente.length === 0 ? (
        /* El panel está trayendo lo que hay en el servidor: todavía no se sabe si hay campañas o no, así
           que no se muestra ni el estado vacío ni una campaña de ejemplo. */
        <EstadoVacio
          titulo="Leyendo sus campañas…"
          texto="Un segundo: el panel está trayendo del servidor lo que este negocio tiene creado, con sus presupuestos y sus destinos."
          icono={<I_Megaphone size={22} />}
        />
      ) : sinNada ? (
        /* Un negocio conectado que todavía no tiene campañas: aquí no va ni una campaña de ejemplo.
           Dice qué hacer para tener la primera, que es lo único que le sirve al dueño. */
        <EstadoVacio
          titulo="Todavía no hay campañas"
          texto="El motor arma la primera cuando usted sube el material: elige el tipo de campaña, el ángulo y el público, crea las piezas y las pasa por los 5 jueces antes de gastar un peso. Empiece por Primeros pasos y en la próxima corrida aparece aquí, con su presupuesto y sus destinos."
          accion="Ir a Primeros pasos" onAccion={() => setVista('onboarding')}
          icono={<I_Megaphone size={22} />}
        />
      ) : (
      <>
      {/* ============ 1. LAS QUE ESTÁN EN VIVO — la pieza, el texto del anuncio y el resultado ============ */}
      <div className="csec" style={{ marginTop: 6 }}>
        <span className="csec-n">1</span>
        <span className="csec-t">Sus campañas en vivo</span>
        <span className="csec-c purple">{vivas.length} corriendo</span>
        <span className="csec-s">Cada tarjeta muestra la pieza que se está viendo, el texto del anuncio y cómo está rindiendo</span>
      </div>
      <div className="cv-grid">
        {vivas.map(c => <CampanaViva key={c.id} c={c} setToast={setToast} />)}
      </div>
      {vivas.length === 0 && (
        <div className="bs">
          Todavía no hay ninguna campaña corriendo: las de abajo están en borrador o en pausa.
          <b> Marcar una campaña como activa es una marca en este panel</b>: el sistema todavía no publica
          en sus redes, y ninguna arranca sola.
        </div>
      )}
      {/* Un negocio conectado que todavía no tiene piezas: la tarjeta en vivo no tiene nada que mostrar,
          así que en vez de rellenarla con una pieza de ejemplo se dice qué hacer para tener la primera. */}
      {d.piezas.length === 0 && (
        <EstadoVacio
          titulo="Todavía no hay piezas para mostrar"
          texto="La tarjeta de arriba muestra la pieza que está viendo su público, su texto y cómo rinde. Aparece cuando el motor cree la primera: súbale el material en el paso 1 y MiroFish la puntúa antes de que gaste un peso."
          accion="Ir al paso 1" onAccion={() => setPaso(1)}
          icono={<I_File size={22} />}
        />
      )}

      {/* ============ 2. LAS QUE NO ESTÁN CORRIENDO — en fila compacta, sin ocupar media pantalla ============ */}
      <div className="csec">
        <span className="csec-n">2</span>
        <span className="csec-t">Las que no están corriendo</span>
        <span className="csec-c amber">{otras.length} sin correr</span>
        <span className="csec-s">No gastan nada y no pierden el historial: las reactiva cuando quiera</span>
      </div>

      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Pause size={14} style={{ color: 'var(--amber)' }} /> El resto de sus campañas</span>}
        action={<Badge tone="muted">{otras.length} esperando</Badge>}
      >
        {aviso && (
          <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, fontWeight: 700, color: aviso.tono === 'green' ? 'var(--green)' : 'var(--amber)' }}>
            <I_Check size={13} /> {aviso.t}
          </div>
        )}
        {otras.length === 0 && (
          <div className="bs">No quedó ninguna esperando: sus {fuente.length} campañas están corriendo y comparten el techo del mes.</div>
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
              <span className="dato" title="Lo que le paga a Meta por día cuando la campaña corre">
                <span className="dato-l">Presupuesto</span>
                <span className="dato-v"><Dinero monto={c.presupuesto} /></span>
              </span>
              <span className="dato" title="Piezas que el motor ya creó para esta campaña">
                <span className="dato-l">Piezas</span>
                <span className="dato-v" style={{ color: 'var(--purple3)' }}>{c.artefactos}</span>
              </span>
              <span className="dato" title="Lo que lleva gastado la campaña desde que arrancó">
                <span className="dato-l">Gastado</span>
                <span className="dato-v"><Dinero monto={c.gastado} /></span>
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
          <b> Los borradores no salen solos</b>: publicar siempre necesita su OK, aunque el modo esté en Automático.
        </div>
      </Card>

      {/* ============ 3. LOS GRÁFICOS — cómo va el mes y qué conviene hacer ============ */}
      <div className="csec">
        <span className="csec-n">3</span>
        <span className="csec-t">Cómo va el mes y qué conviene hacer</span>
        <span className="csec-s">Cuánto dinero tiene y en qué le conviene invertirlo</span>
      </div>
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--amber)' }} /> Su presupuesto del mes</span>}
          action={<Badge tone="muted">lo que manda el servidor</Badge>}
        >
          {/* Lo invertido y lo gastado son los del servidor; el techo del mes y el cierre proyectado
              —que el back todavía no manda— van en «—» con la línea que lo explica. */}
          <div className="datos-row">
            <div className="dato" title="Lo que sus campañas llevan gastado, tal como está en el servidor">
              <span className="dato-l">Invertido hasta hoy</span>
              <span className="dato-v"><Dinero monto={invertido} /></span>
            </div>
            <div className="dato" title="Lo que sale por día con los presupuestos que tiene cargados">
              <span className="dato-l">Presupuesto por día</span>
              <span className="dato-v" style={{ color: 'var(--green)' }}><Dinero monto={diario} /></span>
            </div>
            <div className="dato" title="Los días que le quedan al mes, contados desde hoy">
              <span className="dato-l">Días que quedan</span>
              <span className="dato-v">{diasQueQuedan}</span>
            </div>
          </div>
          <div>
            <div className="bs" style={{ marginBottom: 8 }}>Lo gastado, campaña por campaña:</div>
            {gastadoPorCampana.some(v => v > 0)
              ? <Bars data={gastadoPorCampana} labels={gastoLb} color="#a855f7" fmt={v => <Dinero monto={v} equivalente={false} />} />
              : <div className="bs">Todavía no hay gasto registrado en ninguna campaña: cuando el servidor lo registre, aquí se ve el reparto.</div>}
          </div>
          <div className="datos-row" style={{ paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato" title="El techo del mes todavía no llega en la lectura del servidor">
              <span className="dato-l">Techo del mes</span>
              <span className="dato-v" style={{ color: 'var(--muted)' }}>—</span>
            </div>
            <div className="dato" title="El cierre proyectado todavía no llega en la lectura del servidor">
              <span className="dato-l">Cierre proyectado</span>
              <span className="dato-v" style={{ color: 'var(--muted)' }}>—</span>
            </div>
            <div className="dato" title="Las campañas que comparten ese presupuesto">
              <span className="dato-l">Campañas</span>
              <span className="dato-v">{fuente.length}</span>
            </div>
          </div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button variant="ghost" className="btn-sm" title="Muestra en qué se va cada peso del día, campaña por campaña, y cuánto devuelve cada una"
              onClick={verDetalleGasto}>Ver el detalle</Button>
            <Button variant="ghost" className="btn-sm" title="Muestra lo que el servidor manda hoy del techo del mes. El techo todavía no llega en la ficha, así que va en «—» y no se cambia desde esta pantalla."
              onClick={cambiarTecho}>Qué falta del techo</Button>
          </div>
          <div className="acc-why">{techoAviso}</div>
          <NotaMoneda />
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--green)' }} /> Qué conviene hacer ahora</span>}
          action={<Badge tone="amber">{aplicadas.length === 0 ? '3 marcas' : `${aplicadas.length} de 3 marcadas`}</Badge>}
        >
          <div className="guards">
            <div className="guard">
              <span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Trend size={14} /></span>
              <span className="guard-lb">Subirle $5 por día a {PACK.nombre}
                <small>{`Es la que mejor devuelve de sus campañas${PACK.roas === '—' ? ' (todavía sin dato de retorno)' : ` (${PACK.roas})`} y gasta $${presuBase(PACK)} por día.`}</small>
                {aplicadas.includes('presu') && (
                  <small style={{ color: 'var(--green)', fontWeight: 700 }}>
                    {`Marcado: quedó en $${presuBase(PACK) + 5} por día (era $${presuBase(PACK)}). Es una marca suya en el panel: el cambio todavía no llega al servidor.`}
                  </small>
                )}
              </span>
              {aplicadas.includes('presu') ? (
                <Button variant="ghost" className="btn-sm" title={`Deshace el aumento: vuelve a los $${presuBase(PACK)} por día. No se pierde nada del historial.`}
                  onClick={deshacerSubir}><I_Refresh size={12} /> Deshacer</Button>
              ) : (
                <Button className="btn-sm" title={`Sube el presupuesto de ${PACK.nombre} de $${presuBase(PACK)} a $${presuBase(PACK) + 5} por día. Es una marca en el panel y es reversible: con Deshacer vuelve como estaba.`}
                  onClick={aplicarSubir}>+<Dinero monto={5} equivalente={false} />/día</Button>
              )}
            </div>
            {MARCA.id !== PACK.id && (
              <div className="guard">
                <span style={{ color: 'var(--red)', flexShrink: 0 }}><I_Zap size={14} /></span>
                <span className="guard-lb">Pausar {MARCA.nombre}
                  <small>{`Gasta $${presuBase(MARCA)} por día y devuelve ${MARCA.roas === '—' ? 'todavía sin dato de retorno' : MARCA.roas}: ese dinero rinde más en la que devuelve ${PACK.roas}.`}</small>
                  {aplicadas.includes('pausar') && (
                    <small style={{ color: 'var(--green)', fontWeight: 700 }}>
                      {`Marcado: quedaría en pausa. Deja de gastar $${presuBase(MARCA)} por día y sus ${MARCA.artefactos} piezas y su historial quedan intactos. La pausa todavía no llega al servidor.`}
                    </small>
                  )}
                </span>
                {aplicadas.includes('pausar') ? (
                  <Button variant="ghost" className="btn-sm" title="Quita la marca: la campaña vuelve a quedar activa en el panel, como estaba. Es reversible y no le pide nada al servidor."
                    onClick={deshacerPausar}><I_Refresh size={12} /> Deshacer</Button>
                ) : (
                  <Button variant="ghost" className="btn-sm" title={`Marca ${MARCA.nombre} en pausa y deja de contar sus $${presuBase(MARCA)} por día. La pausa todavía no llega al servidor y es reversible: con Deshacer vuelve como estaba.`}
                    onClick={aplicarPausar}>Pausar</Button>
                )}
              </div>
            )}
            <div className="guard">
              <span style={{ color: 'var(--amber)', flexShrink: 0 }}><I_Eye size={14} /></span>
              <span className="guard-lb">Refrescar el creativo de {PACK.nombre}
                <small>{`Su pieza lleva ${PACK.artefactos} ${PACK.artefactos === 1 ? 'versión' : 'versiones'}: rotar el mensaje es lo que sostiene el costo por venta.`}</small>
                {aplicadas.includes('variantes') && (
                  <small style={{ color: 'var(--green)', fontWeight: 700 }}>
                    {`Marcado: van 3 variantes del mismo mensaje. Cuestan ${3 * TARIFA.crearVariante} créditos de los ${d.creditos ? d.creditos.saldo : '—'} que tiene. Pedirlas al motor todavía no sale desde aquí.`}
                  </small>
                )}
              </span>
              {aplicadas.includes('variantes') ? (
                <Button variant="ghost" className="btn-sm" title="Quita la marca: no se encarga ninguna variante y no se gasta ningún crédito. Es reversible."
                  onClick={deshacerVariantes}><I_Refresh size={12} /> Deshacer</Button>
              ) : (
                <Button variant="ghost" className="btn-sm" title={`Marca 3 variantes del mismo mensaje para rotar el creativo. Cuestan ${3 * TARIFA.crearVariante} créditos y no tocan el presupuesto. Nada se le pide al motor desde esta pantalla y la marca se quita cuando quiera.`}
                  onClick={aplicarVariantes}>3 variantes</Button>
              )}
            </div>
          </div>
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato" title="Lo que cambiaría el presupuesto por día si marca las acciones de arriba">
              <span className="dato-l">{aplicadas.length === 0 ? 'Si marca las acciones' : `Marcadas ${aplicadas.length}`}</span>
              <span className="dato-v" style={{ color: 'var(--green)' }}>
                {efectoPresu >= 0 ? '+' : '−'}<Dinero monto={Math.abs(efectoPresu)} />/día
              </span>
            </div>
            <div className="dato" title="Nada de esto sale a sus redes ni gasta un peso hasta que usted lo confirme en el servidor">
              <span className="dato-l">Riesgo</span><span className="dato-v">ninguno</span>
            </div>
            <div className="dato" title="Las marcas se quitan cuando quiera, con Deshacer">
              <span className="dato-l">Se deshace en</span><span className="dato-v" style={{ color: 'var(--purple3)' }}>un clic</span>
            </div>
          </div>
          <div className="acc-why">
            <>Sale de sus propios números: compara cada campaña contra el promedio de sus campañas. <b>Estas marcas no le piden nada al servidor todavía</b>: el gasto y los presupuestos que ve arriba son los que ya están cargados, sin tocar.</>
          </div>
        </Card>
      </div>

      {/* El gráfico de gasto cierra la sección: qué campaña se lleva cada peso del techo diario */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--green)' }} /> Dónde va su presupuesto</span>}
        action={<Badge tone="green"><Dinero monto={diario} equivalente={false} />/día</Badge>}
      >
        <div className="graf-ancho">
          <Bars data={gasto} labels={gastoLb} color="#a855f7" fmt={v => <Dinero monto={v} equivalente={false} />} />
          <div className="col-stack">
            <div className="datos-row">
              <div className="dato"><span className="dato-l">Por semana</span><span className="dato-v"><Dinero monto={diario * 7} /></span></div>
              <div className="dato"><span className="dato-l">Por mes</span><span className="dato-v"><Dinero monto={diario * 30} /></span></div>
              <div className="dato" title={PACK.roas === '—' ? 'Todavía no hay datos de retorno de sus campañas' : 'La campaña que mejor devuelve por peso invertido'}>
                <span className="dato-l">{PACK.roas === '—' ? 'La que más gasta' : 'La que más rinde'}</span>
                <span className="dato-v" style={{ color: PACK.roas === '—' ? 'var(--muted)' : 'var(--green)' }}>{PACK.nombre}{PACK.roas === '—' ? '' : ` · ${PACK.roas}`}</span>
              </div>
            </div>
            <div className="acc-why">
              <>El reparto sale de los presupuestos por día que usted tiene cargados, campaña por campaña. <b>El techo del mes todavía no llega del servidor</b>: cuando llegue, manda sobre todas.</>
            </div>
          </div>
        </div>
      </Card>

      {/* ============ 4. LA LISTA DE PIEZAS Y EL VEREDICTO DE LA ELEGIDA — lista + detalle, con los mismos 5 jueces ============ */}
      <div className="csec">
        <span className="csec-n">4</span>
        <span className="csec-t">El veredicto y sus piezas</span>
        <span className="csec-c purple">{nJueces} jueces · {juzgadas.length} {juzgadas.length === 1 ? 'pieza' : 'piezas'}</span>
        <span className="csec-s">Elija una pieza de la lista y al lado ve, voto por voto, cómo la juzgaron los 5 jueces y qué hay que corregirle</span>
      </div>

      {juzgadas.length === 0 ? (
        /* Un negocio conectado que todavía no mandó nada a MiroFish: aquí no va ni una pieza de ejemplo. */
        <EstadoVacio
          titulo="Todavía no hay piezas juzgadas"
          texto="El veredicto aparece cuando manda sus piezas a MiroFish: los 5 jueces las votan una por una y el puntaje queda guardado. Empiece por el paso 1 y en la próxima corrida están aquí, con su voto y su objeción."
          accion="Ir al paso 1" onAccion={() => setPaso(1)}
          icono={<I_Vote size={22} />}
        />
      ) : (
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_File size={14} style={{ color: 'var(--purple3)' }} /> Sus piezas, juzgadas</span>}
          action={<Badge tone="muted">{juzgadas.length} evaluadas</Badge>}
        >
          <div className="datos-row">
            <div className="dato" title="Todas las piezas de este negocio que pasaron por los jueces">
              <span className="dato-l">Juzgadas hasta hoy</span>
              <span className="dato-v">{juzgadasTotal}</span>
            </div>
            <div className="dato" title="Las que pasaron el mínimo de 80">
              <span className="dato-l">Pasaron</span>
              <span className="dato-v" style={{ color: 'var(--green)' }}>{pasarondelMes}</span>
            </div>
            <div className="dato" title="Las que volvieron con la objeción antes de gastar un peso">
              <span className="dato-l">Frenadas a tiempo</span>
              <span className="dato-v" style={{ color: 'var(--amber)' }}>{frenadas}</span>
            </div>
          </div>

          <div className="pz-filas">
            {juzgadas.map(o => {
              const s = o.puntaje;
              const esLaElegida = o.id === idPieza;
              return (
                <button key={o.id} className={`pz-fila ${esLaElegida ? 'on' : ''}`}
                  title={`Muestra en la tarjeta de al lado cómo la votaron los ${nJueces} jueces, uno por uno. No publica nada: aquí no se gasta un peso.`}
                  onClick={() => setElegida(o.id)}>
                  <span className="pz-fila-n" style={{ color: colorScore(s) }}>{s}</span>
                  <span className="pz-fila-txt">
                    <span className="pz-fila-t">{o.titulo}</span>
                    <span className="pz-fila-m">
                      {[o.formato, o.medida].filter(Boolean).join(' · ') || 'pieza del servidor'}
                    </span>
                    {esLaElegida && votosPieza.length > 0 && (
                      <span className="pz-fila-v">Los {nJueces} votos: {votosPieza.map(v => v.score).join(' · ')}</span>
                    )}
                  </span>
                  <span className="row" style={{ gap: 6, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    {publicadas.includes(o.id) && <Badge tone="green">lista</Badge>}
                    {corregidas.includes(o.id) && <Badge tone="purple">marcada</Badge>}
                    <Badge tone={tonoVeredicto(s)}>{palabraVeredicto(s)}</Badge>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="bs">
            El panel puntúa <b>cada pieza</b>: arriba de 80 pasa el mínimo, entre 60 y 80 vuelve con la
            objeción del juez que votó más bajo, y abajo de 60 no se gasta un peso.
          </div>
          <div className="acc-why">
            <><b>Estas {juzgadas.length} son las piezas de su negocio que ya pasaron por MiroFish</b>, con el puntaje que quedó guardado en el servidor. El voto juez por juez se pide al elegir una y es el de verdad: aquí no hay ningún puntaje de ejemplo.</>
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Vote size={14} style={{ color: 'var(--purple3)' }} /> El veredicto de la pieza elegida</span>}
          action={<Badge tone={tonoVeredicto(scorePieza)}>{palabraVeredicto(scorePieza).toLowerCase()}</Badge>}
        >
          <div className="row" style={{ gap: 20, marginBottom: 22, flexWrap: 'wrap' }}>
            <Ring valor={scorePieza} label="SCORE" sub="mínimo 80 para pasar" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="bt">{pieza?.titulo}</div>
              <div className="bs" style={{ marginTop: 5 }}>
                {`Puntaje guardado en MiroFish · ${leyendoVeredicto ? 'trayendo el voto de los jueces…' : `los ${nJueces} jueces y el público ya votaron`}`}
              </div>
              <div className="bs" style={{ marginTop: 8 }}><b>{criterioDePieza(scorePieza)}</b></div>
            </div>
          </div>

          {leyendoVeredicto && votosPieza.length === 0 ? (
            <div className="bs">Trayendo del servidor el voto de cada juez sobre «{pieza?.titulo}»…</div>
          ) : votosPieza.length === 0 ? (
            <div className="bs">El servidor todavía no tiene el detalle de los votos de esta pieza: en cuanto llegue, aparece aquí juez por juez.</div>
          ) : (
            <div className="guards">
              {votosPieza.map(v => (
                <div key={v.nombre} className="guard">
                  <span style={{ width: 34, flexShrink: 0, textAlign: 'center', fontSize: 17, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: colorScore(v.score) }}>{v.score}</span>
                  <span className="guard-lb">
                    {v.nombre} <span className="tiny muted">· {v.mira}</span>
                    <small>«{v.opinion}»</small>
                  </span>
                </div>
              ))}
            </div>
          )}

          {votoMasBajo && (
            <div className="alarm atencion">
              <div className="alarm-head">
                <span className="alarm-sev atencion">{pasaPieza ? 'EL VOTO MÁS BAJO' : 'LO QUE HAY QUE ARREGLAR'}</span>
                <span className="alarm-title">{votoMasBajo.nombre} fue el más duro: le puso {votoMasBajo.score} de 100.</span>
              </div>
              <div className="alarm-sug">
                «{votoMasBajo.opinion}» <b>{pasaPieza
                  ? `No frena la publicación: es lo que hay que resolver si quiere subirla de ${scorePieza}.`
                  : 'Es la objeción a corregir antes de gastar un peso.'}</b>
              </div>
            </div>
          )}

          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            {pasaPieza ? (
              publicadas.includes(idPieza ?? '') ? (
                <>
                  <span className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--green)', fontWeight: 700 }}>
                    <I_Check size={13} /> {`«${pieza?.titulo}» quedó marcada como lista para publicar. Todavía no salió a sus redes desde el panel.`}
                  </span>
                  <Button variant="ghost" className="btn-sm" title="Quita la marca: la pieza vuelve a la lista como estaba. No llama al servidor y no cambia nada de lo que está publicado."
                    onClick={() => { setPublicadas(p => p.filter(x => x !== idPieza)); setToast(`«${pieza?.titulo}» quedó sin la marca`); }}>
                    Quitar la marca
                  </Button>
                </>
              ) : (
                <Button className="btn-sm"
                  title={`Marca esta pieza (${pieza?.titulo}) como lista para publicar, con el puntaje que ya le dio MiroFish. Es reversible y no llama al servidor: sacarla a sus redes desde el panel todavía no está disponible.`}
                  onClick={() => { setPublicadas(p => [...p, idPieza ?? '']); setToast(`«${pieza?.titulo}» quedó marcada como lista para publicar: todavía no sale a sus redes`); }}>
                  <I_Check size={13} /> Marcar como lista
                </Button>
              )
            ) : (
              corregidas.includes(idPieza ?? '') ? (
                <>
                  <span className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--green)', fontWeight: 700 }}>
                    <I_Refresh size={13} /> {`«${pieza?.titulo}» quedó marcada para corrección: hay que contestar la objeción de ${votoMasBajo?.nombre ?? 'el juez más duro'}. Al servidor todavía no se le pidió nada.`}
                  </span>
                  <Button variant="ghost" className="btn-sm" title="Quita la marca: la pieza queda como estaba. No se pierde nada."
                    onClick={() => { setCorregidas(p => p.filter(x => x !== idPieza)); setToast(`«${pieza?.titulo}» quedó sin la marca`); }}>
                    Quitar la marca
                  </Button>
                </>
              ) : (
                <Button className="btn-sm"
                  title={`Marca «${pieza?.titulo}» para corrección, con la objeción de ${votoMasBajo?.nombre ?? 'el juez más duro'} a la vista. Es reversible y todavía no le pide nada al servidor.`}
                  onClick={corregirPieza}>
                  <I_Refresh size={13} /> Marcar para corrección
                </Button>
              )
            )}
          </div>

          <div className="acc-why">
            <b>Ninguna pieza se publica sin pasar el mínimo.</b> Los votos que ve arriba son los que quedaron guardados en MiroFish, con el puntaje que le dio el mercado. Lo que se marca desde el panel no le pide nada al servidor todavía.
          </div>
        </Card>
      </div>
      )}
      </>
      )}
      </>)}
    </div>
  );
}
