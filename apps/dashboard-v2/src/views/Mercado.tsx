import { useState } from 'react';
import { Card, Badge, Button } from '../components/ui';
import { useDetalle, type Bloque } from '../components/Detalle';
import { ViewHead, Bars } from '../components/viz';
import { I_Globe, I_Trend, I_Zap, I_Users, I_Target, I_Megaphone, I_Dot } from '../components/icons';
import { useDatos } from '../api/datos';
import { baseApi, token } from '../api/cliente';
import { EstadoVacio } from '../components/EstadoVacio';
import { lista } from '../lib/lista';
import type { Vista } from '../components/Layout';

// =============================================================================================
// MERCADO — lo que el motor encontró en el mercado de ESTE negocio
//
// Todo lo de esta pantalla sale del back: los hallazgos de la investigación (`d.hallazgos`), el
// público calibrado (`d.calibracion`), las corridas (`d.corridas`) y el acierto del modelo
// (`d.backtest`). No hay competidores con nombre propio ni tendencias de ejemplo: nadie midió eso
// para este negocio, así que mostrarlo sería inventarle un mercado. Sin nada que mostrar, la
// pantalla dice qué hacer para tenerlo.
// =============================================================================================

/** La fecha de un hallazgo o de una corrida, en corto («24 de sept»). Vacía si no se puede leer. */
const fechaCorta = (iso?: string) => {
  if (!iso) return '';
  const f = new Date(iso);
  return isNaN(+f) ? '' : f.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
};

/** El origen del dato en una palabra: el peso de un segmento se muestra siempre con su origen. */
const ORIGEN_TXT: Record<string, string> = {
  propia: 'Propia',
  inferida: 'Inferida',
  competencia: 'De la competencia',
};
const origenTexto = (o?: string | null) => (o ? ORIGEN_TXT[o] ?? o : 'Sin declarar');
/** El peso de un segmento, como porcentaje del público real (el back lo manda sobre 1). */
const pct = (peso: number) => `${Math.round((Number(peso) || 0) * 100)}%`;

