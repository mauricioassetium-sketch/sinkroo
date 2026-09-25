import { useEffect, useState } from 'react';
import { Button } from '../components/ui';
import {
  I_X, I_Check, I_ArrowRight, I_ArrowLeft, I_Rocket, I_Zap, I_Clock,
} from '../components/icons';
import { useOnboarding } from '../lib/onboarding';
import { useDetalle } from './Detalle';
import { usePlan } from '../lib/plan';
import { CamposPaso, BloqueConexiones, BloqueArranque, AvisoVerificacion } from './PasoOnboarding';
import { BIENVENIDA } from '../data/onboarding';
import type { Sesion } from '../views/Login';

// =============================================================================================
// EL ASISTENTE DE ENTRADA — el pop-up que aparece después de iniciar sesión.
//
// Dos bloques: la BIENVENIDA (qué hace el motor con el negocio) y los CINCO PASOS. Todo saltable:
// hay un «Saltar todo» y una X en cada pantalla, y las dos salidas dicen dónde se termina después
// (Primeros pasos, dentro del panel). Se abre solo la primera vez que hay sesión.
// =============================================================================================

export function Asistente({ sesion, setVista }: { sesion: Sesion; setVista: (v: any) => void }) {
  const onb = useOnboarding();
  const detalle = useDetalle();
  const { plan } = usePlan();
  const [autoHecho, setAutoHecho] = useState(false);

  // Se abre una sola vez, cuando hay sesión y todavía no se abrió. Va en un efecto y no en el
  // cuerpo del render: abrir el asistente cambia el estado del proveedor, y hacerlo mientras se
  // renderiza este componente hace que React descarte la actualización (y el asistente no abre).
  const abrir = onb.abrirAsistente;
  useEffect(() => {
    if (sesion && !autoHecho) { setAutoHecho(true); abrir(0); }
  }, [sesion, autoHecho, abrir]);

  if (!onb.asistente.abierto) return null;

  const fase = onb.asistente.fase;
  const paso = fase >= 1 ? onb.pasos[fase - 1] : null;
  const ultimo = fase === onb.pasos.length;

  const cerrar = (aviso: string) => { onb.cerrarAsistente(); onb.avisar(aviso); };
  const siguiente = () => onb.irAFase(Math.min(onb.pasos.length, fase + 1));
  const atras = () => onb.irAFase(Math.max(0, fase - 1));

  return (
    <div className="asist">
      <div className="asist-panel">
        {/* Encabezado: dónde está parado y la salida, siempre visible. */}
        <div className="asist-head">
          <div className="row" style={{ gap: 9, alignItems: 'center' }}>
            <span className="asist-paso-n">
              {fase === 0 ? '👋' : `${paso?.n}`}
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="asist-t">
                {fase === 0 ? BIENVENIDA.titulo : paso?.titular}
              </div>
              <div className="tiny muted">
                {fase === 0 ? 'Antes de empezar: qué va a hacer el motor con su negocio'
                  : `Paso ${paso?.n} de ${onb.pasos.length} · ${onb.listos.length} hechos`}
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <span className="tiny muted">se completa después en Primeros pasos</span>
            <button className="icon-btn" title="Salir del asistente. El panel ya está listo y lo que falta queda en Primeros pasos."
              onClick={() => cerrar('Asistente cerrado: sigue desde Primeros pasos cuando quiera')}><I_X size={15} /></button>
          </div>
        </div>

        {/* El avance, para saber cuánto falta. */}
        <div className="asist-barra">
          {Array.from({ length: onb.pasos.length + 1 }, (_, f) => f).map(f => (
            <button key={f} className={`asist-barra-t ${fase >= f ? 'on' : ''} ${fase === f ? 'act' : ''}`}
              title={f === 0 ? 'Bienvenida' : `Paso ${f}: ${onb.pasos[f - 1]?.t}`}
              onClick={() => onb.irAFase(f)} />
          ))}
        </div>

        <div className="asist-cuerpo">
          {/* ---------------- BIENVENIDA ----------------
              Es la primera impresión: saluda por su nombre, promete el trabajo ya hecho, muestra las
              tres cosas que empiezan a pasar y dice lo fácil que es empezar. Nada más. */}
          {fase === 0 && (
            <>
              <div className="asist-hola">Hola{sesion.nombre ? `, ${sesion.nombre.split(' ')[0]}` : ''} 👋</div>
              <div className="asist-titular">{BIENVENIDA.titular}</div>
              <div className="asist-sub">{BIENVENIDA.sub}</div>
              <div className="asist-que">
                {BIENVENIDA.queHace.map((q, i) => (
                  <div key={q.t} className="asist-que-fila">
                    <span className="asist-que-n">{i + 1}</span>
                    <span style={{ minWidth: 0 }}>
                      <b>{q.t}</b>
                      <small>{q.s}</small>
                    </span>
                  </div>
                ))}
              </div>
              <div className="asist-reglas">
                {BIENVENIDA.reglas.map(r => <div key={r} className="asist-regla"><I_Check size={12} /> {r}</div>)}
              </div>
              <div className="asist-facil">
                <I_Zap size={12} /> {BIENVENIDA.facil}
              </div>
            </>
          )}

          {/* ---------------- LOS CINCO PASOS ---------------- */}
          {paso && (
            <>
              <div className="bs"><b style={{ color: 'var(--txt)' }}>Para qué se lo pido: </b>{paso.paraQue}</div>
              {paso.infiere && (
                <div className="onb-infiere">
                  <span className="onb-infiere-ic"><I_Zap size={13} /></span>
                  <span><b>Lo que el motor saca solo: </b>{paso.infiere}</span>
                </div>
              )}

              {paso.n === 5 ? (
                <>
                  <BloqueConexiones />
                  <AvisoVerificacion ir={() => { onb.cerrarAsistente(); setVista('kyc'); }} />
                  <BloqueArranque enAsistente alCerrar={() => { onb.cerrarAsistente(); setVista('hoy'); }} />
                </>
              ) : (
                <>
                  <CamposPaso paso={paso} />
                  {paso.nota && <div className="acc-why">{paso.nota}</div>}
                </>
              )}

              <div className="row asist-acciones">
                <Button className="btn-sm"
                  title="Queda anotado y pasa al paso siguiente"
                  onClick={() => { onb.marcar(paso.n); ultimo ? onb.arrancar() : siguiente(); }}>
                  {ultimo ? <><I_Rocket size={13} /> Terminar y arrancar</> : <>{onb.completo(paso.n) ? 'Continuar' : 'Seguir después'} <I_ArrowRight size={13} /></>}
                </Button>
                <Button variant="ghost" className="btn-sm" title="Pasa al paso siguiente sin marcarlo: queda pendiente y el motor usa lo que haya"
                  onClick={siguiente}>Saltar este paso</Button>
                <Button variant="ghost" className="btn-sm" title="Le muestra qué hace el motor con lo de este paso y de dónde saca el resto"
                  onClick={() => detalle({
                    titulo: `${paso.t}: qué hace el motor con esto`,
                    sub: paso.paraQue,
                    bloques: [
                      { tipo: 'filas', items: paso.campos.map(c => ({
                        t: c.etiqueta, s: c.ayuda,
                        etiqueta: String(onb.datos[c.id] || '').length || (Array.isArray(onb.datos[c.id]) && (onb.datos[c.id] as string[]).length) ? 'puesto' : 'falta',
                        tono: String(onb.datos[c.id] || '').length || (Array.isArray(onb.datos[c.id]) && (onb.datos[c.id] as string[]).length) ? 'green' as const : 'muted' as const,
                      })) },
                      ...(paso.infiere ? [{ tipo: 'texto' as const, texto: `Lo que el motor saca solo: ${paso.infiere}` }] : []),
                      { tipo: 'aviso' as const, texto: 'Este paso no bloquea nada: el motor trabaja igual y va corrigiendo con lo que aprende de sus conversaciones y de su cuenta.' },
                    ],
                    fuente: 'Primeros pasos · el asistente no frena el trabajo del motor, solo le da el punto de partida.',
                  })}>Qué hace con esto</Button>
              </div>
            </>
          )}
        </div>

        {/* Pie: navegación y la salida clara, sin letra chica. */}
        <div className="asist-pie">
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button variant="ghost" className="btn-sm" disabled={fase === 0} title="Vuelva a la pantalla anterior"
              onClick={atras}><I_ArrowLeft size={13} /> Atrás</Button>
            {fase === 0 && (
              <Button className="btn-sm" title="Arranca: cinco preguntas cortas y el motor queda trabajando. Se puede saltar en cualquier momento."
                onClick={siguiente}>Empezar ahora <I_ArrowRight size={13} /></Button>
            )}
          </div>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <span className="tiny muted">
              <I_Clock size={11} /> 4 minutos · se puede saltar y hacerlo después
            </span>
            <Button variant="ghost" className="btn-sm"
              title="Salta el asistente entero y le deja en el panel. Todo queda en Primeros pasos para completarlo cuando quieras."
              onClick={() => { cerrar('Asistente salteado: el panel ya está listo y lo que falta espera en Primeros pasos'); setVista('hoy'); }}>
              Empezar después
            </Button>
          </div>
        </div>

        {/* Lo que va a pasar al terminar. */}
        <div className="asist-pie-2">
          <I_Rocket size={12} /> Al terminar, el motor sale a investigar su mercado y arma la primera semana
          con los {plan.creditosMes.toLocaleString('es-CO')} créditos del plan {plan.nombre}. Publicar es aparte.
        </div>
      </div>
    </div>
  );
}
