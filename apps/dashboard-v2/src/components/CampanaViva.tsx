import { useState } from 'react';
import { Badge, Button, Progress, Dinero } from './ui';
import { I_Film, I_Image, I_Pause, I_File, I_Users, I_Cal, I_Target, I_Play } from './icons';
import { useDetalle } from './Detalle';
import { OPCIONES, PERFILES, puntaje } from '../data/mirofish';
import type { Campana } from '../data/demo';

// =============================================================================================
// LA CAMPAÑA QUE ESTÁ EN VIVO — la tarjeta visual de la sub-pantalla 5
//
// Arriba, el marco de la pieza que está corriendo (mismo lenguaje visual que la galería:
// .pz-frame, .pz-formato, .pz-ico, .pz-gancho, .pz-medida) con el texto del anuncio como si
// fuera el pie de la pieza. Abajo, los datos de la campaña y el resultado de la misma.
//
// Los dos botones del pie producen algo que SE VE, no un aviso que se va solo:
//   · «Pausar» cambia el estado de ESTA tarjeta —el rótulo del marco, el badge, el botón que pasa
//     a «Reanudar» y la línea de qué implica— y no toca los números de la vitrina: el estado de
//     pausa vive en la tarjeta, no en demo.ts, así que el mes sigue diciendo lo mismo.
//   · «Ver las piezas» abre el panel de detalle con las piezas de esta campaña: el título, el
//     formato, el estado y el puntaje que les dio MiroFish, de la misma fuente que la galería.
// =============================================================================================

const esVideo = (f: Campana['formato']) => f === 'Video vertical' || f === 'Reel';

/** Dos medidas son la misma pieza si dicen lo mismo: «1080 × 1350» y «1080x1350» son la misma. */
const plano = (m: string) => m.toLowerCase().replace(/[×✕]/g, 'x').replace(/[^0-9a-z:]/g, '');

/** El estado de una pieza ya juzgada, con el mismo mínimo de 80 que usa todo el producto. */
const estadoDe = (p: number): { etiqueta: string; tono: 'green' | 'amber' | 'red' } =>
  p >= 80 ? { etiqueta: 'Publicada', tono: 'green' }
    : p >= 60 ? { etiqueta: 'Vuelve con la objeción', tono: 'amber' }
      : { etiqueta: 'Frenada', tono: 'red' };