export function ViewMercado({ setToast, setVista }: { setToast: (t: string) => void; setVista?: (v: Vista) => void }) {
  // De dónde salen los datos: del back. Sin back, el mismo contrato llega vacío y la pantalla invita
  // a conectar la cuenta. Nunca de los dos: mezclarlos sería inventarle un mercado al negocio.
  const d = useDatos();
  const hallazgos = d.hallazgos;

  /**
   * LA DECISIÓN DE LA PIEZA Y LAS LENGUAS son dos tareas del equipo, y salen de la última corrida: Tino
   * decide qué se publica (y con qué se decidió: el mercado medido o el material del negocio) y Lex decide
   * en qué lengua se busca el mercado y en qué lengua va la pieza. Se muestran tal como el back las dejó.
   * Sin corrida no hay decisión que mostrar y se dice, en vez de inventar una pieza.
   */
  const tareas = d.corridas[0]?.tareas ?? [];
  const tino = tareas.find(t => t.agente === 'tino')?.resultado as any;
  const lex = tareas.find(t => t.agente === 'lex')?.resultado as any;
  const pieza = tino?.la_pieza ?? null;
  const entendido = tino?.lo_que_entendimos_del_negocio ?? null;
  // El motor saliendo a investigar de verdad, disparado desde los estados vacíos.
  const [investigando, setInvestigando] = useState(false);
  // El panel de detalle que ya abre todo botón que informa: el informe no inventa una pantalla nueva.
  const detalle = useDetalle();

  // ---------- SU PÚBLICO CALIBRADO Y EL ACIERTO DEL MODELO ----------
  // Los pesos se normalizan una sola vez: la base los puede devolver como número o como texto, y las
  // barras, la lista y los datos tienen que leer exactamente lo mismo.
  const segmentos = (d.calibracion?.por_segmento ?? []).map(s => ({
    segmento: s.segmento, agentes: Number(s.agentes) || 0, peso: Number(s.peso) || 0, origen: s.origen,
  }));
  const pesos = segmentos.map(s => s.peso);
  const etiquetas = segmentos.map(s => s.segmento);

  /**
   * Mientras el back está respondiendo NO se afirma que no hay nada: se dice que se está leyendo.
   * Un «todavía no hay» que dura un segundo es una afirmación falsa.
   */
  const vacio = (titulo: string, texto: string) => d.cargando
    ? { titulo: 'Leyendo el back…', texto: 'El panel está leyendo lo que hay en el servidor. Si no hay nada, lo dice enseguida; mientras tanto no se muestra ninguna cifra inventada.' }
    : { titulo, texto };

  /** Corre la investigación del mercado en el back (investigar no cuesta créditos) y relee los hallazgos. */
  const investigar = async () => {
    setInvestigando(true);
    try {
      const r = await fetch(baseApi() + '/api/agentes/correr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({} as { error?: string; detalle?: string }));
        setToast(e?.detalle || e?.error || `No se pudo investigar (error ${r.status})`);
      } else {
        setToast('El equipo salió a investigar su mercado');
      }
    } catch {
      setToast('No se pudo investigar: el servidor no respondió');
    }
    await d.refrescar();
    setInvestigando(false);
  };

  /**
   * La invitación concreta de los estados vacíos: con el back encendido se le pide una investigación
   * al motor; sin back, lo que falta es conectar las cuentas (Primeros pasos). Ninguna gasta.
   */
  const invitar = () => d.real
    ? {
      accion: investigando ? 'El equipo salió a investigar…' : 'Que el motor investigue ahora',
      onAccion: () => { if (!investigando) void investigar(); },
    }
    : {
      accion: 'Conectar mis cuentas',
      onAccion: () => { if (setVista) setVista('onboarding'); setToast('Primeros pasos: conecte sus cuentas y el motor sale a investigar su mercado'); },
    };

  /**
   * El botón del informe completo. No es una pantalla nueva: abre el panel de detalle que ya usa todo
   * botón que informa, con el informe del mercado adentro. Si todavía no hay informe para el rubro y la
   * ciudad del negocio, el panel dice exactamente qué falta en vez de mostrar un mercado de ejemplo.
   */
  const abrirInforme = () => {
    const inf = d.informeMercado;
    if (!inf) {
      detalle({
        titulo: 'Informe completo de su mercado',
        sub: d.cargando
          ? 'Leyendo el back…'
          : 'El servidor no respondió, así que no se muestra ningún mercado: un informe se lee, no se inventa.',
        bloques: [
          { tipo: 'texto', texto: 'Este informe se arma con dos datos que ya están en Primeros pasos: el rubro del negocio y su ciudad. No hace falta conectar ninguna cuenta para tenerlo.' },
        ],
        fuente: '',
        acciones: [{ label: 'Volver a leer', onClick: () => void d.refrescar(), variante: 'outline' }],
      });
      return;
    }
    if (!inf.hay || !inf.informe) {
      detalle({
        titulo: 'Informe completo de su mercado',
        sub: 'Todavía no hay informe para su rubro y su ciudad. Esto es exactamente lo que falta:',
        bloques: [
          { tipo: 'filas', items: (inf.falta || []).map(f => ({ t: f, etiqueta: 'falta', tono: 'amber' as const })) },
          { tipo: 'texto', texto: 'Lo llena la corrida de investigación del rubro y queda guardado con su fuente y su fecha. Se arma con el rubro y la ciudad que ya están cargados: no hace falta conectar cuentas.' },
        ],
        fuente: '',
      });
      return;
    }
    const i = inf.informe;
    const b: Bloque[] = [];
    if (i.resumen) b.push({ tipo: 'texto', texto: i.resumen });
    b.push({
      tipo: 'datos', filas: [
        { k: 'Rubro leído', v: inf.rubro || '—' },
        { k: 'Ciudad', v: inf.ciudad || '—' },
        {
          k: 'De quién es el informe',
          v: inf.origen === 'negocio' ? 'Medido para su negocio' : 'Del rubro y su ciudad',
          s: inf.origen === 'negocio'
            ? 'medido para este negocio'
            : inf.porque_aplica || 'no es una lectura de su cuenta: es el mercado de su rubro',
          tono: inf.origen === 'negocio' ? 'green' as const : 'muted' as const,
        },
        { k: 'Generado', v: fechaCorta(inf.generado_at ?? undefined) || 'sin fecha' },
      ],
    });
    if (i.jugadores?.length) {
      b.push({ tipo: 'aviso', texto: 'Quiénes juegan en su mercado', tono: 'green' });
      b.push({ tipo: 'filas', items: i.jugadores.map(j => ({ t: j.detalle, s: j.cuantos, etiqueta: j.capa, tono: 'purple' as const })) });
    }
    if (i.piezas?.length) {
      b.push({ tipo: 'aviso', texto: 'Las piezas vivas que el mercado ya premió con tiempo: solo las sostenidas. El tiempo es el único indicador público de que una pieza rinde.', tono: 'green' });
      b.push({
        tipo: 'filas', items: i.piezas.map(p => ({
          t: `${p.anunciante} · ${p.tipo}`,
          s: [`${p.dias} días`, p.estilo, p.quien, p.lugar, p.cta, p.destino, p.paleta?.length ? p.paleta.join(' ') : '', p.prueba_social, p.nota].filter(Boolean).join(' · '),
          etiqueta: p.dias >= 60 ? `${p.dias} días` : `${p.dias} días`,
          tono: p.dias >= 60 ? 'green' as const : 'amber' as const,
        })),
      });
    }
    if (i.patron?.length) {
      b.push({ tipo: 'aviso', texto: 'El patrón del rubro: lo que comparten las piezas sostenidas. Esto no se cambia.' });
      b.push({ tipo: 'datos', filas: i.patron.map(p => ({ k: p.k, v: p.v, s: p.s })) });
    }
    if (i.saturacion?.length) {
      b.push({ tipo: 'aviso', texto: 'Lo que ya dicen todas: competir aquí es perderse entre todos', tono: 'amber' });
      b.push({ tipo: 'filas', items: i.saturacion.map(s => ({ t: s, etiqueta: 'saturado', tono: 'amber' as const })) });
    }
    if (i.huecos?.length) {
      b.push({ tipo: 'aviso', texto: 'El hueco: lo que el cliente necesita y nadie le está respondiendo', tono: 'green' });
      b.push({ tipo: 'filas', items: i.huecos.map(h => ({ t: h.titulo, s: [h.detalle, h.como].filter(Boolean).join(' · '), etiqueta: 'hueco', tono: 'green' as const })) });
    }
    if (i.creadoras?.length) {
      b.push({ tipo: 'aviso', texto: 'La capa de creador y UGC del rubro: quién firma la pieza y en qué nivel está' });
      b.push({ tipo: 'filas', items: i.creadoras.map(c => ({ t: c.nivel, s: [c.detalle, c.evidencia].filter(Boolean).join(' · '), etiqueta: 'UGC', tono: 'purple' as const })) });
    }
    // ---------- LA ANALÍTICA VISUAL: colores, tipografía y encuadre medidos, y qué pega en cada plaza ----------
    if (i.analitica_visual) {
      const av = i.analitica_visual;
      b.push({ tipo: 'aviso', texto: 'La analítica visual del mercado: lo que hay que repetir, medido pieza por pieza', tono: 'green' });
      if (av.resumen) b.push({ tipo: 'texto', texto: av.resumen });
      if (av.tipografia?.length) {
        b.push({ tipo: 'filas', items: av.tipografia.map(t => ({
          t: `${t.estilo}${t.caja ? ` · ${t.caja}` : ''}`,
          s: [t.tratamiento, t.ubicacion, t.medido_en].filter(Boolean).join(' · '),
          etiqueta: 'tipografía', tono: 'purple' as const,
        })) });
      }
      if (av.composicion?.length) {
        b.push({ tipo: 'filas', items: av.composicion.map(c => ({ t: c.regla, s: c.porque, etiqueta: 'encuadre' })) });
      }
      if (av.paletas?.length) {
        b.push({ tipo: 'filas', items: av.paletas.map(p => ({
          t: p.uso, s: `${lista(p.colores).join(' ')}${p.nota ? ` · ${p.nota}` : ''}`,
          etiqueta: 'paleta', tono: 'purple' as const,
        })) });
      }
      if (av.por_plaza?.length) {
        b.push({ tipo: 'aviso', texto: 'Qué pega mejor en cada plaza: formato, gancho, botón, paleta y tipografía', tono: 'green' });
        b.push({ tipo: 'filas', items: av.por_plaza.map(p => ({
          t: `${p.plaza} → ${p.formato}`,
          s: [`gancho: ${p.gancho}`, `botón: ${p.boton}`, p.tipografia, lista(p.paleta).length ? `paleta: ${lista(p.paleta).join(' ')}` : '', p.porque]
            .filter(Boolean).join(' · '),
          etiqueta: 'plaza',
        })) });
      }
      if (lista(av.hashtags_usados).length) b.push({ tipo: 'texto', texto: `Hashtags que el rubro ya usa: ${lista(av.hashtags_usados).join(' ')}` });
      if (lista(av.duraciones_medidas).length) b.push({ tipo: 'texto', texto: `Duración medida en las piezas sostenidas: ${lista(av.duraciones_medidas).join(' · ')}` });
      if (av.lo_que_no_hay_que_copiar?.length) {
        b.push({ tipo: 'aviso', texto: 'Lo que NO hay que copiar del mercado', tono: 'amber' });
        b.push({ tipo: 'filas', items: av.lo_que_no_hay_que_copiar.map(x => ({ t: x, etiqueta: 'evitar', tono: 'amber' as const })) });
      }
      if (av.nota_plazas) b.push({ tipo: 'texto', texto: `Límite declarado: ${av.nota_plazas}` });
    }
    if (i.propuestas?.length) {
      b.push({ tipo: 'aviso', texto: 'Lo que proponemos: conserva lo probado y ataca el hueco', tono: 'green' });
      for (const p of i.propuestas) {
        b.push({ tipo: 'texto', texto: `${p.titulo} — ${p.tipo}` });
        if (p.guion?.length) b.push({ tipo: 'pasos', items: p.guion });
        if (p.copy) b.push({ tipo: 'texto', texto: p.copy });
        if (p.por_que) b.push({ tipo: 'texto', texto: `Por qué debería ganarle: ${p.por_que}` });
      }
    }
    if (i.checks?.length) {
      b.push({ tipo: 'aviso', texto: 'Las verificaciones que ya pasó antes de llegar aquí' });
      b.push({ tipo: 'pasos', items: i.checks });
    }
    if (i.etapas?.length) {
      b.push({ tipo: 'aviso', texto: 'Cómo se hizo: el método, etapa por etapa' });
      b.push({ tipo: 'pasos', items: i.etapas });
    }
    if (i.cuidado?.length) {
      b.push({ tipo: 'aviso', texto: 'Reglas de cuidado de este rubro: se revisan antes de escribir una línea', tono: 'amber' });
      b.push({ tipo: 'filas', items: i.cuidado.map(c => ({ t: c, etiqueta: 'cuidado', tono: 'amber' as const })) });
    }
    if (i.techos?.length) {
      b.push({ tipo: 'aviso', texto: 'Los techos del dato público: qué sí y qué no se puede', tono: 'amber' });
      b.push({ tipo: 'filas', items: i.techos.map(t => ({ t: t.se_puede, s: `No se puede: ${t.no_se_puede}` })) });
    }
    detalle({ titulo: 'Informe completo de su mercado', sub: `${inf.rubro} · ${inf.ciudad}`, bloques: b, fuente: inf.fuente });
  };


  /**
   * El botón de los prompts: abre el mismo panel de detalle con el prompt de generación de cada plaza y
   * LA TRAZA de cómo se armó cada campo con lo que se midió en el mercado. No hay generador conectado
   * todavía: el prompt completo es el entregable real de hoy.
   */
  const abrirPrompts = () => {
    if (!d.prompts.length) {
      detalle({
        titulo: 'Prompts de generación (imagen o video)',
        sub: d.cargando ? 'Leyendo el back…' : 'Todavía no hay prompts para su negocio.',
        bloques: [
          { tipo: 'texto', texto: 'Los arma Iris en la corrida del mercado. Si ya hay informe del rubro, usa la analítica visual medida ahí; si todavía no hay, usa la identidad medida en la propia página del negocio —sus colores, su tipografía y sus imágenes— y propone el concepto. En cuanto la corrida los deje, aparecen acá, listos para pegar en un generador.' },
        ],
        fuente: '',
        acciones: [{ label: 'Volver a leer', onClick: () => void d.refrescar(), variante: 'outline' }],
      });
      return;
    }
    const b: Bloque[] = [];
    const plural = d.prompts.length === 1 ? 'prompt listo' : 'prompts listos';
    b.push({ tipo: 'texto', texto: `Su negocio tiene ${d.prompts.length} ${plural}. Todavía no hay generador de imagen ni de video conectado: esto es lo que se le pega el día que lo haya.` });
    for (const p of d.prompts) {
      const det = p.detalle || {};
      b.push({ tipo: 'aviso', texto: `${p.plaza} · ${p.tipo} · ${p.estilo}`, tono: 'green' });
      b.push({
        tipo: 'datos', filas: [
          { k: 'Pieza', v: p.pieza },
          { k: 'Formato', v: `${p.proporcion}${det.escenas?.length ? ` · ${det.escenas.length} escenas` : ''}` },
          { k: 'Referencia del mercado', v: det.referencia?.anunciante ? `${det.referencia.anunciante} · ${det.referencia.dias || 0} días` : 'sin mercado medido', s: det.referencia?.que_se_toma },
          { k: 'Colores', v: lista(det.colores?.paleta).join(' ') || '—', s: det.colores?.rol },
          { k: 'Tipografía', v: det.tipografia ? `${det.tipografia.familia} · ${det.tipografia.tratamiento}` : 'sin texto sobre la imagen', s: det.tipografia?.ubicacion },
        ],
      });
      if (det.concepto) {
        b.push({ tipo: 'aviso', texto: 'El concepto de la pieza', tono: 'green' });
        b.push({ tipo: 'texto', texto: String(det.concepto) });
      }
      if (det.sujeto?.quien) b.push({ tipo: 'texto', texto: `Sujeto: ${det.sujeto.quien} · ${det.sujeto.donde || ''} · ${det.sujeto.accion || ''}` });
      if (det.recursos?.length) {
        b.push({ tipo: 'aviso', texto: 'Los recursos de marca que ya usa (reales, de su web)' });
        b.push({ tipo: 'filas', items: det.recursos.map((x: string) => ({ t: x, etiqueta: 'recurso', tono: 'muted' as const })) });
      }
      if ((det.escenas?.length ?? 0) > 1) {
        b.push({ tipo: 'pasos', items: det.escenas!.map(e => `${e.s} s · ${e.plano} — ${e.accion}${e.texto_en_pantalla ? ` [texto: ${e.texto_en_pantalla}]` : ''}`) });
      }
      b.push({ tipo: 'texto', texto: `PROMPT (listo para pegar en el modelo):
${p.prompt}` });
      b.push({ tipo: 'texto', texto: `Negativo: ${p.prompt_negativo}` });
      if (det.no_debe_aparecer?.length) {
        b.push({ tipo: 'aviso', texto: 'Lo que no debe aparecer', tono: 'amber' });
        b.push({ tipo: 'filas', items: det.no_debe_aparecer.map(x => ({ t: x, etiqueta: 'prohibido', tono: 'amber' as const })) });
      }
      if (det.como_se_arma?.length) {
        b.push({ tipo: 'aviso', texto: 'Cómo se armó este prompt: cada campo y de dónde salió', tono: 'green' });
        b.push({ tipo: 'filas', items: det.como_se_arma.map(c => ({ t: `${c.campo} → ${c.como_se_usa}`, s: `sale de: ${c.sale_de}`, etiqueta: 'traza', tono: 'purple' as const })) });
      }
      if (det.elegido_por_nosotros?.length) {
        b.push({ tipo: 'aviso', texto: 'Lo que elegimos nosotros (no es medición)' });
        b.push({ tipo: 'filas', items: det.elegido_por_nosotros.map(x => ({ t: x, etiqueta: 'elegido', tono: 'muted' as const })) });
      }
      if (det.verificaciones?.length) b.push({ tipo: 'pasos', items: det.verificaciones });
    }
    detalle({
      titulo: 'Prompts de generación (imagen o video)',
      sub: 'Del mercado medido al prompt: cada campo con su origen',
      bloques: b,
      fuente: 'la corrida del mercado de este negocio',
    });
  };


  /**
   * El botón de los formatos y las tendencias. Es el mismo panel de detalle que los otros dos:
   * lo que Nova midió —el formato que aguanta en cada plaza, quién ya repite molde, las series que
   * están corriendo— y lo que se está hablando por país, con su alcance cultural.
   */
  const abrirFormatos = () => {
    const b: Bloque[] = [];
    const tareaNova = d.corridas.flatMap(c => c.tareas ?? []).find(t => t.agente === 'nova');
    const nova = (tareaNova?.resultado ?? {}) as any;
    const rec = (nova.formatos_recomendados ?? []) as any[];

    if (rec.length) {
      b.push({ tipo: 'aviso', texto: 'El formato que aguanta en cada plaza: el molde que más se repite entre las piezas que el mercado sostiene', tono: 'green' });
      b.push({
        tipo: 'filas', items: rec.map(r => ({
          t: `${r.plaza} → ${r.formato_recomendado}`,
          s: [`${r.por_que}`, r.colores?.length ? `colores medidos: ${r.colores.join(' ')}` : '', r.tipografia ? `tipografía: ${r.tipografia}` : ''].filter(Boolean).join(' · '),
          etiqueta: r.dias_sostenidos ? `${r.dias_sostenidos} días` : 'medido',
          tono: 'purple' as const,
        })),
      });
    } else {
      b.push({ tipo: 'texto', texto: d.cargando ? 'Leyendo el back…' : 'Todavía no hay formatos medidos: se llenan cuando el equipo corra la investigación del mercado.' });
    }

    if (nova.quien_repite_molde?.length) {
      b.push({ tipo: 'aviso', texto: 'Quién encontró ya su formato: repetir molde es la señal' });
      b.push({ tipo: 'filas', items: nova.quien_repite_molde.map((q: any) => ({ t: q.anunciante, s: `${q.veces} de sus piezas usan el mismo molde: ${q.molde_que_repite}`, etiqueta: `${q.veces}×` })) });
    }

    if (nova.series_detectadas?.length) {
      b.push({ tipo: 'aviso', texto: 'Series que ya están corriendo, sin que nadie las llame así', tono: 'green' });
      b.push({ tipo: 'filas', items: nova.series_detectadas.map((s: any) => ({ t: `${s.anunciante}: «${s.palabra}»`, s: `${s.tipo} · molde: ${s.molde}`, etiqueta: `${s.en_piezas} piezas`, tono: 'green' as const })) });
    }

    if (nova.alcance_cultural) {
      b.push({ tipo: 'datos', filas: [
        { k: 'Temas de hoy en un solo país', v: String(nova.alcance_cultural.local ?? 0) },
        { k: 'En varios países de la región', v: String(nova.alcance_cultural.regional ?? 0) },
        { k: 'En varios mercados (no es cosa nuestra)', v: String(nova.alcance_cultural.global ?? 0), s: nova.alcance_cultural.como_se_lee },
      ] });
    }

    if (d.tendencias.length) {
      b.push({ tipo: 'aviso', texto: 'Lo que se está hablando: su alcance y si toca su rubro' });
      b.push({
        tipo: 'filas', items: d.tendencias.slice(0, 24).map(t => ({
          t: t.tema,
          s: [`${t.fecha ? String(t.fecha).slice(0, 10) : ''}`, `países: ${(t.paises || []).join(', ')}`, t.dias > 1 ? `aparece en ${t.dias} días: sigue` : 'un solo día'].filter(Boolean).join(' · '),
          etiqueta: t.toca_el_rubro ? 'toca su rubro' : String(t.alcance || '').split(' (')[0],
          tono: t.toca_el_rubro ? 'green' as const : 'muted' as const,
        })),
      });
      b.push({ tipo: 'texto', texto: 'Cómo se lee: un tema de un solo país es local; varios de la región es regional; y si aparece también en España o Estados Unidos, no es cosa nuestra. Los temas del día suelen ser noticia y deporte: se usan como contexto y calendario, nunca como el mensaje central.' });
    } else {
      b.push({ tipo: 'texto', texto: 'Todavía no hay tendencias guardadas: se llenan en la corrida diaria.' });
    }

    if (nova.calendario_sugerido) {
      const cal = Array.isArray(nova.calendario_sugerido)
        ? nova.calendario_sugerido
        : [{ tema: String(nova.calendario_sugerido), dias: 0 }];
      b.push({ tipo: 'aviso', texto: 'Calendario: lo que se repite varios días y sí toca su rubro', tono: 'green' });
      b.push({ tipo: 'filas', items: cal.map((c: any) => ({ t: c.tema, s: c.dias ? `aparece en ${c.dias} días` : '', etiqueta: c.dias ? `${c.dias} días` : 'nota', tono: 'green' as const })) });
    }

    if (nova.como_aplicarlo?.length) {
      b.push({ tipo: 'aviso', texto: 'Cómo se aplica: las reglas, no la decoración' });
      b.push({ tipo: 'pasos', items: nova.como_aplicarlo });
    }

    detalle({
      titulo: 'Formatos y tendencias',
      sub: 'Qué formato aguanta en cada plaza, quién ya lo encontró y qué se está hablando',
      bloques: b,
      fuente: 'la corrida del mercado de este negocio + el RSS público de tendencias por país',
    });
  };

  /**
   * La decisión completa: la pieza con su porqué, con qué se decidió, qué elegimos nosotros y qué falta.
   * Nada de esto es una pantalla nueva: es el mismo panel de detalle que abre todo botón que informa.
   */
  const abrirDecision = () => {
    if (!tino) return;
    const b: Bloque[] = [];
    if (tino.por_que_sin_mercado) b.push({ tipo: 'texto', texto: tino.por_que_sin_mercado });
    b.push({
      tipo: 'datos', filas: [
        { k: 'Qué se publica', v: String(pieza?.que_se_publica || '—') },
        { k: 'A quién le habla', v: String(entendido?.a_quien || '—') },
        { k: 'En qué lengua', v: String(pieza?.idioma || '—'), s: pieza?.por_que_ese_idioma },
        { k: 'Dónde va', v: String(pieza?.donde_va || '—'), s: pieza?.boton },
        { k: 'El formato', v: String(pieza?.formato || '—') },
        { k: 'Con qué se decidió', v: String(tino.fuente_tipo || '—') },
        { k: 'Quién decide', v: String(tino.quien_decide || '—'), tono: 'green' as const },
      ],
    });
    const tramos = [
      { t: 'Gancho', s: String(pieza?.gancho || '') },
      { t: 'Cuerpo', s: String(pieza?.cuerpo || '') },
      { t: 'Cierre', s: String(pieza?.cierre || '') },
    ].filter(x => x.s);
    if (tramos.length) {
      b.push({ tipo: 'aviso', texto: 'La pieza, tramo por tramo: lo que dice y en qué orden. Cada tramo sale de lo que el negocio dijo de sí mismo, no de una idea suelta.' });
      b.push({ tipo: 'filas', items: tramos });
    }
    if ((tino.palabras_clave_de_la_pieza ?? []).length) {
      b.push({ tipo: 'aviso', texto: 'Las palabras con las que su cliente lo busca: entran en el copy, no como relleno.' });
      b.push({ tipo: 'filas', items: (tino.palabras_clave_de_la_pieza as string[]).map(x => ({ t: x })) });
    }
    if ((pieza?.elegido_por_nosotros ?? []).length) {
      b.push({ tipo: 'filas', items: (pieza.elegido_por_nosotros as string[]).map(x => ({ t: x, etiqueta: 'elegido por nosotros', tono: 'amber' as const })) });
    }
    const c = tino.cuando_cambiar ?? {};
    if (c.regla) b.push({ tipo: 'aviso', texto: `Cuándo se cambia de rumbo: ${c.regla}`, tono: 'green' });
    const camp = tino.propuesta_campana;
    if (camp) {
      b.push({ tipo: 'datos', filas: [
        { k: 'La campaña', v: String(camp.objetivo || '—') },
        { k: 'En', v: String(camp.red || '—') },
        { k: 'Presupuesto diario', v: String(camp.presupuesto_diario ?? '—') },
        { k: 'Cierre', v: String(camp.cierre || '—'), s: camp.por_que },
      ] });
    }
    if ((tino.falta ?? []).length) {
      b.push({ tipo: 'aviso', texto: `Todavía falta: ${lista(tino.falta).join(' · ')}`, tono: 'amber' });
    }
    detalle({
      titulo: 'La decisión: qué se publica y por qué',
      sub: tino.modo ? `Modo ${tino.modo} · ${tino.quien_decide || ''}`.trim() : undefined,
      bloques: b,
      fuente: String(tino.fuente || ''),
      acciones: d.prompts.length
        ? [{ label: `Ver los prompts de generación (${d.prompts.length})`, onClick: abrirPrompts, variante: 'outline' as const }]
        : undefined,
    });
  };

  /**
   * El plan de lenguas completo, plaza por plaza: con qué palabras se buscó en cada una, en qué lengua lee
   * el que compra ahí y en qué lengua volvieron los avisos. Es la prueba de que la búsqueda no fue a ciegas.
   */
  const abrirLenguas = () => {
    if (!lex) return;
    const b: Bloque[] = [];
    b.push({ tipo: 'texto', texto: String(lex.porque || '') });
    const dueño = lex.lengua_del_negocio ?? {};
    b.push({ tipo: 'datos', filas: [
      { k: 'La lengua de su material', v: String(dueño.lengua || '—'), s: String(dueño.como_se_leyo || ''), tono: 'green' as const },
      { k: 'Sus páginas', v: String(lex.lengua_de_sus_paginas || '—') },
      { k: 'Su categoría', v: String(lex.lengua_de_la_categoria || '—') },
      { k: 'La pieza va en', v: String(lex.la_pieza_en_que_lengua?.nombre || '—'), s: String(lex.la_pieza_en_que_lengua?.por_que || ''), tono: 'green' as const },
    ] });
    if ((lex.lenguas_de_busqueda ?? []).length) {
      b.push({ tipo: 'aviso', texto: 'Las lenguas en las que se busca su mercado, y para qué sirve cada una.' });
      b.push({ tipo: 'filas', items: (lex.lenguas_de_busqueda as any[]).map(l => ({ t: l.nombre, s: l.para_que, etiqueta: l.codigo, tono: 'purple' as const })) });
    }
    if ((lex.plan_por_plaza ?? []).length) {
      b.push({ tipo: 'aviso', texto: 'Plaza por plaza: con qué palabras se buscó, en qué lengua lee el que compra ahí y en qué lengua están los avisos que volvieron.', tono: 'green' });
      b.push({ tipo: 'filas', items: (lex.plan_por_plaza as any[]).map(p => ({
        t: `${p.plaza} · ${p.avisos_leidos} avisos leídos`,
        s: `el idioma de esa plaza es el ${p.lengua_de_la_plaza ?? p.lengua_del_que_compra} · se buscó con: ${[].concat(p.con_que_palabras_se_busco ?? []).join(' · ')} · volvieron en ${p.en_que_lengua_estan_los_avisos}`,
      })) });
    }
    const porLengua = Object.entries(lex.palabras_por_lengua ?? {});
    if (porLengua.length) {
      b.push({ tipo: 'aviso', texto: 'Las palabras con las que se busca la categoría, en cada lengua.' });
      b.push({ tipo: 'filas', items: porLengua.map(([cod, palabras]) => ({ t: cod, s: [].concat(palabras as any).join(' · '), tono: 'muted' as const })) });
    }
    if ((lex.termino_de_la_categoria_en_la_lengua_de_la_plaza ?? []).length) {
      b.push({ tipo: 'filas', items: (lex.termino_de_la_categoria_en_la_lengua_de_la_plaza as string[]).map(x => ({ t: x, etiqueta: 'verificado', tono: 'green' as const })) });
    }
    if ((lex.lo_que_se_pierde ?? []).length) {
      b.push({ tipo: 'aviso', texto: 'Lo que se pierde si no se busca así:', tono: 'amber' });
      b.push({ tipo: 'filas', items: (lex.lo_que_se_pierde as string[]).map(x => ({ t: x, tono: 'amber' as const })) });
    }
    detalle({ titulo: 'En qué lengua se busca su mercado', sub: 'La lengua del negocio, la de su categoría y la del que compra: no son la misma.', bloques: b, fuente: String(lex.fuente || '') });
  };

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Globe size={19} />}
        titulo="Mercado"
        sub="Lo que el motor encontró en su mercado, con el dato y de dónde salió. Todo sale del back de su negocio."
        nums={[
          { v: String(hallazgos.length), l: hallazgos.length === 1 ? 'hallazgo de su mercado' : 'hallazgos de su mercado' },
          { v: `${d.desvioPct.toLocaleString('es-CO')}%`, l: 'desvío del modelo predictivo', c: 'var(--purple3)' },
          { v: String(d.corridas.length), l: 'veces que el equipo investigó' },
          { v: fechaCorta(d.corridas[0]?.empezada_at) || 'todavía no', l: 'última investigación' },
        ]}
        accion={
          <div className="row" style={{ gap: 8 }}>
            <Button
              variant="outline"
              onClick={abrirInforme}
              title="Abre el informe completo del mercado: quiénes juegan, las piezas vivas que el mercado ya premió con tiempo, el patrón del rubro, el hueco que nadie ocupa y la pieza propuesta. No cambia nada: se cierra con la X o pulsando afuera."
            >
              Ver el informe completo
            </Button>
            <Button
              variant="outline"
              onClick={abrirPrompts}
              title="Abre los prompts de generación (imagen o video) que armó Iris con la analítica del mercado, y la traza de cómo se armó cada campo: colores, tipografía, formato, escenas y estilo UGC o toma. Todavía no hay generador conectado: esto queda listo para pegar. No cambia nada."
            >
              Ver los prompts de generación{d.prompts.length ? ` (${d.prompts.length})` : ''}
            </Button>
            <Button
              variant="outline"
              onClick={abrirFormatos}
              title="Abre lo que el equipo midió sobre formatos y tendencias: qué formato aguanta en cada plaza con sus días, quién ya repite molde, las series que están corriendo, y lo que se está hablando por país con su alcance (local, regional o de varios mercados). No cambia nada."
            >
              Ver formatos y tendencias
            </Button>
          </div>
        }
      />

      {/* ==================== SI EL NEGOCIO NO DIJO QUÉ HACE NI DÓNDE, SE DICE ACÁ MISMO ====================
          Es lo primero que hay que ver en esta pantalla: sin rubro y sin ciudad el equipo sale a investigar
          sin saber qué buscar, vuelve con las manos vacías y parece que el motor falló. No falló: le falta
          el dato. El aviso lleva derecho a Primeros pasos. */}
      {!d.cargando && !String(d.negocio?.description || '').trim() && !String(d.negocio?.zona || '').trim() && (
        <Card className="decide" title={<span className="row" style={{ gap: 8 }}><I_Globe size={14} style={{ color: 'var(--amber)' }} /> El motor no puede investigar todavía</span>}
          action={<Badge tone="amber">falta un dato suyo</Badge>}>
          <div className="bs">
            Para leer su mercado, el equipo necesita saber <b>qué hace su negocio</b> y <b>dónde vende</b>.
            Hoy no los tiene, así que sale a investigar sin saber qué buscar y vuelve con las manos vacías:
            por eso la investigación no arroja hallazgos. <b>No es una falla del motor: es un dato que falta.</b>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Button title="Primeros pasos: cuénte qué hace su negocio, qué vende y dónde vende. Con eso el equipo ya puede leer su mercado."
              onClick={() => { if (setVista) setVista('onboarding'); setToast('Complete Primeros pasos: sin el rubro y la ciudad el equipo no sabe qué buscar'); }}>
              Completar Primeros pasos
            </Button>
            <Button variant="outline" title="Vuelve a leer lo que hay guardado en el servidor. No gasta créditos."
              onClick={() => void d.refrescar()}>Volver a leer</Button>
          </div>
        </Card>
      )}

      {/* ============ LOS HALLAZGOS Y EL PÚBLICO, LOS DOS DEL BACK ============ */}
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--purple3)' }} /> Lo que encontró el motor en su mercado</span>}
          action={<Badge tone="purple">{hallazgos.length === 1 ? '1 hallazgo' : `${hallazgos.length} hallazgos`}</Badge>}
        >
          {hallazgos.length === 0 ? (
            /* ---------- SIN HALLAZGOS: se dice, y se ofrece la investigación de verdad ----------
               Cada hallazgo trae su dato, su porqué y SU FUENTE a la vista: la fuente no se esconde. */
            investigando ? (
              <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--purple3)', fontWeight: 700 }}>
                <I_Zap size={13} /> El equipo salió a investigar su mercado: los hallazgos aparecen aquí en cuanto termine.
              </div>
            ) : d.cargando ? (
              <div className="tiny muted">Leyendo lo que investigó el motor…</div>
            ) : (
              <EstadoVacio
                titulo={d.real ? 'El motor todavía no investigó su mercado' : 'Su mercado todavía no se ha leído'}
                texto={d.real
                  ? 'Todavía no hay ningún hallazgo: el equipo sale a mirar qué está haciendo su competencia y qué está funcionando en su rubro. Lo que encuentra queda aquí con el dato, su porqué y de dónde salió.'
                  : 'El mercado se llena cuando los agentes investiguen: hoy no hay ni un hallazgo suyo. Conecte sus cuentas y el equipo sale a mirar qué está haciendo su competencia y qué está funcionando en su rubro.'}
                {...invitar()} />
            )
          ) : (
            <>
              {hallazgos.map(h => (
                <div key={h.id} className="alarm oportunidad">
                  <div className="alarm-head">
                    <span className="alarm-sev oportunidad">{h.tipo}</span>
                    <span className="tiny muted">{fechaCorta(h.created_at)}</span>
                  </div>
                  <div className="alarm-title" style={{ minWidth: 0 }}>{h.titulo}</div>
                  <div className="alarm-money">
                    <span className="ico" style={{ color: 'var(--purple3)' }}><I_Trend size={14} /></span>
                    <span><b style={{ color: 'var(--purple3)' }}>El dato: </b>{h.dato}</span>
                  </div>
                  <div className="alarm-sug"><b>Por qué importa: </b>{h.porque}</div>
                  <div className="acc-why"><b>Fuente: </b>{h.fuente}</div>
                </div>
              ))}
              <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
                <div className="dato"><span className="dato-l">Hallazgos de su mercado</span><span className="dato-v">{hallazgos.length}</span></div>
                <div className="dato"><span className="dato-l">El más reciente</span><span className="dato-v">{fechaCorta(hallazgos[0].created_at)}</span></div>
                <div className="dato"><span className="dato-l">Desvío del modelo</span><span className="dato-v" style={{ color: d.desvioPct <= 10 ? 'var(--green)' : 'var(--amber)' }}>{d.desvioPct.toLocaleString('es-CO')}%</span></div>
              </div>
              <div className="acc-why">
                Cada hallazgo sale de <b>una fuente concreta</b>: si la fuente no se puede mostrar, el hallazgo no se muestra.
                El desvío de <b>{d.desvioPct.toLocaleString('es-CO')}%</b> es la diferencia entre lo que predijo el modelo y lo que pasó de verdad: con eso corrige la próxima estimación.
              </div>
            </>
          )}
        </Card>

        {/* ---------- SU PÚBLICO CALIBRADO ----------
            Lo que el back sí sabe de su mercado es cómo está repartido su público, con el peso y el
            origen del dato de cada segmento: un peso sin origen no se muestra. */}
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--purple3)' }} /> Su público, calibrado</span>}
          action={<Badge tone={d.calibracion?.calibrada ? 'purple' : 'muted'}>
            {d.calibracion ? `${d.calibracion.total} agentes` : (d.real ? 'leyendo' : 'sin leer')}
          </Badge>}
        >
          {!d.real ? (
            <EstadoVacio
              titulo="Todavía no se ha leído su público"
              texto="Aquí se ve cómo está repartido su público: los agentes de cada segmento, cuánto pesa cada uno y de dónde salió el dato. Cuando el panel lea su cuenta, aparece en esta tarjeta." />
          ) : !d.calibracion ? (
            /* El back no respondió: se dice eso, no que no haya público. */
            <EstadoVacio
              {...vacio('Todavía no se pudo leer su público', 'Esta tarjeta muestra cómo está repartido su público en el back: los agentes de cada segmento, cuánto pesa cada uno y de dónde salió el dato. El servidor no respondió; vuelva a leerlo y aparece.')}
              accion="Volver a leer"
              onAccion={() => void d.refrescar()}
            />
          ) : !d.calibracion.calibrada ? (
            /* Sin calibrar, el panel entero pesa igual en todos los segmentos: hay que decirlo tal cual. */
            <EstadoVacio
              titulo="Sus 500 agentes trabajan con su propio criterio"
              texto={`Los ${d.calibracion.total} agentes del panel están repartidos en partes iguales: todavía no se calibró con su público real. Cuando el panel lea las proporciones de quienes interactúan con su cuenta, cada segmento empieza a pesar lo que pesa de verdad y esta tarjeta muestra su público, no un promedio.`}
            />
          ) : (
            /* ---------- EL PÚBLICO CALIBRADO, REAL ----------
               El peso va en la barra (se ve la proporción) y cada segmento queda con sus agentes, su
               peso y el origen del dato. */
            <>
              <div className="como-se-lee">
                <b>Cómo se lee:</b> cada barra es un segmento de su público y su altura, cuánto pesa
                dentro del panel. El número de arriba es ese peso como porcentaje de su público real.
                Abajo queda cada segmento con sus agentes, su peso y de dónde salió el dato.
              </div>
              <Bars data={pesos} labels={etiquetas} color="var(--purple2)" fmt={v => pct(v)} />
              <div className="guards">
                {segmentos.map(s => (
                  <div key={s.segmento} className="guard">
                    <I_Users size={14} style={{ color: 'var(--purple3)', flexShrink: 0 }} />
                    <span className="guard-lb">{s.segmento}
                      <small>{origenTexto(s.origen)} · {pct(s.peso)} de su público real</small>
                    </span>
                    <span className="guard-val">{s.agentes} {s.agentes === 1 ? 'agente' : 'agentes'}</span>
                  </div>
                ))}
              </div>
              <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
                <div className="dato"><span className="dato-l">Agentes en su público</span><span className="dato-v">{d.calibracion.total}</span></div>
                <div className="dato"><span className="dato-l">Segmentos</span><span className="dato-v">{segmentos.length}</span></div>
                <div className="dato"><span className="dato-l">Origen del dato</span><span className="dato-v">{origenTexto(d.calibracion.ultima?.origen)}</span></div>
                <div className="dato"><span className="dato-l">Calibrado el</span><span className="dato-v">{fechaCorta(d.calibracion.ultima?.created_at) || 'sin fecha'}</span></div>
              </div>
              <div className="acc-why">
                <b>Fuente: </b>{d.calibracion.ultima?.fuente || 'sin fuente declarada'}
                {d.calibracion.ultima?.created_at ? ` · calibrado el ${fechaCorta(d.calibracion.ultima.created_at)}` : ''}
              </div>
              <div className="acc-why"><b>Confianza: </b>{d.calibracion.confianza}</div>
            </>
          )}
        </Card>
      </div>

      {/* ============ LAS CORRIDAS Y EL ACIERTO DEL MODELO ============
          Cada corrida de la investigación y cada caso medido del modelo, tal como llegan del back:
          con su hora, su estado, su fuente y su fecha. Sin back, las dos tarjetas dicen qué hacer. */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--purple3)' }} /> Las veces que el equipo investigó</span>}
          action={<Badge tone={d.corridas.length ? 'purple' : 'muted'}>
            {d.corridas.length === 1 ? '1 corrida' : `${d.corridas.length} corridas`}
          </Badge>}
        >
          {d.corridas.length === 0 ? (
            /* Sin corridas no se inventa una investigación: se invita a que los agentes salgan. */
            <EstadoVacio
              {...vacio(
                d.real ? 'El motor todavía no investigó su mercado' : 'El equipo todavía no ha investigado',
                d.real
                  ? 'Cada vez que el motor corre, deja una corrida con lo que hizo cada agente y aparece aquí. Todavía no hay ninguna: no hay ningún resultado de mercado que mostrarle.'
                  : 'El equipo investiga cuando el motor corre, y para eso necesita sus cuentas conectadas. Hasta entonces esta tarjeta no muestra ninguna investigación, porque no hay ninguna.',
              )}
              {...invitar()} />
          ) : (
            <>
              <div className="tl">
                {d.corridas.slice(0, 6).map(c => (
                  <div key={c.id} className="tl-item">
                    <span className="tl-dot" style={{ background: c.estado === 'ok' || c.estado === 'terminada' ? 'var(--green)' : 'var(--amber)' }} />
                    <span className="tl-time">{fechaCorta(c.empezada_at)}</span>
                    <div className="tl-body">
                      <div className="tl-text">
                        <b style={{ color: 'var(--purple3)' }}>El equipo</b> investigó {c.motivo || 'sin motivo cargado'}
                        <span className="tiny muted"> · {c.estado || 'en curso'}{typeof c.creditos === 'number' ? ` · ${c.creditos} créditos` : ''}{c.tareas?.length ? ` · ${c.tareas.length} ${c.tareas.length === 1 ? 'tarea' : 'tareas'}` : ''}</span>
                      </div>
                      {(c.tareas ?? []).slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)).map((t, i) => (
                        <div key={i} className="tl-anchor" style={{ display: 'block' }}>
                          <b style={{ color: 'var(--purple3)' }}>{t.agente}</b> {t.que}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="acc-why">
                Cada línea es una corrida del back: la hora, el estado y los créditos son los que quedaron
                registrados, y cada tarea es de un agente con nombre.
              </div>
            </>
          )}
          <div className="acc-why">
            La investigación del mercado <b>no gasta presupuesto</b>: los agentes leen y comparan, no pautan.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Target size={14} style={{ color: 'var(--purple3)' }} /> Qué tan cerca le pega el modelo</span>}
          action={<Badge tone={d.backtest && d.backtest.casos ? 'purple' : 'muted'}>
            {d.backtest ? `${d.backtest.casos} ${d.backtest.casos === 1 ? 'caso medido' : 'casos medidos'}` : (d.real ? 'leyendo' : 'sin medir')}
          </Badge>}
        >
          {!d.real ? (
            <EstadoVacio
              titulo="Todavía no hay ningún acierto medido"
              texto="Esta tarjeta mide la predicción contra lo que pasó de verdad: el error promedio y el error de cada caso. Se llena cuando una pieza publicada tenga su resultado real y el panel pueda leerlo del back." />
          ) : !d.backtest ? (
            <EstadoVacio
              {...vacio('Todavía no se pudo leer el acierto del modelo', 'Esta tarjeta mide la predicción contra lo que pasó de verdad: el error promedio y el error de cada caso. El servidor no respondió; vuelva a leerlo y aparece.')}
              accion="Volver a leer"
              onAccion={() => void d.refrescar()}
            />
          ) : d.backtest.casos === 0 ? (
            <EstadoVacio
              titulo="El modelo todavía no se midió contra la realidad"
              texto="Todavía no hay ninguna predicción comparada con lo que pasó. El modelo se corrige con el desvío, y ese desvío existe cuando una pieza publicada tiene su resultado real: en cuanto haya un caso, aquí queda su error y el promedio de todos."
            />
          ) : (
            /* ---------- EL BACKTEST, REAL ----------
               El error de cada caso contra el promedio del propio modelo: verde quedó en el promedio
               o mejor, ámbar se corrió más. La métrica y la fecha van en cada caso, siempre. */
            <>
              <div className="como-se-lee">
                <b>Cómo se lee:</b> el error promedio es la distancia entre lo que predijo el modelo y lo
                que pasó, en la unidad de la métrica. El porcentaje lo pone en relación a lo predicho, para
                poder comparar piezas de tamaños distintos. En la lista, <b style={{ color: 'var(--green)' }}>verde</b> es
                un caso que quedó en ese promedio o mejor, y <b style={{ color: 'var(--amber)' }}>ámbar</b> uno
                que se corrió más.
              </div>
              <div className="datos-row">
                <div className="dato"><span className="dato-l">Error promedio</span><span className="dato-v">{d.backtest.mae ?? '—'}</span></div>
                <div className="dato"><span className="dato-l">Error sobre lo predicho</span><span className="dato-v">{d.backtest.error_pct == null ? '—' : `${d.backtest.error_pct.toLocaleString('es-CO')}%`}</span></div>
                <div className="dato"><span className="dato-l">Casos medidos</span><span className="dato-v">{d.backtest.casos}</span></div>
                <div className="dato"><span className="dato-l">Con métrica real</span><span className="dato-v">{d.backtest.casos_con_metrica_real}</span></div>
              </div>
              <div className="acc-why"><b>Confianza: </b>{d.backtest.confianza}</div>
              <div className="bs" style={{ marginBottom: 8 }}>Caso por caso:</div>
              <div className="guards">
                {(d.backtest.detalle ?? []).length === 0 ? (
                  <div className="bs">
                    El back no mandó el caso por caso: el promedio de arriba es todo lo que hay medido.
                  </div>
                ) : null}
                {(d.backtest.detalle ?? []).map((c, i) => (
                  <div key={i} className="guard">
                    <I_Target size={14} style={{ color: c.error <= (d.backtest?.mae ?? c.error) ? 'var(--green)' : 'var(--amber)', flexShrink: 0 }} />
                    <span className="guard-lb">
                      Predijo {c.predicho.toLocaleString('es-CO')} · pasó {c.real.toLocaleString('es-CO')}
                      <small>{c.metrica || 'reacción del público'} · {c.con_metrica_real ? 'resultado real de su cuenta' : 'reacción de su público'} · {fechaCorta(c.cuando)}</small>
                    </span>
                    <span className="guard-val" style={{ color: c.error <= (d.backtest?.mae ?? c.error) ? 'var(--green)' : 'var(--amber)' }}>
                      error {c.error.toLocaleString('es-CO')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="acc-why">
                <b>Predijo antes de publicar y pasó de verdad:</b> es la única medición que no depende
                del propio modelo. {d.backtest.casos_con_metrica_real === 0
                  ? 'Ninguno tiene todavía la métrica real de la plataforma: se miden contra la reacción de su público.'
                  : d.backtest.casos_con_metrica_real === d.backtest.casos
                    ? 'Todos tienen la métrica real de la plataforma.'
                    : `${d.backtest.casos_con_metrica_real} de ${d.backtest.casos} ${d.backtest.casos_con_metrica_real === 1 ? 'tiene' : 'tienen'} la métrica real de la plataforma; el resto se mide contra la reacción de su público.`}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ============ LA DECISIÓN DE LA PIEZA Y LAS LENGUAS DEL MERCADO ============
          Las dos son tareas del equipo y salen de la última corrida: Tino decide qué se publica —y con qué
          se decidió, el mercado medido o el propio material del negocio— y Lex decide en qué lengua se
          busca el mercado y en qué lengua va la pieza. Si todavía no corrieron, se dice eso: no se inventa
          una pieza ni una lengua. */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Megaphone size={14} style={{ color: 'var(--purple3)' }} /> Lo que hay que publicar</span>}
          action={<Badge tone={tino ? 'purple' : 'muted'}>{tino ? `Modo ${String(tino.modo)}` : (d.real ? 'leyendo' : 'sin corrida')}</Badge>}
        >
          {!tino ? (
            <EstadoVacio
              {...vacio('Todavía no hay una decisión de qué publicar', 'La decisión la toma Tino: con el mercado ya leído, o —si todavía no hay— con el rubro, las palabras clave y el material que el negocio ya subió. Todavía no corrió, así que acá no hay ninguna pieza que mostrarle.')}
              {...invitar()} />
          ) : (
            <>
              <div className="bs" style={{ fontWeight: 700, marginBottom: 4 }}>{String(pieza?.que_se_publica || tino.porque || '')}</div>
              <div className="datos-row">
                <div className="dato"><span className="dato-l">A quién le habla</span><span className="dato-v">{String(entendido?.a_quien || '—')}</span></div>
                <div className="dato"><span className="dato-l">En qué lengua</span><span className="dato-v">{String(pieza?.idioma || '—')}</span></div>
                <div className="dato"><span className="dato-l">Dónde va</span><span className="dato-v">{String(pieza?.donde_va || '—')}</span></div>
                <div className="dato"><span className="dato-l">El formato</span><span className="dato-v">{String(pieza?.formato || '—')}</span></div>
              </div>
              <div className="guards">
                {[{ t: 'Gancho', s: pieza?.gancho }, { t: 'Cuerpo', s: pieza?.cuerpo }, { t: 'Cierre', s: pieza?.cierre }]
                  .filter(x => x.s)
                  .map(x => (
                    <div key={x.t} className="guard">
                      <I_Dot size={14} style={{ color: 'var(--purple3)', flexShrink: 0 }} />
                      <span className="guard-lb">{x.t}<small>{String(x.s)}</small></span>
                    </div>
                  ))}
              </div>
              <div className="acc-why">
                <b>{tino.por_que_sin_mercado ? 'Se decidió sin el informe del mercado: ' : 'Se decidió con el mercado medido: '}</b>
                {String(tino.por_que_sin_mercado || tino.fuente_tipo || '')}
              </div>
              <div className="acc-why"><b>Fuente: </b>{String(tino.fuente || 'sin fuente declarada')}</div>
              <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <Button variant="outline" onClick={abrirDecision} title="Abre la decisión completa: la pieza con su porqué, con qué se decidió, el gancho, el cuerpo y el cierre, las palabras con las que su cliente lo busca, qué elegimos nosotros y qué falta. No cambia nada.">
                  Ver la decisión completa
                </Button>
                {d.prompts.length ? (
                  <Button variant="outline" onClick={abrirPrompts} title="Abre los prompts de generación que armó Iris para esta pieza, con la traza de cada campo. No cambia nada.">
                    Ver los prompts de generación ({d.prompts.length})
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Globe size={14} style={{ color: 'var(--purple3)' }} /> En qué lengua se busca su mercado</span>}
          action={<Badge tone={lex ? 'purple' : 'muted'}>{lex ? `${(lex.lenguas_de_busqueda ?? []).length} lenguas` : (d.real ? 'leyendo' : 'sin corrida')}</Badge>}
        >
          {!lex ? (
            <EstadoVacio
              {...vacio('Todavía no se reconocieron las lenguas de su mercado', 'Antes de buscar, el equipo mide en qué lengua está el material del negocio, en qué lengua se escribe su categoría y en qué lengua lee el que compra en cada plaza. Todavía no corrió, así que acá no hay ninguna medición de lengua que mostrarle.')}
              {...invitar()} />
          ) : (
            <>
              <div className="datos-row">
                <div className="dato"><span className="dato-l">La lengua de su material</span><span className="dato-v">{String(lex.lengua_del_negocio?.lengua || '—')}</span></div>
                <div className="dato"><span className="dato-l">La pieza va en</span><span className="dato-v">{String(lex.la_pieza_en_que_lengua?.nombre || '—')}</span></div>
                <div className="dato"><span className="dato-l">Se busca en</span><span className="dato-v">{(lex.lenguas_de_busqueda ?? []).map((l: any) => l.nombre).join(' · ') || '—'}</span></div>
                <div className="dato"><span className="dato-l">Palabras de su categoría</span><span className="dato-v">{Object.values(lex.palabras_por_lengua ?? {}).reduce((n: number, v: any) => n + [].concat(v).length, 0)} en {Object.keys(lex.palabras_por_lengua ?? {}).length} lenguas</span></div>
              </div>
              <div className="guards">
                {(lex.plan_por_plaza ?? []).map((pl: any) => (
                  <div key={pl.plaza} className="guard">
                    <I_Dot size={14} style={{ color: 'var(--purple3)', flexShrink: 0 }} />
                    <span className="guard-lb">{pl.plaza}
                      <small>{pl.avisos_leidos} avisos leídos · el idioma de esa plaza es el {pl.lengua_de_la_plaza ?? pl.lengua_del_que_compra}</small>
                    </span>
                    <span className="guard-val">{pl.en_que_lengua_estan_los_avisos}</span>
                  </div>
                ))}
              </div>
              <div className="acc-why"><b>La lengua de sus páginas: </b>{String(lex.lengua_de_sus_paginas || '—')}</div>
              <div className="acc-why"><b>Su categoría: </b>{String(lex.lengua_de_la_categoria || '—')}</div>
              {(lex.lo_que_se_pierde ?? []).length ? (
                <div className="acc-why" style={{ color: 'var(--amber)' }}>
                  <b>Si no se busca así: </b>{String((lex.lo_que_se_pierde as string[])[0])}
                </div>
              ) : null}
              <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <Button variant="outline" onClick={abrirLenguas} title="Abre el plan de lenguas completo: la lengua del negocio, la de sus páginas y la de su categoría, las lenguas en las que se busca con su para qué, el detalle plaza por plaza y lo que se pierde sin buscarlo así. No cambia nada.">
                  Ver el plan de lenguas
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
