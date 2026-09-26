import { useState } from 'react';
import { Card, Badge, Button } from './ui';
import { I_Check, I_Upload, I_Image, I_Film, I_Vote, I_Rocket, I_Play, I_Sparkle, I_ChevDn, I_ChevUp, I_Plus, I_Eye, I_X, I_Target } from './icons';
import { CUANTAS_PASAN, PERFILES } from '../data/mirofish';
import type { Modo } from '../data/demo';
import { useDatos, type Pieza as PiezaBack } from '../api/datos';
import { EstadoVacio } from './EstadoVacio';
import { fechaCorta } from './mirofishDatos';

// =============================================================================================
// CAMPAÑAS POR ETAPAS — cada paso es su propia pantalla, así no hay que scrollear media hora.
// El camino fácil es el primero: dice qué quiere y Sinkroo elige el tipo, crea todo y usted decide
// mirando las piezas.
//
// DE DÓNDE SALEN LAS PIEZAS DE LA GALERÍA (la regla de la casa):
//   · Son las piezas de este negocio (`/api/piezas`), con el puntaje que les dio MiroFish (el de sus
//     evaluaciones). Lo que el back no manda —el prompt, el texto del anuncio, la medida— no se
//     rellena con nada: no se muestra.
//   · Sin piezas no hay galería de ejemplo: va el estado vacío que dice qué hacer para tenerlas.
//   · Lo único fijo es el catálogo del producto: los tipos de campaña, los formatos y la regla de que
//     las tres primeras pasan. Eso no es dato de ningún negocio.
// =============================================================================================

export type PasoCampana = 1 | 2 | 3 | 4 | 5;

export const PASOS_CAMPANA: { n: PasoCampana; t: string; d: string; icono: string }[] = [
  { n: 1, t: 'Con Sinkroo', d: 'Sube la información y él arranca', icono: '🤖' },
  { n: 2, t: 'MiroFish', d: 'Todo pasa por aquí: vota y ordena', icono: '🗳️' },
  { n: 3, t: 'La galería', d: 'Lo que se creó, para decidir', icono: '🖼️' },
  { n: 4, t: 'En línea', d: 'Monitoreo directo, en vivo', icono: '📡' },
  { n: 5, t: 'Mis campañas', d: 'Lo que ya está corriendo', icono: '📊' },
];

