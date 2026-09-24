import { useState } from 'react';
import { Button } from '../components/ui';
import {
  I_X, I_Check, I_ArrowRight, I_ArrowLeft, I_Rocket, I_Zap, I_Users, I_Clock,
} from '../components/icons';
import { useOnboarding } from '../lib/onboarding';
import { useDetalle } from './Detalle';
import { usePlan } from '../lib/plan';
import { CamposPaso, BloqueConexiones, BloqueArranque, AvisoVerificacion } from './PasoOnboarding';
import { BIENVENIDA, TIPOS_CUENTA } from '../data/onboarding';
import type { Sesion } from '../views/Login';

// =============================================================================================
// EL ASISTENTE DE ENTRADA — el pop-up que aparece después de iniciar sesión.
//
// Tres bloques: la BIENVENIDA (qué hace el motor con tu negocio), el TIPO DE CUENTA (negocio o
// creador, que cambia las preguntas de verdad) y los CINCO PASOS. Todo saltable: hay un «Saltar» en
// cada pantalla y una salida que dice dónde se termina después (Primeros pasos, dentro del panel).
//
// Se abre solo la primera vez que hay sesión, y no vuelve a molestar: si el cliente lo saltó, queda
// el cartel de Hoy con el paso siguiente.
// =============================================================================================

