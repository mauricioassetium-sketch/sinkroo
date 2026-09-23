import { useState, useEffect } from 'react';
import { Card, Badge, Button } from './ui';
import {
  I_Robot, I_Search, I_Sparkle, I_Vote, I_Rocket, I_Check, I_Refresh,
  I_ChevDn, I_ChevUp, I_Film, I_Image, I_File, I_Target, I_Camera,
} from './icons';
import { INVESTIGACION, OPCIONES, PERFILES, ranking, puntaje, CUANTAS_PASAN, type Opcion } from '../data/mirofish';
import type { Modo } from '../data/demo';

// =============================================================================================
// EL FLUJO DE MIROFISH — la cadena completa, en 4 etapas encadenadas:
//   1. Sinkroo investiga el mercado y detecta los colores del competidor que mejor convierte.
//   2. Con eso crea el material: 5 opciones, cada una con su prompt de imagen o video.
//   3. MiroFish las vota y quedan ordenadas del 1 al 5.
//   4. Las 3 primeras pasan a producción: se publican o esperan tu aprobación, según el modo.
// =============================================================================================

type Etapa = 'inicio' | 'investiga' | 'crea' | 'vota' | 'listo';
const NIVEL: Record<Etapa, number> = { inicio: 0, investiga: 1, crea: 2, vota: 3, listo: 4 };
const PASOS = [
  { n: 1, t: 'Investiga', d: 'Mercado y colores que convierten' },
  { n: 2, t: 'Crea', d: '5 opciones con sus prompts' },
  { n: 3, t: 'Vota', d: 'MiroFish las ordena 1 a 5' },
  { n: 4, t: 'Publica', d: 'Las 3 primeras salen' },
];

function IconoFormato({ f }: { f: Opcion['formato'] }) {
  if (f === 'Video vertical') return <I_Film size={15} />;
  if (f === 'Reel') return <I_Camera size={15} />;
  if (f === 'Carrusel') return <I_File size={15} />;
  return <I_Image size={15} />;
}