export function Stepper({ actual, ir, listos }: { actual: PasoCampana; ir: (p: PasoCampana) => void; listos: PasoCampana[] }) {
  return (
    <div className="pasos">
      {PASOS_CAMPANA.map(p => {
        const hecho = listos.includes(p.n);
        return (
          <button key={p.n} className={`paso ${actual === p.n ? 'on' : ''} ${hecho ? 'done' : ''}`}
            title={`${p.t}: ${p.d}`} onClick={() => ir(p.n)}>
            <span className="paso-n">{hecho && actual !== p.n ? <I_Check size={13} /> : p.icono}</span>
            <span style={{ minWidth: 0 }}>
              <span className="paso-t">{p.t}</span>
              <span className="paso-d">{p.d}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// PASO 1 — Ingesta manual: el negocio sube lo que ya tiene
// ---------------------------------------------------------------------------------------------
export function IngestaManual({ setToast, ir }: { setToast: (t: string) => void; ir: (p: PasoCampana) => void }) {
  const d = useDatos();
  const [piezas, setPiezas] = useState<{ n: string; tipo: string; url: string | null }[]>([]);

  const subir = (files: FileList | null) => {
    if (!files || !files.length) return;
    const items = Array.from(files).map(f => ({
      n: f.name,
      tipo: f.type.startsWith('video/') ? 'video' : 'imagen',
      url: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
    }));
    setPiezas(p => [...p, ...items]);
    setToast(`${items.length} archivo${items.length > 1 ? 's' : ''} cargado${items.length > 1 ? 's' : ''}`);
  };

  return (
    <>
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Upload size={14} style={{ color: 'var(--purple3)' }} /> Paso 1 · Suba lo que ya tiene</span>}
          action={<Badge tone={piezas.length ? 'green' : 'amber'}>{piezas.length} {piezas.length === 1 ? 'pieza' : 'piezas'}</Badge>}
        >
          <div className="bs">
            Si ya tiene las imágenes o los videos hechos, súbalos aquí. <b>El motor no inventa nada</b>:
            los revisa, los puntúa con el panel y deja los mejores listos para publicar en sus redes.
          </div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <label className="dropzone" style={{ flex: '1 1 160px' }}>
              <span style={{ color: 'var(--purple3)' }}><I_Image size={20} /></span>
              <span className="small" style={{ fontWeight: 700 }}>Subir imágenes</span>
              <span className="tiny muted">JPG o PNG</span>
              <input type="file" multiple accept="image/*" style={{ display: 'none' }}
                onChange={e => subir(e.target.files)} />
            </label>
            <label className="dropzone" style={{ flex: '1 1 160px' }}>
              <span style={{ color: 'var(--purple3)' }}><I_Film size={20} /></span>
              <span className="small" style={{ fontWeight: 700 }}>Subir videos</span>
              <span className="tiny muted">MP4 o MOV</span>
              <input type="file" multiple accept="video/*" style={{ display: 'none' }}
                onChange={e => subir(e.target.files)} />
            </label>
          </div>
          {piezas.length > 0 && (
            <div className="mat-thumbs">
              {piezas.map((p, i) => (
                <div key={i} className="mat-thumb">
                  {p.url ? <img src={p.url} alt={p.n} /> : <span className="mat-thumb-ico">{p.tipo === 'video' ? <I_Film size={18} /> : <I_Image size={18} />}</span>}
                  <span className="mat-thumb-n" title={p.n}>{p.n}</span>
                  <button className="mat-thumb-x" title="Quitar" onClick={() => setPiezas(ps => ps.filter((_, ix) => ix !== i))}><I_X size={12} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            {/* La subida todavía no llega al servidor: el botón no puede decir que las piezas entraron
                a MiroFish, porque no entraron. Dice lo que sí va a pasar. */}
            <Button className="btn-sm" disabled={!piezas.length}
              title={!piezas.length
                ? 'Primero suba al menos una pieza'
                : 'Lo lleva a MiroFish con lo que su negocio tiene evaluado. Los archivos que eligió aquí son una vista previa en su navegador: todavía no se envían al servidor y por eso no aparecen como piezas evaluadas.'}
              onClick={() => {
                setToast('MiroFish muestra lo que su negocio ya tiene evaluado: los archivos elegidos aquí todavía no se envían al servidor');
                ir(2);
              }}>
              <I_Vote size={13} /> Ver MiroFish
            </Button>
          </div>
          <div className="acc-why" style={{ color: 'var(--amber)' }}>
            <b>Todavía no se envían al servidor.</b> Lo que sube aquí queda en su navegador: ni se
            evalúa ni se publica. MiroFish y la galería muestran lo que su negocio ya tiene evaluado
            en el back, que es lo único real.
          </div>
          <div className="acc-why">
            Sube material terminado cuando ya sabe qué quiere publicar. Es el camino más corto:
            <b> no hay nada que crear</b>, solo aprobar.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Eye size={14} style={{ color: 'var(--green)' }} /> Qué miran los 5 jueces en sus piezas</span>}
          action={<Badge tone="purple">5 jueces</Badge>}
        >
          {/* Los 5 jueces como explicación del producto: qué mira cada uno, sin puntaje ni opinión de nadie. */}
          <div className="guards">
            {PERFILES.map(p => (
              <div key={p.k} className="guard">
                <span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Target size={14} /></span>
                <span className="guard-lb">{p.nombre}<small>{p.mira}</small></span>
              </div>
            ))}
          </div>
          {d.real && (
            <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
              <div className="dato" title="Las piezas de este negocio que el back tiene guardadas">
                <span className="dato-l">Sus piezas</span>
                <span className="dato-v">{d.piezas.length}</span>
              </div>
              <div className="dato" title="Las que ya pasaron por los 5 jueces de MiroFish">
                <span className="dato-l">Evaluadas</span>
                <span className="dato-v" style={{ color: 'var(--purple3)' }}>{d.evaluaciones.length}</span>
              </div>
              <div className="dato" title="Las que llegaron al mínimo de 80 y se pueden publicar">
                <span className="dato-l">Pasan el mínimo</span>
                <span className="dato-v" style={{ color: 'var(--green)' }}>{d.evaluaciones.filter(e => Number(e.puntaje) >= 80).length}</span>
              </div>
            </div>
          )}
          <div className="acc-why">
            Los mismos 5 jueces de MiroFish miran <b>cualquier pieza, la haya creado usted o el motor</b>.
            No se publica nada que no pase el mínimo.
          </div>
        </Card>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// PASO 3 — La galería: las piezas del negocio, para mirarlas y decidir
// ---------------------------------------------------------------------------------------------

/** Una pieza de la galería, con lo que el back manda de ella. Nada más: no hay campos de ejemplo. */
type PiezaGal = {
  id: string;
  titulo: string;
  /** El puntaje de MiroFish. null = el back todavía no la evaluó: se muestra «—», no un cero. */
  puntaje: number | null;
  formato: string;
  estado: string;
  fecha: string;
};

const esVideo = (f: string) => /video|reel/i.test(f);

/** La fecha del back, en corto: «creada el 12 de septiembre». */
const creada = (iso: string) => `creada el ${fechaCorta(iso)}`;

export function Galeria({ setToast, ir }: { modo: Modo; setToast: (t: string) => void; ir: (p: PasoCampana) => void }) {
  const d = useDatos();

  // --- Las piezas son las del negocio, tal como están en el servidor. El puntaje es el de MiroFish: el
  // que el back ya trae con la pieza o, si no viene, el de su evaluación (emparejada por id o título).
  const piezas: PiezaGal[] = d.piezas.map((p: PiezaBack) => {
    const ev = d.evaluaciones.find(e => e.id === p.id || e.titulo.trim().toLowerCase() === p.titulo.trim().toLowerCase());
    const punto = p.puntaje ?? ev?.puntaje ?? null;
    return {
      id: p.id, titulo: p.titulo, puntaje: punto == null ? null : Number(punto),
      formato: p.formato || 'sin formato', estado: p.estado || 'sin estado',
      fecha: p.created_at ? creada(p.created_at) : '',
    };
  });

  // --- El orden de la galería: del puntaje más alto al más bajo. Las que no tienen puntaje van al final.
  const orden = [...piezas].sort((a, b) => (b.puntaje ?? -1) - (a.puntaje ?? -1));
  const evaluadas = orden.filter(o => o.puntaje !== null);
  const [salen, setSalen] = useState<string[] | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  // La selección arranca con las que mejor votaron, que son las que pasarían el mínimo. La decisión es
  // suya: si desmarca todas, queda sin ninguna y el botón de marcar se apaga.
  const porDefecto = orden.slice(0, CUANTAS_PASAN).filter(o => o.puntaje !== null).map(o => o.id);
  const seleccion = salen ?? porDefecto;

  const toggle = (id: string) => setSalen(
    seleccion.includes(id) ? seleccion.filter(x => x !== id) : [...seleccion, id],
  );
  const pieza = orden.find(o => o.id === abierta) ?? null;

  // --- Sin piezas: aquí no va ni una pieza de ejemplo. Dice qué hacer para tener la primera.
  if (piezas.length === 0) {
    return d.cargando ? (
      <EstadoVacio
        icono={<I_Sparkle size={22} />}
        titulo="Leyendo sus piezas…"
        texto="Un segundo: el panel está trayendo del servidor las piezas que este negocio tiene creadas, con su formato y su puntaje."
      />
    ) : (
      <EstadoVacio
        icono={<I_Sparkle size={22} />}
        titulo="Todavía no hay piezas"
        texto="El motor arma la primera cuando usted sube el material: elige el tipo de campaña, el ángulo y el público, y crea las piezas. En cuanto existan, aparecen aquí con el puntaje que les dieron los 5 jueces."
        accion="Ir al paso 1" onAccion={() => ir(1)}
      />
    );
  }

  // --- Sus piezas existen pero ninguna pasó por los jueces: sin puntaje no hay nada que decidir, y el
  // panel lo dice en vez de rellenar la galería con un ejemplo.
  if (evaluadas.length === 0) {
    return (
      <EstadoVacio
        icono={<I_Vote size={22} />}
        titulo="Sus piezas todavía no pasaron por MiroFish"
        texto={`Tiene ${piezas.length} ${piezas.length === 1 ? 'pieza' : 'piezas'} sin puntaje: así no se puede decidir. Mándelas a MiroFish y vuelva: cada una aparece aquí con el voto de los 5 jueces, su puesto en el lote y si pasa el mínimo de 80.`}
        accion="Ver MiroFish" onAccion={() => ir(2)}
      />
    );
  }

  return (
    <>
      <Card className="gal-head">
        <div className="row spread" style={{ gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="row" style={{ gap: 11, flex: 1, minWidth: 240 }}>
            <span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Sparkle size={20} /></span>
            <div style={{ minWidth: 0 }}>
              <div className="bt">
                Sus {evaluadas.length} {evaluadas.length === 1 ? 'pieza evaluada' : 'piezas evaluadas'}
              </div>
              <div className="bs">
                El puntaje de cada una es el que le dio MiroFish. <b>Las {Math.min(CUANTAS_PASAN, evaluadas.length)} de arriba pasan el mínimo</b>, pero la decisión es suya: marque las que quiera.
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Badge tone="purple">{seleccion.length} seleccionadas</Badge>
            <Button className="btn-sm" disabled={!seleccion.length}
              title={!seleccion.length
                ? 'Elija al menos una pieza'
                : `Deja marcadas las ${seleccion.length} para que las publique usted. No sale nada a sus redes desde esta pantalla y no gasta un peso. Reversible: puede desmarcarlas.`}
              onClick={() => {
                setToast(`${seleccion.length} ${seleccion.length === 1 ? 'pieza quedó marcada' : 'piezas quedaron marcadas'}: todavía no salió nada a sus redes`);
                ir(4);
              }}>
              <I_Rocket size={13} /> {seleccion.length === 1 ? 'Dejar lista la elegida' : `Dejar listas las ${seleccion.length}`}
            </Button>
          </div>
        </div>
      </Card>

      <div className="gal">
        {orden.map((o, i) => {
          const sel = seleccion.includes(o.id);
          const sinPunto = o.puntaje === null;
          return (
            <div key={o.id} className={`pz ${sel ? 'sel' : ''}`}>
              <div className="pz-frame" style={{ background: 'linear-gradient(150deg, var(--bg3), var(--bg2) 70%, var(--bg3))' }}>
                <span className="pz-pos">{i + 1}</span>
                <span className="pz-formato">{esVideo(o.formato) ? <><I_Film size={12} /> {o.formato.toLowerCase()}</> : <><I_Image size={12} /> {o.formato.toLowerCase()}</>}</span>
                <span className="pz-ico">{esVideo(o.formato) ? <I_Film size={30} /> : <I_Image size={30} />}</span>
              </div>
              <div className="pz-body">
                <div className="row spread" style={{ gap: 8 }}>
                  <span className="pz-t">{o.titulo}</span>
                  <span className="pz-avg" style={{ color: sinPunto ? 'var(--muted)' : undefined }} title={sinPunto ? 'Esta pieza todavía no pasó por los 5 jueces: no tiene puntaje' : `El puntaje que le dio MiroFish a «${o.titulo}»`}>{sinPunto ? '—' : o.puntaje}</span>
                </div>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  {o.estado && <span className="badge badge-muted" style={{ fontSize: 9 }}>{o.estado}</span>}
                  {sinPunto && <span className="badge badge-amber" style={{ fontSize: 9 }}>sin puntaje</span>}
                  {sel && i < CUANTAS_PASAN && o.puntaje !== null && <span className="badge badge-green" style={{ fontSize: 9 }}>{`puesto ${i + 1} del ranking`}</span>}
                </div>
                <div className="row" style={{ gap: 7, flexWrap: 'wrap', marginTop: 'auto' }}>
                  <Button className="btn-sm" variant={sel ? 'primary' : 'outline'}
                    title={sel
                      ? 'La saca de la lista de marcadas: no queda lista para publicar'
                      : 'La suma a las piezas que quedan listas para publicar'}
                    onClick={() => toggle(o.id)}>
                    {sel ? <><I_Check size={12} /> Marcada</> : 'Marcar'}
                  </Button>
                  <Button variant="ghost" className="btn-sm"
                    title="Ver lo que el servidor manda de esta pieza: su formato, su estado, su fecha y su puntaje. No cambia nada."
                    onClick={() => setAbierta(abierta === o.id ? null : o.id)}>
                    {abierta === o.id ? <I_ChevUp size={12} /> : <I_ChevDn size={12} />} Ver ficha
                  </Button>
                </div>
                {pieza && pieza.id === o.id && (
                  <div className="pz-ficha">
                    <div className="op-row"><span className="op-k">Formato</span><span className="bs">{o.formato}</span></div>
                    <div className="op-row"><span className="op-k">Estado</span><span className="bs">{o.estado}</span></div>
                    {o.fecha && <div className="op-row"><span className="op-k">Fecha</span><span className="bs">{o.fecha}</span></div>}
                    <div className="op-row"><span className="op-k">Puntaje de MiroFish</span><span className="bs">{sinPunto ? '— todavía no la evaluaron' : `${o.puntaje} de 100`}</span></div>
                    <div className="tiny muted" style={{ marginTop: 8 }}>
                      Esto es lo que el servidor manda de la pieza. El prompt, el texto del anuncio y la
                      medida todavía no llegan: por eso no se muestran.
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Vote size={14} style={{ color: 'var(--amber)' }} /> El ranking de MiroFish</span>}
          action={<Badge tone="muted">1 a {orden.length}</Badge>}
        >
          <div className="bs">
            Así quedaron ordenadas sus piezas por el puntaje que les dio MiroFish. El veredicto juez por
            juez de cada una está en MiroFish, en el paso 2.
          </div>
          <div className="rank">
            {orden.map((o, i) => (
              <div key={o.id} className={`rank-row ${i < CUANTAS_PASAN && o.puntaje !== null ? 'pasa' : ''}`}>
                <span className={`rank-pos ${i < CUANTAS_PASAN && o.puntaje !== null ? 'pasa' : ''}`}>{i + 1}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="rank-t">{o.titulo}</span>
                  <span className="rank-m">{o.formato}</span>
                </span>
                <span className="rank-avg" style={{ color: o.puntaje === null ? 'var(--muted)' : undefined }}>{o.puntaje === null ? '—' : o.puntaje}</span>
              </div>
            ))}
          </div>
          <div className="acc-why">
            El puntaje sale de los 5 jueces y del público, y es lo que ordena esta lista.
            <b> El que no tiene puntaje todavía no pasó por MiroFish</b>: no se puede decidir con eso.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Play size={14} style={{ color: 'var(--purple3)' }} /> Por dónde seguir</span>}
          action={<Badge tone="purple">2 caminos</Badge>}
        >
          <div className="bs">
            Con lo que eligió ya puede arrancar. Estas dos opciones son las que se usan después:
          </div>
          <div className="guards">
            <div className="guard"><span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Plus size={14} /></span>
              <span className="guard-lb">Ver las que ya están corriendo<small>Con su gasto, su ROAS y qué conviene mover</small></span>
              <Button variant="outline" className="btn-sm" title="Va a Mis campañas" onClick={() => ir(5)}>Ir</Button></div>
            <div className="guard"><span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Sparkle size={14} /></span>
              <span className="guard-lb">Crear otra cosa<small>Otro tipo de publicación o una campaña nueva</small></span>
              <Button variant="outline" className="btn-sm" title="Vuelve al principio del flujo" onClick={() => ir(1)}>Ir</Button></div>
          </div>
          <div className="acc-why">
            La galería es la pantalla de decisión: <b>todo lo demás ya está resuelto</b>. Lo que marque
            aquí queda listo para salir a sus redes.
          </div>
        </Card>
      </div>
    </>
  );
}
