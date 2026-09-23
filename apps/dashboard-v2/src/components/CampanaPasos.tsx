import { useState } from 'react';
import { Card, Badge, Button } from './ui';
import { I_Check, I_Upload, I_Image, I_Film, I_Vote, I_Rocket, I_Play, I_Refresh, I_Sparkle, I_ChevDn, I_ChevUp, I_Plus, I_Eye, I_X, I_Target } from './icons';
import { OPCIONES, ranking, puntaje, CUANTAS_PASAN, type Opcion } from '../data/mirofish';
import type { Modo } from '../data/demo';

// =============================================================================================
// CAMPAÑAS POR ETAPAS — cada paso es su propia pantalla, así no hay que scrollear media hora.
// El camino fácil es el primero: decís qué querés y Sinkroo elige el tipo, crea todo y vos
// decidís mirando las piezas.
// =============================================================================================

export type PasoCampana = 1 | 2 | 3 | 4 | 5;

export const PASOS_CAMPANA: { n: PasoCampana; t: string; d: string; icono: string }[] = [
  { n: 1, t: 'Con Sinkroo', d: 'Subís la info y él arranca', icono: '🤖' },
  { n: 2, t: 'MiroFish', d: 'Todo pasa por acá: vota y ordena', icono: '🗳️' },
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
// PASO 1 — Ingesta manual: el usuario sube todo listo
// ---------------------------------------------------------------------------------------------
export function IngestaManual({ setToast, ir }: { setToast: (t: string) => void; ir: (p: PasoCampana) => void }) {
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
          title={<span className="row" style={{ gap: 8 }}><I_Upload size={14} style={{ color: 'var(--purple3)' }} /> Paso 1 · Subí lo que ya tenés</span>}
          action={<Badge tone={piezas.length ? 'green' : 'amber'}>{piezas.length} {piezas.length === 1 ? 'pieza' : 'piezas'}</Badge>}
        >
          <div className="bs">
            Si ya tenés las imágenes o los videos hechos, subilos acá. <b>El motor no inventa nada</b>:
            los revisa, los puntúa con el panel y publica los mejores en tus redes.
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
            <Button className="btn-sm" disabled={!piezas.length}
              title={piezas.length ? 'Manda tus piezas a MiroFish: las votan y quedan ordenadas del 1 al 5' : 'Primero subí al menos una pieza'}
              onClick={() => { setToast(`${piezas.length} piezas entraron a MiroFish`); ir(2); }}>
              <I_Vote size={13} /> Mandarlas a MiroFish
            </Button>
          </div>
          <div className="acc-why">
            Subís material terminado cuando ya sabés qué querés publicar. Es el camino más corto:
            <b> no hay nada que crear</b>, solo aprobar.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Eye size={14} style={{ color: 'var(--green)' }} /> Qué mira el panel en tus piezas</span>}
          action={<Badge tone="purple">5 perfiles</Badge>}
        >
          <div className="guards">
            <div className="guard"><span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Target size={14} /></span>
              <span className="guard-lb">Si se entiende en 3 segundos<small>El comprador impulsivo decide ahí: si no entiende qué vendés, se va</small></span></div>
            <div className="guard"><span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Target size={14} /></span>
              <span className="guard-lb">Si el color deja leer el texto<small>Muchas piezas se pierden por eso: se ven bien en la compu y no en el celular al sol</small></span></div>
            <div className="guard"><span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Target size={14} /></span>
              <span className="guard-lb">Si dice el precio o lo esconde<small>El que compara se va cuando no lo encuentra</small></span></div>
            <div className="guard"><span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Target size={14} /></span>
              <span className="guard-lb">Si parece real o parece armado<small>El desconfiado castiga las fotos de banco de imágenes</small></span></div>
          </div>
          <div className="acc-why">
            Los mismos 5 perfiles de MiroFish miran <b>cualquier pieza, la hayas creado vos o el motor</b>.
            No se publica nada que no pase el mínimo.
          </div>
        </Card>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// PASO 4 — La galería: las piezas creadas, para mirarlas y decidir
// ---------------------------------------------------------------------------------------------
export function Galeria({ modo, setToast, ir }: { modo: Modo; setToast: (t: string) => void; ir: (p: PasoCampana) => void }) {
  const orden = ranking();
  const [salen, setSalen] = useState<string[]>(orden.slice(0, CUANTAS_PASAN).map(o => o.id));
  const [abierta, setAbierta] = useState<Opcion | null>(null);

  const toggle = (id: string) => setSalen(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const esVideo = (o: Opcion) => o.formato === 'Video vertical' || o.formato === 'Reel';

  const accionDice = modo === 'auto'
    ? 'Salen solas y quedan en la bitácora, reversibles 24 h'
    : modo === 'shared' ? 'Kai te pide el OK antes de publicarlas' : 'Quedan listas para que las publiques vos';

  return (
    <>
      <Card className="gal-head">
        <div className="row spread" style={{ gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="row" style={{ gap: 11, flex: 1, minWidth: 240 }}>
            <span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Sparkle size={20} /></span>
            <div style={{ minWidth: 0 }}>
              <div className="bt">Las {OPCIONES.length} piezas ya están creadas</div>
              <div className="bs">Mirá cada una y elegí. <b>Las 3 primeras vienen marcadas</b> porque son las que mejor votó el panel, pero la decisión es tuya.</div>
            </div>
          </div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Badge tone="purple">{salen.length} seleccionadas</Badge>
            <Button className="btn-sm" disabled={!salen.length}
              title={salen.length ? accionDice : 'Elegí al menos una pieza'}
              onClick={() => { setToast(`${salen.length} piezas: ${accionDice} (demo)`); }}>
              <I_Rocket size={13} /> {salen.length === 1 ? 'Publicar la elegida' : `Publicar las ${salen.length}`}
            </Button>
          </div>
        </div>
      </Card>

      <div className="gal">
        {orden.map((o, i) => {
          const seleccionada = salen.includes(o.id);
          return (
            <div key={o.id} className={`pz ${seleccionada ? 'sel' : ''}`}>
              <div className="pz-frame" style={{ background: `linear-gradient(150deg, ${o.color}, ${o.color}22 70%, var(--bg3))` }}>
                <span className="pz-pos">{i + 1}</span>
                <span className="pz-formato">{esVideo(o) ? <><I_Film size={12} /> video</> : <><I_Image size={12} /> imagen</>}</span>
                <span className="pz-ico">{esVideo(o) ? <I_Film size={30} /> : <I_Image size={30} />}</span>
                <span className="pz-gancho">{o.gancho}</span>
                <span className="pz-medida">{o.medida}</span>
              </div>
              <div className="pz-body">
                <div className="row spread" style={{ gap: 8 }}>
                  <span className="pz-t">{o.titulo}</span>
                  <span className="pz-avg">{puntaje(o)}</span>
                </div>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  {salen.includes(o.id) && i < 3 && <span className="badge badge-green" style={{ fontSize: 9 }}>la eligió el panel</span>}
                </div>
                <div className="row" style={{ gap: 7, flexWrap: 'wrap', marginTop: 'auto' }}>
                  <Button className="btn-sm" variant={seleccionada ? 'primary' : 'outline'}
                    title={seleccionada ? 'La saca de la selección' : 'La suma a las que se publican'}
                    onClick={() => toggle(o.id)}>
                    {seleccionada ? <><I_Check size={12} /> Sale</> : 'Que salga'}
                  </Button>
                  <Button variant="ghost" className="btn-sm" title="Ver el prompt, el texto y el botón de esta pieza"
                    onClick={() => setAbierta(abierta?.id === o.id ? null : o)}>
                    {abierta?.id === o.id ? <I_ChevUp size={12} /> : <I_ChevDn size={12} />} Ver ficha
                  </Button>
                </div>
                {abierta?.id === o.id && (
                  <div className="pz-ficha">
                    <div className="op-label">El prompt</div>
                    <div className="op-prompt">{o.prompt}</div>
                    <div className="op-row"><span className="op-k">Texto</span><span className="bs">{o.copy}</span></div>
                    <div className="op-row"><span className="op-k">Botón</span><span className="bs">{o.cta}</span></div>
                    <Button variant="ghost" className="btn-sm" style={{ marginTop: 10 }}
                      title="Le pide al motor que rehaga esta pieza en particular"
                      onClick={() => setToast(`El motor rehace «${o.titulo}» (demo)`)}>
                      <I_Refresh size={12} /> Que la rehaga
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Vote size={14} style={{ color: 'var(--amber)' }} /> El voto de MiroFish, pieza por pieza</span>}
          action={<Badge tone="muted">1 a {OPCIONES.length}</Badge>}
        >
          <div className="bs">Así votó cada perfil. El promedio es el puesto, y el puesto es el orden de la galería.</div>
          <div className="rank">
            {orden.map((o, i) => (
              <div key={o.id} className={`rank-row ${i < CUANTAS_PASAN ? 'pasa' : ''}`}>
                <span className={`rank-pos ${i < CUANTAS_PASAN ? 'pasa' : ''}`}>{i + 1}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="rank-t">{o.titulo}</span>
                  <span className="rank-m">{o.formato} · {o.medida}</span>
                </span>
                <span className="rank-avg">{puntaje(o)}</span>
              </div>
            ))}
          </div>
          <div className="acc-why">
            Si <b>no te gusta ninguna</b>, podés pedir otra ronda: el motor investiga de nuevo y crea
            5 opciones más. Nada se publica hasta que decidas.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Play size={14} style={{ color: 'var(--purple3)' }} /> Por dónde seguir</span>}
          action={<Badge tone="purple">2 caminos</Badge>}
        >
          <div className="bs">
            Con lo que elegiste ya podés arrancar. Estas dos opciones son las que se usan después:
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
            La galería es la pantalla de decisión: <b>todo lo demás ya está resuelto</b>. Lo que marques
            acá sale a tus redes.
          </div>
        </Card>
      </div>
    </>
  );
}
