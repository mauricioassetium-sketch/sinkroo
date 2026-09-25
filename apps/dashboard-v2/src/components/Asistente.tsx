import { useEffect, useState } from 'react';
import { Button } from '../components/ui';
import {
  I_X, I_Check, I_ArrowRight, I_ArrowLeft, I_Play, I_Zap, I_Clock, I_Doc, I_Checklist,
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
          <button className="icon-btn" title="Salir del asistente. El panel ya está listo y lo que falta se completa después en Primeros pasos."
            onClick={() => cerrar('Asistente cerrado: sigue desde Primeros pasos cuando quiera')}><I_X size={15} /></button>
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
              La pantalla que recibe a cualquiera que entra por primera vez: el titular que le quita el
              miedo (no necesita saber de marketing), el recuadro que le dice que ya tiene lo necesario,
              las dos tarjetas que resumen el producto y el pie con lo que cuesta en tiempo. Nada más. */}
          {fase === 0 && (
            <>
              <div className="asist-badge"><span className="asist-badge-dot" /> {BIENVENIDA.badge}</div>
              <div className="asist-titular">
                {BIENVENIDA.titular}<br />
                <span className="asist-titular-2">{BIENVENIDA.titular2}</span>
              </div>
              <div className="asist-sub">{BIENVENIDA.intro}</div>

              <div className="asist-caja">
                <b>{BIENVENIDA.caja.t}</b>
                <small>{BIENVENIDA.caja.s}</small>
              </div>

              <div className="asist-nota"><I_Doc size={13} /> {BIENVENIDA.nota}</div>

              <div className="asist-tarjetas">
                {BIENVENIDA.tarjetas.map(tj => (
                  <div key={tj.t} className="asist-tarjeta">
                    <b>{tj.t}</b>
                    <small>{tj.s}</small>
                  </div>
                ))}
              </div>

              <div className="asist-reglas">
                {BIENVENIDA.reglas.map(r => <div key={r} className="asist-regla"><I_Check size={12} /> {r}</div>)}
              </div>

              <div className="asist-pie-datos">
                <span><I_Zap size={12} /> {BIENVENIDA.pie[0]} · {BIENVENIDA.pie[1]}</span>
                <span><I_Checklist size={12} /> {BIENVENIDA.pie[2]}</span>
              </div>

              <div className="asist-cta">
                <Button className="btn-lg" title="Empieza a llenar los datos del negocio: cinco preguntas cortas que el motor usa para arrancar."
                  onClick={siguiente}>Continuar <I_ArrowRight size={14} /></Button>
                <span className="tiny muted"><I_Clock size={11} /> se puede saltar y hacerlo después</span>
              </div>
            </>
          )}

          {/* ---------------- LOS CINCO PASOS ---------------- */}
          {paso && (
            <>
              <div className="bs"><b style={{ color: 'var(--txt)' }}>Para qué: </b>{paso.paraQue}</div>
              {/* En el paso 1 no se dibuja el cuadro de «lo que saca solo»: la pantalla tiene que
                  entrar entera y esa frase ya vive en el botón «Qué hace con esto». */}
              {paso.infiere && paso.n !== 1 && (
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
                  {ultimo ? <><I_Play size={13} /> Terminar y arrancar</> : <>{onb.completo(paso.n) ? 'Continuar' : 'Seguir después'} <I_ArrowRight size={13} /></>}
                </Button>
                <Button variant="ghost" className="btn-sm" title="Pasa al paso siguiente sin marcarlo: queda pendiente y el motor usa lo que haya"
                  onClick={siguiente}>Saltar</Button>
                <Button variant="ghost" className="btn-sm" title={`Para qué se lo pido: ${paso.paraQue} — acá ve qué hace el motor con cada dato y de dónde saca el resto.`}
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
          {fase > 1 && (
            <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
              <Button variant="ghost" className="btn-sm" title="Vuelva a la pantalla anterior"
                onClick={atras}><I_ArrowLeft size={13} /> Atrás</Button>
            </div>
          )}
          {/* La salida del asistente sólo se ofrece en la bienvenida: en los pasos ya está la X del
              encabezado y el botón «Saltar», y repetirla era ruido en una pantalla que tiene que
              entrar entera. */}
          {fase === 0 && (
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <Button variant="ghost" className="btn-sm"
                title="Cierra la bienvenida y le deja en el panel. Los datos quedan esperando en Primeros pasos para completarlos cuando quiera."
                onClick={() => { cerrar('Bienvenida cerrada: el panel ya está listo y los datos esperan en Primeros pasos'); setVista('hoy'); }}>
                Hacerlo después
              </Button>
            </div>
          )}
        </div>

        {/* Lo que va a pasar al terminar: en la bienvenida, que tiene lugar. En los pasos, no. */}
        <div className="asist-pie-2" style={fase > 0 ? { display: 'none' } : undefined}>
          <I_Play size={12} /> Al terminar, el motor arranca con los {plan.creditosMes.toLocaleString('es-CO')} créditos del plan {plan.nombre}.
        </div>
      </div>
    </div>
  );
}
