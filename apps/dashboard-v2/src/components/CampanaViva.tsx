import { useState } from 'react';
import { Badge, Button, Dinero } from './ui';
import { I_File, I_Users, I_Cal, I_Target, I_Play, I_Pause } from './icons';
import { useDetalle } from './Detalle';
import type { Campana } from '../data/demo';
import { useDatos } from '../api/datos';
import { fechaCorta } from './mirofishDatos';

// =============================================================================================
// LA CAMPAÑA QUE ESTÁ EN VIVO — la tarjeta visual de la sub-pantalla 5
//
// Arriba, el marco de la pieza. Abajo, los datos de la campaña y su resultado.
//
// DE DÓNDE SALE CADA COSA (la regla de la casa):
//   · La campaña, su gasto, su ROAS, su presupuesto y su estado salen del servidor. Lo que el back
//     todavía no manda de una campaña —la pieza que corre, el alcance, las conversiones, el avance del
//     presupuesto— se muestra en «—» o con una línea que lo dice. Nunca un cero ni un número de ejemplo:
//     un «—» se lee como «todavía no llega», un 0 se lee como «no pasó nada».
//   · Las piezas que se abren con el botón son las que el servidor tiene de este negocio, con el puntaje
//     de MiroFish. Sin piezas cargadas, el botón no está y la tarjeta lo dice.
//   · Acá no hay versión de ejemplo: si un dato no existe, no se muestra.
// =============================================================================================