export function CampanaViva({ c, setToast }: { c: Campana; setToast: (t: string) => void }) {
  const conDatos = c.roas !== '—';
  const detalle = useDetalle();
  // Pausar es de la tarjeta, no del dato: la campaña deja de gastar a la vista y se reanuda igual.
  const [enPausa, setEnPausa] = useState(false);

  const pausar = () => {
    setEnPausa(true);
    setToast(`«${c.nombre}» en pausa: frena el gasto y se reanuda cuando quiera`);
  };
  const reanudar = () => {
    setEnPausa(false);
    setToast(`«${c.nombre}» vuelve a estar en vivo, desde donde quedó`);
  };

  // Las piezas de esta campaña: el lote que juzgó MiroFish —las mismas 5 de la galería del paso 3—
  // con la que está corriendo adelante, que es la que se ve en el marco de arriba.
  const enVivo = OPCIONES.find(o => o.formato === c.formato && plano(o.medida) === plano(c.medida));
  const piezas = enVivo ? [enVivo, ...OPCIONES.filter(o => o.id !== enVivo.id)] : OPCIONES;

  // (a) El panel de las piezas: título, formato, estado y puntaje de cada una, más el estado de
  // la campaña. Desde aquí también se pausa y se reanuda, y el cambio se ve en la tarjeta.
  const verPiezas = () => detalle({
    titulo: `Las piezas de «${c.nombre}»`,
    sub: `Las ${piezas.length} del último lote que votó el panel, de las ${c.artefactos} que lleva esta campaña. La primera es la que salió a sus cuentas.`,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Piezas creadas para esta campaña', v: String(c.artefactos), s: 'entre las que corren, las que volvieron con la objeción y las que se frenaron' },
        { k: 'La que está corriendo', v: `${c.formato} · ${c.medida}`, s: `${c.plataforma} · es la del marco de arriba` },
        { k: 'Puntaje de esa pieza', v: `${c.score} de 100`, s: 'el mínimo para publicar es 80', tono: c.score >= 80 ? 'green' : 'amber' },
        { k: 'Estado ahora', v: enPausa ? 'en pausa' : 'en vivo', s: enPausa ? 'dejó de gastar y de sumar: se reanuda cuando quiera' : 'está gastando y midiendo', tono: enPausa ? 'amber' : 'green' },
        { k: 'Quién la juzgó', v: `${PERFILES.length} jueces + 500 del público`, s: 'mirando la pieza, antes de que gastara un peso' },
      ] },
      { tipo: 'filas', items: piezas.map(o => {
        const esLaViva = o.id === enVivo?.id;
        const p = esLaViva ? c.score : puntaje(o);
        const est: { etiqueta: string; tono: 'green' | 'amber' | 'red' } = esLaViva
          ? { etiqueta: enPausa ? 'En pausa' : 'En vivo', tono: enPausa ? 'amber' : 'green' }
          : estadoDe(p);
        return {
          t: o.titulo,
          s: `${o.formato} · ${o.medida} · puntaje ${p} de 100${esLaViva ? ' · es la que corre en el marco de arriba' : ''}`,
          etiqueta: est.etiqueta,
          tono: est.tono,
        };
      }) },
      { tipo: 'aviso', tono: 'amber', texto: 'Arriba de 80 se publica, entre 60 y 80 vuelve con la objeción del juez que votó más bajo y abajo de 60 no se gasta un peso: es la misma regla que ya vio en la galería del paso 3.' },
    ],
    fuente: 'Los votos son los de MiroFish: los mismos 5 jueces y las mismas piezas de la galería del paso 3. El puntaje de la que corre, el gasto y el alcance son los de esta campaña, tal como están en la tarjeta.',
    acciones: [
      enPausa
        ? { label: `Reanudar «${c.nombre}»`, variante: 'primary' as const, onClick: reanudar }
        : { label: `Pausar «${c.nombre}»`, variante: 'primary' as const, onClick: pausar },
      { label: 'Cerrar', onClick: () => {} },
    ],
  });

  return (
    <div className="cv">
      {/* a) El marco visual de la pieza: el formato, el ícono, el rótulo EN VIVO y el texto del anuncio */}
      <div className="pz-frame cv-frame" style={{ background: `linear-gradient(150deg, ${c.color}, ${c.color}22 70%, var(--bg3))` }}>
        {enPausa
          ? <span className="cv-live" style={{ background: 'rgba(245,158,11,.92)', color: '#1c1917' }}
              title="La campaña está en pausa: la pieza no se está mostrando y no gasta. Se reanuda con el botón de abajo.">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1c1917', flexShrink: 0 }} /> EN PAUSA
            </span>
          : <span className="cv-live" title="La pieza se está mostrando ahora mismo: la campaña está gastando y midiendo">
              <span className="dot-live" /> EN VIVO
            </span>}
        <span className="pz-formato">{esVideo(c.formato) ? <><I_Film size={12} /> {c.formato}</> : <><I_Image size={12} /> {c.formato}</>}</span>
        <span className="pz-ico">{esVideo(c.formato) ? <I_Film size={34} /> : <I_Image size={34} />}</span>
        <span className="pz-gancho">{c.copy}</span>
        <span className="pz-medida">{c.medida} · Botón: «{c.cta}»</span>
      </div>

      <div className="cv-body">
        {/* b) De qué es la campaña: nombre, objetivo, dónde corre, a quién le habla y desde cuándo */}
        <div className="row spread" style={{ gap: 10, alignItems: 'flex-start' }}>
          <div className="row" style={{ gap: 9, minWidth: 0 }}>
            <span style={{ fontSize: 20 }}>{c.emoji}</span>
            <div style={{ minWidth: 0 }}>
              <div className="bt">{c.nombre}</div>
              <div className="tiny muted">{c.tipo}</div>
            </div>
          </div>
          <Badge tone={enPausa ? 'amber' : 'green'}>{enPausa ? 'en pausa' : c.estado}</Badge>
        </div>

        {/* La consecuencia de la pausa, a la vista: qué se frena y cómo se vuelve atrás. */}
        {enPausa && (
          <div className="tiny" style={{ color: 'var(--amber)', fontWeight: 700 }}>
            En pausa: deja de gastar y de sumar alcance. Se reanuda con el botón de abajo, desde donde quedó: no pierde el historial ni la pieza.
          </div>
        )}

        <div className="cv-meta">
          <span className="row" style={{ gap: 7 }} title="Dónde se está publicando la pieza"><I_Target size={12} /> {c.plataforma}</span>
          <span className="row" style={{ gap: 7 }} title="A quién le está hablando la campaña"><I_Users size={12} /> {c.publico}</span>
          <span className="row" style={{ gap: 7 }} title="Desde cuándo corre y en qué día va"><I_Cal size={12} /> {c.fechas}</span>
        </div>

        {/* c) El resultado de esa campaña */}
        <div className="datos-row" style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div className="dato" title="Cuánto devuelve por cada peso invertido">
            <span className="dato-l">ROAS</span>
            <span className="dato-v" style={{ color: conDatos ? 'var(--green)' : 'var(--muted)' }}>{c.roas}</span>
          </div>
          <div className="dato" title="Personas distintas que vieron la pieza">
            <span className="dato-l">Alcance</span>
            <span className="dato-v">{c.alcance}</span>
          </div>
          <div className="dato" title="Ventas y conversaciones cerradas por esta campaña">
            <span className="dato-l">Conversiones</span>
            <span className="dato-v">{c.conversiones}</span>
          </div>
          <div className="dato" title="Lo que lleva gastado la campaña desde que arrancó">
            <span className="dato-l">Gastado</span>
            <span className="dato-v"><Dinero monto={c.gastado} /></span>
          </div>
        </div>

        <div title="Cuánto del presupuesto que le asignó a esta campaña ya se gastó. Al 100% el motor la frena sola.">
          <div className="row spread tiny muted" style={{ marginBottom: 6 }}>
            <span>Presupuesto consumido</span><span>{c.pct}%</span>
          </div>
          <Progress pct={c.pct} color={c.pct > 70 ? 'amber' : 'purple'} />
        </div>

        <div className="datos-row">
          <div className="dato" title="Lo que le paga a Meta por día para que la campaña corra">
            <span className="dato-l">Presupuesto</span>
            <span className="dato-v"><Dinero monto={c.presupuesto} /></span>
          </div>
          <div className="dato" title="Cuánto le cuesta cada venta que trae esta campaña">
            <span className="dato-l">Costo por venta</span>
            <span className="dato-v" style={{ color: c.costo === '—' ? 'var(--muted)' : 'var(--txt)' }}><Dinero monto={c.costo} /></span>
          </div>
          <div className="dato" title="El puntaje que le dieron los 5 jueces de MiroFish antes de publicarse (mínimo 80)">
            <span className="dato-l">Score</span>
            <span className="dato-v" style={{ color: c.score >= 80 ? 'var(--green)' : c.score >= 60 ? 'var(--amber)' : 'var(--red)' }}>{c.score}</span>
          </div>
          <div className="dato" title="Piezas que el motor creó para esta campaña">
            <span className="dato-l">Artefactos</span>
            <span className="dato-v" style={{ color: 'var(--purple3)' }}>{c.artefactos}</span>
          </div>
        </div>

        {/* d) Lo que puede hacer con la campaña que está corriendo */}
        <div className="row cv-acciones">
          {enPausa
            ? <Button variant="primary" className="btn-sm"
                title="Vuelve a correr y sigue desde donde quedó: no perdió el historial ni la pieza, y el gasto del día se reactiva. Es reversible: la puede volver a pausar con este mismo botón."
                onClick={reanudar}>
                <I_Play size={12} /> Reanudar
              </Button>
            : <Button variant="ghost" className="btn-sm"
                title="Frena la campaña ahora: deja de gastar su presupuesto del día y de sumar alcance. Es reversible: la reanuda con este mismo botón y sigue desde donde quedó."
                onClick={pausar}>
                <I_Pause size={12} /> Pausar
              </Button>}
          <Button variant="outline" className="btn-sm"
            title={`Abre las ${c.artefactos} piezas de esta campaña: el título, el formato, el estado y el puntaje que les dio MiroFish a cada una. No cambia nada: solo se mira.`}
            onClick={verPiezas}>
            <I_File size={12} /> Ver las piezas
          </Button>
        </div>
      </div>
    </div>
  );
}