export function FlujoMiroFish({ modo, setToast, esAnuncio }: {
  modo: Modo; setToast: (t: string) => void; esAnuncio: boolean;
}) {
  const [etapa, setEtapa] = useState<Etapa>('inicio');
  const [abierta, setAbierta] = useState<string | null>('op1');
  const [publicado, setPublicado] = useState(false);

  const nivel = NIVEL[etapa];
  const orden = ranking();
  const pasan = orden.slice(0, CUANTAS_PASAN);
  const quedan = orden.slice(CUANTAS_PASAN);

  const arrancar = () => {
    setPublicado(false);
    setEtapa('investiga');
    setToast('Sinkroo está investigando el mercado…');
    window.setTimeout(() => { setEtapa('crea'); setToast('Ahora está creando las 5 opciones y sus prompts…'); }, 1200);
    window.setTimeout(() => { setEtapa('vota'); setToast('Las 5 entraron a MiroFish: los agentes están votando…'); }, 2500);
    window.setTimeout(() => {
      setEtapa('listo');
      setToast('MiroFish las ordenó del 1 al 5: las 3 primeras quedaron seleccionadas');
    }, 3900);
  };

  // Al llegar acá el trabajo ya arrancó solo: en el paso 1 el usuario apretó Iniciar.
  // No hay botón para empezar en esta pantalla: eso era lo que confundía.
  useEffect(() => { arrancar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const accionDice = modo === 'auto'
    ? 'Se publican solas y quedan en la bitácora, reversibles 24 h'
    : modo === 'shared'
      ? 'Kai te va a pedir el OK antes de publicarlas'
      : 'Quedan listas para que las publiques vos';

  const espera = (n: number, icono: React.ReactNode, t: string, d: string) => (
    <div className="flujo-espera">
      {nivel >= n ? null : <span className="flujo-espera-ico">{icono}</span>}
      {nivel < n ? (<><div className="bt">{t}</div><div className="bs">{d}</div></>) : null}
    </div>
  );

  const trabajando = (n: number, t: string) => nivel === n && n < 4
    ? <div className="flujo-work"><span className="dot-live" /> {t}<span className="flujo-puntos"><i /><i /><i /></span></div>
    : null;

  return (
    <>
      {/* ==================== CABECERA DEL FLUJO ==================== */}
      <Card className="flujo-head">
        <div className="row spread" style={{ alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <div className="row" style={{ gap: 11, flex: 1, minWidth: 240 }}>
            <span style={{ color: 'var(--purple3)', flexShrink: 0, marginTop: 2 }}><I_Robot size={20} /></span>
            <div style={{ minWidth: 0 }}>
              <div className="bt">Un solo gatillo: <b>Iniciar</b>, en el paso 1</div>
              <div className="bs">
                Subís la info y apretás <b>Iniciar</b>. Ahí no hay nada que tocar: Sinkroo investiga
                quién trae más leads y <b>con qué colores</b>, escribe los prompts de cada imagen y video,
                arma <b>5 opciones</b> y MiroFish las vota y las ordena <b>del 1 al 5</b>.
                Vos decidís después, en la galería.
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            {nivel === 4
              ? <Button variant="outline" className="btn-sm" title="Vuelve a investigar y crea 5 opciones nuevas, desde cero"
                  onClick={arrancar}><I_Refresh size={13} /> Otra ronda</Button>
              : <Badge tone="purple">{nivel === 0 ? 'arrancando…' : 'trabajando solo…'}</Badge>}
          </div>
        </div>

        <div className="flujo-pasos">
          {PASOS.map(p => (
            <div key={p.n} className={`flujo-paso ${nivel > p.n ? 'done' : nivel === p.n ? 'on' : ''}`}>
              <span className="flujo-paso-n">{nivel > p.n ? <I_Check size={13} /> : p.n}</span>
              <span style={{ minWidth: 0 }}>
                <span className="flujo-paso-t">{p.t}</span>
                <span className="flujo-paso-d">{p.d}</span>
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* ==================== FILA 1: INVESTIGACIÓN Y CREACIÓN ==================== */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Search size={14} style={{ color: 'var(--purple3)' }} /> 1 · Lo que investigó Sinkroo</span>}
          action={nivel >= 1 ? <Badge tone="purple">{INVESTIGACION.colores.length} colores detectados</Badge> : <Badge tone="muted">sin empezar</Badge>}
        >
          {nivel < 1
            ? espera(1, <I_Search size={22} />, 'Acá aparece la investigación', 'Quién trae más leads, con qué colores y por qué. Tocá «Que Sinkroo lo haga».')
            : (
              <>
                {trabajando(1, 'Leyendo la biblioteca de anuncios de tus competidores')}
                <div>
                  <div className="paleta">
                    {INVESTIGACION.colores.map(c => (
                      <div key={c.hex} className="swatch">
                        <span className="swatch-color" style={{ background: c.hex }} />
                        <span style={{ minWidth: 0 }}>
                          <span className="swatch-n">{c.nombre}</span>
                          <span className="swatch-hex">{c.hex}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="bs" style={{ marginTop: 10 }}>
                    Son los colores de <b>{INVESTIGACION.competidor.nombre}</b>, el competidor que mejor convierte.
                    {INVESTIGACION.competidor.detalle} El motor los usa como base: no para copiar, para parecerse
                    a lo que el mercado ya demostró que funciona.
                  </div>
                </div>
                <div className="guards">
                  {INVESTIGACION.hallazgos.map(h => (
                    <div key={h.t} className="guard">
                      <span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Target size={14} /></span>
                      <span className="guard-lb">{h.t}<small>{h.d}</small></span>
                    </div>
                  ))}
                </div>
                <div className="acc-why">
                  Esto no es una opinión del motor: sale de <b>anuncios reales que están corriendo ahora</b>.
                  Los colores que más leads traen se detectan del anuncio con más tiempo activo del competidor que mejor convierte.
                </div>
              </>
            )}
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Sparkle size={14} style={{ color: 'var(--purple3)' }} /> 2 · Lo que creó con eso</span>}
          action={nivel >= 2 ? <Badge tone="purple">{OPCIONES.length} opciones</Badge> : <Badge tone="muted">sin crear</Badge>}
        >
          {nivel < 2
            ? espera(2, <I_Sparkle size={22} />, 'Acá aparecen las 5 opciones', 'Cada una con su prompt de imagen o video, escrito por el motor, usando los colores que mejor convierten.')
            : (
              <>
                {trabajando(2, 'Escribiendo los prompts y armando las opciones')}
                <div className="bs">
                  <b>5 opciones distintas, no 5 versiones de lo mismo:</b> cambia el formato y el ángulo.
                  Tocá cualquiera para ver el prompt que escribió el motor.
                </div>
                <div className="ops">
                  {OPCIONES.map(o => {
                    const on = abierta === o.id;
                    return (
                      <div key={o.id} className={`op ${on ? 'on' : ''}`}>
                        <div className="op-head" onClick={() => setAbierta(on ? null : o.id)}>
                          <span className="op-color" style={{ background: o.color }} />
                          <span className="op-ico" style={{ color: o.color }}><IconoFormato f={o.formato} /></span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span className="op-t">{o.titulo}</span>
                            <span className="op-m">{o.formato} · {o.medida}</span>
                          </span>
                          <span className="op-chevron">{on ? <I_ChevUp size={14} /> : <I_ChevDn size={14} />}</span>
                        </div>
                        {on && (
                          <div className="op-body">
                            <div className="op-gancho">{o.gancho}</div>
                            <div className="op-label">El prompt que escribió el motor</div>
                            <div className="op-prompt">{o.prompt}</div>
                            <div className="op-row"><span className="op-k">Texto del anuncio</span><span className="bs">{o.copy}</span></div>
                            <div className="op-row"><span className="op-k">Botón</span><span className="bs">{o.cta}</span></div>
                            <div className="op-tags">
                              <span className="badge badge-purple" style={{ fontSize: 9 }}>usa {o.usaCompetidor}</span>
                              <span className="badge badge-muted" style={{ fontSize: 9 }}>{o.formato}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="acc-why">
                  El motor <b>no inventa de cero</b>: parte de tus fotos reales y de lo que encontró en el mercado.
                  Cada opción tiene su prompt guardado, así que podés pedir que la rehaga o que cambie solo el color.
                </div>
              </>
            )}
        </Card>
      </div>

      {/* ==================== FILA 2: VOTACIÓN Y PRODUCCIÓN ==================== */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Vote size={14} style={{ color: 'var(--amber)' }} /> 3 · MiroFish las vota y las ordena</span>}
          action={nivel >= 4 ? <Badge tone="green">ordenadas 1 a 5</Badge> : <Badge tone="muted">sin votar</Badge>}
        >
          {nivel < 3
            ? espera(3, <I_Vote size={22} />, 'Acá votan los agentes', 'Cinco perfiles distintos puntúan cada opción. El promedio define el puesto, del 1 al 5.')
            : (
              <>
                {trabajando(3, 'Los 5 perfiles están votando cada opción')}
                <div className="bs">
                  Cada perfil mira algo distinto. El <b>promedio de los 5 votos</b> es el puntaje final y define
                  el puesto: la de arriba es la que más convence.
                </div>
                <div className="rank-votos-head">
                  {PERFILES.map(p => (
                    <span key={p.k} className="rank-voto-h" title={`${p.nombre}: ${p.mira}`}>{p.nombre.split(' ')[0].slice(0, 6)}</span>
                  ))}
                  <span className="rank-voto-h" style={{ color: 'var(--purple3)' }}>prom.</span>
                </div>
                <div className="rank">
                  {orden.map((o, i) => {
                    const pasa = i < CUANTAS_PASAN;
                    return (
                      <div key={o.id} className={`rank-row ${pasa ? 'pasa' : ''}`}>
                        <span className={`rank-pos ${pasa ? 'pasa' : ''}`}>{i + 1}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span className="rank-t">{o.titulo}</span>
                          <span className="rank-m">{o.formato} · {o.medida}</span>
                        </span>
                        <span className="rank-votos">
                          {PERFILES.map(p => (
                            <span key={p.k} className={`rank-voto ${o.votos[p.k] >= 85 ? 'hi' : o.votos[p.k] < 70 ? 'lo' : ''}`}
                              title={`${p.nombre}: ${o.votos[p.k]}`}>{o.votos[p.k]}</span>
                          ))}
                        </span>
                        <span className="rank-avg">{puntaje(o)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="acc-why">
                  Del 1 al 5: <b>las 3 primeras pasan</b>, las otras 2 quedan guardadas con el voto de cada perfil,
                  así sabés exactamente qué les faltó.
                </div>
              </>
            )}
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Rocket size={14} style={{ color: 'var(--green)' }} /> 4 · Las 3 que salen</span>}
          action={nivel >= 4 ? <Badge tone="green">{CUANTAS_PASAN} seleccionadas</Badge> : <Badge tone="muted">sin seleccionar</Badge>}
        >
          {nivel < 4
            ? espera(4, <I_Rocket size={22} />, 'Acá salen las 3 mejores', 'Cuando MiroFish termina de votar, las 3 primeras quedan listas para publicar.')
            : (
              <>
                {pasan.map((o, i) => (
                  <div key={o.id} className="sale">
                    <span className="sale-pos">{i + 1}º</span>
                    <span className="sale-prev" style={{ background: `${o.color}22`, borderColor: `${o.color}66` }}>
                      <span style={{ color: o.color }}><IconoFormato f={o.formato} /></span>
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="rank-t">{o.titulo}</span>
                      <span className="rank-m">{o.formato} · {o.medida} · {puntaje(o)} puntos</span>
                    </span>
                    <Badge tone="green">sale</Badge>
                  </div>
                ))}

                <div className="bs" style={{ marginTop: 4 }}>
                  <b>Las 2 que no pasaron:</b> {quedan.map(o => `«${o.titulo}» (${puntaje(o)})`).join(' y ')}.
                  Quedan guardadas, no se pierden.
                </div>

                <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
                  {publicado ? (
                    <Badge tone="green">
                      {modo === 'auto' ? 'Publicadas y en la bitácora' : modo === 'shared' ? 'Esperando tu OK en la bitácora' : 'Listas para que las publiques'}
                    </Badge>
                  ) : (
                    <Button className="btn-sm" title={accionDice}
                      onClick={() => { setPublicado(true); setToast(`${accionDice} (demo)`); }}>
                      <I_Rocket size={13} /> {esAnuncio ? 'Publicar las 3' : 'Programar las 3'}
                    </Button>
                  )}
                  <Button variant="ghost" className="btn-sm" title="Le pide al motor que rehaga solo la opción 4 y 5 con lo que objetaron los perfiles"
                    onClick={() => setToast('El motor rehace las 2 que no pasaron (demo)')}>Rehacer las 2 que no pasaron</Button>
                </div>

                <div className="acc-why">
                  {modo === 'manual'
                    ? <><b>Estás en Manual:</b> el motor te deja las 3 listas y las publicás vos cuando quieras.</>
                    : modo === 'auto'
                      ? <><b>Estás en Automático:</b> las 3 salen solas y quedan en la bitácora, reversibles 24 h.</>
                      : <><b>Estás en Compartido:</b> el motor prepara todo y te pide el OK antes de publicarlas.</>}
                  {' '}Nada de esto gastó un peso todavía.
                </div>
              </>
            )}
        </Card>
      </div>
    </>
  );
}