export function CampanaViva({ c, setToast }: { c: Campana; setToast: (t: string) => void }) {
  const d = useDatos();
  const conDatos = c.roas !== '—';
  const detalle = useDetalle();
  // Pausar es de la tarjeta, no del dato: queda marcado a la vista y se reanuda igual.
  const [enPausa, setEnPausa] = useState(false);

  const pausar = () => {
    setEnPausa(true);
    setToast(`«${c.nombre}» quedó en pausa en esta pantalla: el cambio todavía no llega al servidor`);
  };
  const reanudar = () => {
    setEnPausa(false);
    setToast(`«${c.nombre}» vuelve a quedar activa en esta pantalla`);
  };

  // Las piezas de este negocio, tal como están en el servidor.
  const piezasBack = d.piezas;

  /** El panel de las piezas: las del servidor con su puntaje, y el estado de la campaña arriba. */
  const verPiezas = () => detalle({
    titulo: `Las piezas de «${c.nombre}»`,
    sub: piezasBack.length
      ? `Estas son las ${piezasBack.length} piezas que el servidor tiene de su negocio, con el puntaje que les dio MiroFish. La campaña registra ${c.artefactos}.`
      : `La campaña registra ${c.artefactos} y el servidor todavía no tiene piezas cargadas para este negocio, así que no hay ninguna que mostrar.`,
    bloques: piezasBack.length ? [
      { tipo: 'datos', filas: [
        { k: 'Piezas que registra la campaña', v: String(c.artefactos), s: 'lo que dice su ficha en el servidor' },
        { k: 'Piezas que tiene el servidor', v: String(piezasBack.length), s: 'con su formato, su estado y su puntaje' },
        { k: 'Estado ahora', v: enPausa ? 'en pausa' : 'en vivo', s: enPausa ? 'quedó marcada en pausa en esta pantalla: el servidor sigue igual' : 'el servidor la tiene activa', tono: enPausa ? 'amber' : 'green' },
        { k: 'Quién las juzgó', v: 'los 5 jueces de MiroFish', s: 'mirando la pieza, antes de que gastara un peso' },
        { k: 'Puntajes de MiroFish', v: String(d.evaluaciones.length), s: 'evaluaciones guardadas de este negocio' },
      ] },
      { tipo: 'filas', items: piezasBack.map(p => ({
        t: p.titulo,
        s: `${p.formato} · ${p.estado}${p.created_at ? ` · creada el ${fechaCorta(p.created_at)}` : ''}`,
        etiqueta: p.puntaje == null ? 'sin puntaje' : `${Number(p.puntaje)} de 100`,
        tono: p.puntaje == null ? 'muted' as const : Number(p.puntaje) >= 80 ? 'green' as const : 'amber' as const,
      })) },
      { tipo: 'aviso', tono: 'amber', texto: 'Arriba de 80 pasa el mínimo, entre 60 y 80 vuelve con la objeción del juez que votó más bajo y abajo de 60 no se gasta un peso: es la misma regla que ya vio en la galería del paso 3.' },
    ] : [
      { tipo: 'texto', texto: 'El servidor no tiene piezas cargadas para este negocio: no hay ninguna que mostrar, y este panel no rellena el hueco con piezas de ejemplo.' },
      { tipo: 'aviso', tono: 'amber', texto: 'Cuando el motor cree la primera pieza y MiroFish la vote, aparece aquí con su formato, su estado y su puntaje.' },
    ],
    fuente: 'Las piezas, su formato, su estado y su puntaje son los que el servidor tiene guardados para este negocio.',
    acciones: [
      enPausa
        ? { label: `Reanudar «${c.nombre}»`, variante: 'primary' as const, onClick: reanudar }
        : { label: `Pausar «${c.nombre}»`, variante: 'primary' as const, onClick: pausar },
      { label: 'Cerrar', onClick: () => {} },
    ],
  });

  return (
    <div className="cv">
      {/* a) El marco de la pieza que está corriendo. El archivo y su formato todavía no llegan del
          servidor: el marco lo dice, en vez de mostrar una pieza de ejemplo. */}
      <div className="pz-frame cv-frame" style={{ background: 'linear-gradient(150deg, var(--bg3), var(--bg2) 70%, var(--bg3))' }}>
        {enPausa
          ? <span className="cv-live" style={{ background: 'rgba(245,158,11,.92)', color: '#1c1917' }}
              title="Quedó marcada en pausa en esta pantalla: el servidor sigue como está hasta que el cambio se le mande.">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1c1917', flexShrink: 0 }} /> EN PAUSA
            </span>
          : <span className="cv-live" title="La campaña está activa en el servidor">
              <span className="dot-live" /> EN VIVO
            </span>}
        <span className="pz-formato"><I_Target size={12} /> {c.tipo}</span>
        <span className="pz-ico"><I_File size={34} /></span>
        <span className="tiny" style={{ fontWeight: 700, opacity: .85 }}>Lo que busca esta campaña</span>
        <span className="pz-gancho">{c.copy || 'El servidor todavía no manda el objetivo de esta campaña.'}</span>
        <span className="pz-medida">El servidor todavía no manda la pieza que está corriendo: su formato y su archivo no llegan en la ficha de la campaña.</span>
      </div>

      <div className="cv-body">
        {/* b) De qué es la campaña: nombre, tipo, dónde corre, a quién le habla y desde cuándo */}
        <div className="row spread" style={{ gap: 10, alignItems: 'flex-start' }}>
          <div className="row" style={{ gap: 9, minWidth: 0 }}>
            <span style={{ fontSize: 20 }}>{c.emoji}</span>
            <div style={{ minWidth: 0 }}>
              <div className="bt">{c.nombre}</div>
              <div className="tiny muted">{c.tipo} · registrada en el servidor</div>
            </div>
          </div>
          <Badge tone={enPausa ? 'amber' : 'green'}>{enPausa ? 'en pausa' : c.estado}</Badge>
        </div>

        {/* La consecuencia de la marca, a la vista: qué se frena y cómo se vuelve atrás. */}
        {enPausa && (
          <div className="tiny" style={{ color: 'var(--amber)', fontWeight: 700 }}>
            Marcada en pausa en esta pantalla. El servidor sigue con la campaña como estaba: para que la
            pausa llegue de verdad hay que mandarle el cambio al back.
          </div>
        )}

        <div className="cv-meta">
          <span className="row" style={{ gap: 7 }} title="Dónde se está publicando la campaña"><I_Target size={12} /> {c.plataforma}</span>
          <span className="row" style={{ gap: 7 }} title="El público objetivo todavía no llega en la ficha de la campaña"><I_Users size={12} /> {c.publico === '—' ? '— el público todavía no llega' : c.publico}</span>
          <span className="row" style={{ gap: 7 }} title="Desde cuándo corre la campaña"><I_Cal size={12} /> {c.fechas}</span>
        </div>

        {/* c) El resultado de esa campaña */}
        <div className="datos-row" style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div className="dato" title="Cuánto devuelve por cada peso invertido">
            <span className="dato-l">ROAS</span>
            <span className="dato-v" style={{ color: conDatos ? 'var(--green)' : 'var(--muted)' }}>{c.roas}</span>
          </div>
          <div className="dato" title="El alcance todavía no llega en la ficha de la campaña">
            <span className="dato-l">Alcance</span>
            <span className="dato-v" style={{ color: 'var(--muted)' }}>—</span>
          </div>
          <div className="dato" title="Las conversiones todavía no llegan en la ficha de la campaña">
            <span className="dato-l">Conversiones</span>
            <span className="dato-v" style={{ color: 'var(--muted)' }}>—</span>
          </div>
          <div className="dato" title="Lo que lleva gastado la campaña desde que arrancó">
            <span className="dato-l">Gastado</span>
            <span className="dato-v"><Dinero monto={c.gastado} /></span>
          </div>
        </div>

        <div className="tiny muted" style={{ lineHeight: 1.5 }}>
          El alcance, las conversiones y el avance del presupuesto todavía no llegan en la ficha de esta
          campaña: van en «—». Lo que sí está en el servidor —el ROAS, lo gastado y el presupuesto— se
          muestra tal cual.
        </div>

        <div className="datos-row">
          <div className="dato" title="Lo que le paga a Meta por día para que la campaña corra">
            <span className="dato-l">Presupuesto</span>
            <span className="dato-v"><Dinero monto={c.presupuesto} /></span>
          </div>
          <div className="dato" title="El costo por venta todavía no llega en la ficha de la campaña">
            <span className="dato-l">Costo por venta</span>
            <span className="dato-v" style={{ color: 'var(--muted)' }}><Dinero monto={c.costo} /></span>
          </div>
          <div className="dato" title="El puntaje de la pieza que corre todavía no llega en la ficha de la campaña">
            <span className="dato-l">Score</span>
            <span className="dato-v" style={{ color: 'var(--muted)' }}>—</span>
          </div>
          <div className="dato" title="Piezas que el motor creó para esta campaña">
            <span className="dato-l">Artefactos</span>
            <span className="dato-v" style={{ color: 'var(--purple3)' }}>{c.artefactos}</span>
          </div>
        </div>

        {/* d) Lo que puede hacer con la campaña */}
        <div className="row cv-acciones">
          {enPausa
            ? <Button variant="primary" className="btn-sm"
                title="Quita la marca de pausa: la tarjeta vuelve como estaba. No le manda nada al servidor y es reversible."
                onClick={reanudar}>
                <I_Play size={12} /> Reanudar
              </Button>
            : <Button variant="ghost" className="btn-sm"
                title="Marca la campaña en pausa en esta pantalla. El servidor sigue igual hasta que se le mande el cambio. Es reversible: con el mismo botón vuelve como estaba."
                onClick={pausar}>
                <I_Pause size={12} /> Pausar
              </Button>}
          {piezasBack.length === 0 ? (
            <span className="tiny muted" style={{ alignSelf: 'center' }}>
              Todavía no hay piezas cargadas de este negocio: el botón para verlas aparece con la primera.
            </span>
          ) : (
            <Button variant="outline" className="btn-sm"
              title={`Abre las ${piezasBack.length} piezas que el servidor tiene de este negocio: el título, el formato, el estado y el puntaje que les dio MiroFish. No cambia nada: solo se mira.`}
              onClick={verPiezas}>
              <I_File size={12} /> Ver las piezas
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