export function Asistente({ sesion, setVista }: { sesion: Sesion; setVista: (v: any) => void }) {
  const onb = useOnboarding();
  const detalle = useDetalle();
  const { plan } = usePlan();
  const [autoHecho, setAutoHecho] = useState(false);

  // Se abre una sola vez, cuando hay sesión y todavía no se abrió.
  if (sesion && !autoHecho) {
    setAutoHecho(true);
    onb.abrirAsistente(0);
  }
  if (!onb.asistente.abierto) return null;

  const fase = onb.asistente.fase;
  const paso = fase >= 2 ? onb.pasos[fase - 2] : null;
  const ultimo = fase === 6;
  const tipo = TIPOS_CUENTA.find(t => t.key === onb.tipo);

  const cerrar = (aviso: string) => { onb.cerrarAsistente(); onb.avisar(aviso); };
  // La cuenta ya tiene su tipo (se eligió al registrarse): no se vuelve a preguntar, se saltea.
  const saltarTipo = onb.cuentaBloqueada;
  const siguiente = () => onb.irAFase(fase === 0 && saltarTipo ? 2 : Math.min(6, fase + 1));
  const atras = () => onb.irAFase(Math.max(0, fase - 1));

  return (
    <div className="asist">
      <div className="asist-panel">
        {/* Encabezado: dónde está parado y la salida, siempre visible. */}
        <div className="asist-head">
          <div className="row" style={{ gap: 9, alignItems: 'center' }}>
            <span className="asist-paso-n">
              {fase === 0 ? '👋' : fase === 1 ? '👤' : `${paso?.n}`}
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="asist-t">
                {fase === 0 ? BIENVENIDA.titulo : fase === 1 ? '¿Cómo vas a usar Sinkroo?' : paso?.titular}
              </div>
              <div className="tiny muted">
                {fase === 0 ? 'Antes de empezar: qué va a hacer el motor con tu negocio'
                  : fase === 1 ? 'Elegí una: cambia las preguntas del asistente'
                    : `Paso ${paso?.n} de 5 · ${onb.listos.length} hechos`}
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <span className="tiny muted">se completa después en Primeros pasos</span>
            <button className="icon-btn" title="Salir del asistente. El panel ya está listo y lo que falta queda en Primeros pasos."
              onClick={() => cerrar('Asistente cerrado: seguís desde Primeros pasos cuando quieras')}><I_X size={15} /></button>
          </div>
        </div>

        {/* El avance, para saber cuánto falta. */}
        <div className="asist-barra">
          {[0, 1, 2, 3, 4, 5, 6].map(f => (
            <button key={f} className={`asist-barra-t ${fase >= f ? 'on' : ''} ${fase === f ? 'act' : ''}`}
              title={f === 0 ? 'Bienvenida' : f === 1 ? (saltarTipo ? `Tu cuenta: ${tipo?.nombre || ''}` : 'Tipo de cuenta') : `Paso ${f - 1}: ${onb.pasos[f - 2]?.t}`}
              onClick={() => { if (f === 1 && saltarTipo) { onb.avisar(`Tu cuenta es de ${(tipo?.nombre || '').toLowerCase()}: no se cambia`); return; } onb.irAFase(f); }} />
          ))}
        </div>

        <div className="asist-cuerpo">
          {/* ---------------- BIENVENIDA ---------------- */}
          {fase === 0 && (
            <>
              <div className="asist-hola">Hola{sesion.nombre ? ` ${sesion.nombre.split(' ')[0]}` : ''} 👋</div>
              <div className="bs">{BIENVENIDA.sub}</div>
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
              <div className="acc-why">
                El asistente que sigue tiene <b>dos pasos de contexto y cinco de datos</b>. Se puede saltar entero:
                el motor arranca igual y vos completás lo que falte cuando quieras.
              </div>
            </>
          )}

          {/* ---------------- TIPO DE CUENTA ---------------- */}
          {fase === 1 && saltarTipo && (
            <>
              <div className="asist-hola">Tu cuenta es de {tipo?.nombre.toLowerCase() || 'un tipo'} {tipo?.icono}</div>
              <div className="bs">
                Lo elegiste al crear la cuenta, así que <b>el asistente ya sabe qué preguntarte</b> y no te lo vuelve a pedir.
                Un correo es una cuenta: si algún día necesitás el otro panel, se crea otra cuenta con otro correo.
              </div>
              <div className="asist-tipos">
                {TIPOS_CUENTA.map(x => (
                  <button key={x.key} className={`asist-tipo ${onb.tipo === x.key ? 'sel' : ''}`}
                    title={onb.tipo === x.key ? `Esta cuenta es de ${x.nombre.toLowerCase()}: es lo que el correo es y no se cambia.` : `${x.nombre}: para esta cuenta no aplica. Se necesita otro correo.`}
                    onClick={() => onb.avisar(onb.tipo === x.key ? `Ya sos ${x.nombre.toLowerCase()}` : `Para ${x.nombre.toLowerCase()} hace falta otra cuenta, con otro correo`)}>
                    <span className="asist-tipo-ic">{x.icono}</span>
                    <span className="asist-tipo-t">{x.nombre}{onb.tipo === x.key ? ' ✓' : ''}</span>
                    <span className="asist-tipo-q">{onb.tipo === x.key ? 'Tu cuenta' : 'No aplica a esta cuenta'}</span>
                    <span className="asist-tipo-p">{x.quien}</span>
                  </button>
                ))}
              </div>
              <div className="asist-reglas" style={{ marginTop: 12 }}>
                <div className="asist-regla"><I_Check size={12} /> El tipo se elige una sola vez y queda en el correo: no se puede usar el mismo correo para dos cuentas.</div>
                <div className="asist-regla"><I_Check size={12} /> Las preguntas del asistente y el panel salen de acá: se arman para {onb.tipo === 'creador' ? 'un creador' : 'un negocio'}.</div>
              </div>
            </>
          )}

          {/* ---------------- TIPO DE CUENTA (cuenta nueva) ---------------- */}
          {fase === 1 && !saltarTipo && (
            <>
              <div className="bs">Lo primero es para qué vas a usar Sinkroo, porque cambia las preguntas y lo que pasa al final.</div>
              <div className="asist-tipos">
                {TIPOS_CUENTA.map(t => {
                  const activo = onb.tipo === t.key;
                  return (
                    <button key={t.key} className={`asist-tipo ${activo ? 'sel' : ''}`}
                      title={`${t.nombre}: ${t.paraQue} Reversible: podés cambiarlo después y el asistente se rearma.`}
                      onClick={() => onb.elegirTipo(t.key)}>
                      <span className="asist-tipo-ic">{t.icono}</span>
                      <span className="asist-tipo-t">{t.nombre}{activo ? ' ✓' : ''}</span>
                      <span className="asist-tipo-q">{t.quien}</span>
                      <span className="asist-tipo-p">{t.paraQue}</span>
                      <span className="asist-tipo-c">
                        {t.cambia.map(c => <span key={c} className="tiny">· {c}</span>)}
                      </span>
                    </button>
                  );
                })}
              </div>
              {tipo && (
                <div className="acc-why">
                  Elegiste <b>{tipo.nombre}</b>. {tipo.paraQue} Si te equivocás, se cambia desde Primeros pasos.
                </div>
              )}
            </>
          )}

          {/* ---------------- LOS CINCO PASOS ---------------- */}
          {paso && (
            <>
              <div className="bs"><b style={{ color: 'var(--txt)' }}>Para qué te lo pido: </b>{paso.paraQue}</div>
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
                  title={onb.tipo === 'creador' && paso.n === 5 ? 'Publica tu perfil para que las marcas te encuentren' : 'Queda anotado y pasás al paso siguiente'}
                  onClick={() => { onb.marcar(paso.n); ultimo ? onb.arrancar() : siguiente(); }}>
                  {ultimo ? <><I_Rocket size={13} /> Terminar y arrancar</> : <>{onb.completo(paso.n) ? 'Continuar' : 'Seguir después'} <I_ArrowRight size={13} /></>}
                </Button>
                <Button variant="ghost" className="btn-sm" title="Pasás al paso siguiente sin marcarlo: queda pendiente y el motor usa lo que haya"
                  onClick={siguiente}>Saltar este paso</Button>
                <Button variant="ghost" className="btn-sm" title="Te muestra qué hace el motor con lo de este paso y de dónde saca el resto"
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
                      { tipo: 'aviso' as const, texto: 'Este paso no bloquea nada: el motor trabaja igual y va corrigiendo con lo que aprende de tus conversaciones y de tu cuenta.' },
                    ],
                    fuente: 'Primeros pasos · el asistente no frena el trabajo del motor, sólo le da el punto de partida.',
                  })}>Qué hace con esto</Button>
              </div>
            </>
          )}
        </div>

        {/* Pie: navegación y la salida clara, sin letra chica. */}
        <div className="asist-pie">
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button variant="ghost" className="btn-sm" disabled={fase === 0} title="Volvé a la pantalla anterior"
              onClick={atras}><I_ArrowLeft size={13} /> Atrás</Button>
            {fase === 0 && (
              <Button className="btn-sm"
                title={saltarTipo ? `Arranca el asistente: como tu cuenta es de ${(tipo?.nombre || '').toLowerCase()}, va derecho a los cinco pasos` : 'Arranca el asistente: elegís el tipo de cuenta y después los cinco pasos'}
                onClick={siguiente}>Empezar <I_ArrowRight size={13} /></Button>
            )}
            {fase === 1 && (
              <Button className="btn-sm" disabled={!onb.tipo}
                title={onb.tipo ? 'Sigue con el primero de los cinco pasos' : 'Elegí primero si sos negocio o creador'}
                onClick={siguiente}>Continuar <I_ArrowRight size={13} /></Button>
            )}
          </div>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <span className="tiny muted">
              <I_Clock size={11} /> 4 minutos · el motor arranca igual si lo saltás
            </span>
            <Button variant="ghost" className="btn-sm"
              title="Salta el asistente entero y te deja en el panel. Todo queda en Primeros pasos para completarlo cuando quieras."
              onClick={() => { cerrar('Asistente salteado: el panel ya está listo y lo que falta espera en Primeros pasos'); setVista('hoy'); }}>
              Saltar todo
            </Button>
          </div>
        </div>

        {/* Lo que va a pasar al terminar: cambia según el tipo elegido. */}
        {fase >= 1 && (
          <div className="asist-pie-2">
            {onb.tipo === 'creador'
              ? <><I_Users size={12} /> Al terminar, tu perfil queda visible en el mercado de creadores y las marcas te contactan. Sinkroo no publica por vos ni cobra por pieza.</>
              : <><I_Rocket size={12} /> Al terminar, el motor arranca por el mercado y arma la primera semana: {plan.creditosMes.toLocaleString('es-AR')} créditos del plan {plan.nombre}, y publicar es aparte.</>}
          </div>
        )}
      </div>
    </div>
  );
}
