import { useState } from 'react';
import { Card, Badge, Button } from '../components/ui';
import { ViewHead } from '../components/viz';
import { I_Rocket, I_Check, I_ArrowLeft, I_ArrowRight, I_Zap, I_Users, I_Credit, I_Clock, I_Checklist } from '../components/icons';
import { useDetalle } from '../components/Detalle';
import type { Vista } from '../components/Layout';
import { usePlan } from '../lib/plan';
import { useOnboarding } from '../lib/onboarding';
import { CamposPaso, BloqueConexiones, BloqueArranque, AvisoVerificacion } from '../components/PasoOnboarding';
import { COSTO_PRIMERA_SEMANA } from '../data/onboarding';

// =============================================================================================
// PRIMEROS PASOS — los cinco pasos del negocio, dentro del panel.
//
// Es donde se completa lo que se salteó en el asistente de entrada. Comparte los controles con el
// asistente (`components/PasoOnboarding`): un paso se llena igual en los dos lados, así que no hay
// dos versiones del mismo control que se puedan separar.
// =============================================================================================

export function ViewOnboarding({ setToast, setVista }: { setToast: (t: string) => void; setVista: (v: Vista) => void }) {
  const onb = useOnboarding();
  const detalle = useDetalle();
  const { plan } = usePlan();
  const [pendiente, setPendiente] = useState(false);
  const paso = onb.pasos.find(p => p.n === onb.paso)!;
  const ultimo = paso.n === onb.pasos.length;
  const esteListo = onb.listos.includes(paso.n);
  const puesto = (id: string) => {
    const v = onb.datos[id];
    return Array.isArray(v) ? v.length > 0 : !!String(v || '').trim();
  };

  const irAlSiguiente = (marcar: boolean) => {
    if (marcar) onb.marcar(paso.n);
    setPendiente(!marcar);
    if (!ultimo) onb.irA(paso.n + 1);
    else setToast('Podés arrancar cuando quieras: nada de lo que pusiste se pierde');
  };

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Rocket size={19} />}
        titulo="Primeros pasos"
        sub="Lo que el motor no puede deducir solo. Nada es obligatorio: lo que no pongas, lo saca de tu cuenta y de tus conversaciones."
        nums={[
          { v: `${onb.listos.length} de ${onb.pasos.length}`, l: 'pasos hechos', c: onb.listos.length === onb.pasos.length ? 'var(--green)' : 'var(--purple3)' },
          { v: onb.arrancado ? 'En marcha' : 'Sin arrancar', l: 'el motor', c: onb.arrancado ? 'var(--green)' : 'var(--amber)' },
          { v: `Plan ${plan.nombre}`, l: `${plan.creditosMes.toLocaleString('es-AR')} créditos por mes` },
          { v: String(COSTO_PRIMERA_SEMANA), l: 'créditos de la primera semana' },
        ]}
      />

      {/* El stepper: el mismo de Campañas, para que las dos etapas del producto se lean igual. */}
      <div className="pasos">
        {onb.pasos.map(p => (
          <button key={p.n} className={`paso ${onb.paso === p.n ? 'on' : ''} ${onb.listos.includes(p.n) ? 'done' : ''}`}
            title={`${p.t}: ${p.d}. ${onb.listos.includes(p.n) ? 'Ya está hecho: podés volver a cambiarlo.' : 'Falta.'}`}
            onClick={() => { onb.irA(p.n); setPendiente(false); }}>
            <span className="paso-n">{onb.listos.includes(p.n) && onb.paso !== p.n ? <I_Check size={13} /> : p.icono}</span>
            <span style={{ minWidth: 0 }}>
              <span className="paso-t">{p.t}</span>
              <span className="paso-d">{p.d}</span>
            </span>
          </button>
        ))}
      </div>

      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Checklist size={14} style={{ color: 'var(--purple3)' }} /> {paso.titular}</span>}
        action={<Badge tone={esteListo ? 'green' : 'muted'}>{esteListo ? 'hecho' : 'pendiente'}</Badge>}
      >
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
            <AvisoVerificacion ir={() => setVista('kyc')} />
            <BloqueArranque />
            {onb.arrancado && (
              <div className="row" style={{ gap: 9, marginTop: 12, flexWrap: 'wrap' }}>
                <Button className="btn-sm" title="Va a tu panel: lo que el motor ya hizo te espera en Hoy"
                  onClick={() => setVista('hoy')}><I_ArrowRight size={13} /> Ir a mi panel</Button>
                <Button variant="ghost" className="btn-sm" title="Abre Campañas, donde aparecen el informe del mercado y las piezas de la semana"
                  onClick={() => setVista('campanas')}>Ver las campañas</Button>
                <Button variant="ghost" className="btn-sm" title="Muestra en qué se va cada crédito y cuántos te quedan"
                  onClick={() => setVista('creditos')}><I_Credit size={13} /> Mis créditos</Button>
              </div>
            )}
          </>
        ) : (
          <>
            <CamposPaso paso={paso} />
            {paso.nota && <div className="acc-why">{paso.nota}</div>}

            <div className="row" style={{ gap: 9, marginTop: 16, flexWrap: 'wrap' }}>
              {paso.n > 1 && (
                <Button variant="ghost" className="btn-sm" title="Volvé al paso anterior: nada de lo que pusiste se pierde"
                  onClick={() => onb.irA(paso.n - 1)}><I_ArrowLeft size={13} /> Atrás</Button>
              )}
              <Button className="btn-sm"
                title={onb.completo(paso.n) ? 'Queda anotado y pasás al paso siguiente' : 'Pasás al siguiente; este queda pendiente y el motor usa lo que haya'}
                onClick={() => irAlSiguiente(true)}>
                {onb.completo(paso.n) ? <>Continuar <I_ArrowRight size={13} /></> : <>Seguir después <I_ArrowRight size={13} /></>}
              </Button>
              <Button variant="ghost" className="btn-sm" title="Te muestra qué hace el motor con lo de este paso y de dónde saca el resto"
                onClick={() => detalle({
                  titulo: `${paso.t}: qué hace el motor con esto`,
                  sub: paso.paraQue,
                  bloques: [
                    { tipo: 'filas', items: paso.campos.map(c => ({
                      t: c.etiqueta, s: c.ayuda,
                      etiqueta: puesto(c.id) ? 'puesto' : 'falta',
                      tono: puesto(c.id) ? 'green' as const : 'muted' as const,
                    })) },
                    ...(paso.infiere ? [{ tipo: 'texto' as const, texto: `Lo que el motor saca solo: ${paso.infiere}` }] : []),
                    { tipo: 'aviso' as const, texto: 'Este paso no bloquea nada: el motor arranca igual y va corrigiendo con lo que aprende de tus conversaciones y de tu cuenta.' },
                  ],
                  fuente: 'Primeros pasos · el onboarding no frena el trabajo del motor, sólo le da el punto de partida.',
                  acciones: [
                    { label: ultimo ? 'Ir al arranque' : 'Seguir con el próximo paso', variante: 'primary', title: 'Marca este paso y sigue', onClick: () => irAlSiguiente(true) },
                    { label: 'Cerrar', title: 'Cierra sin cambiar nada', onClick: () => {} },
                  ],
                })}>Qué hace con esto</Button>
              {pendiente && <span className="tiny muted" style={{ alignSelf: 'center' }}>Quedó pendiente, pero guardado: el motor usa lo que haya.</span>}
            </div>
          </>
        )}
      </Card>

      {/* Lo que sigue, siempre a la vista: es lo que hace que el cliente sepa dónde está parado. */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--purple3)' }} /> Quién va a trabajar con esto</span>}
          action={<Badge tone="purple">6 agentes + el panel</Badge>}
        >
          <div className="bs">
            Los <b>6 agentes</b> investigan y producen (Lux el mercado, Rex el presupuesto, Nia las piezas,
            Kai la pauta, Sol los números, Rumi las conversaciones). Lo que producen pasa por el <b>panel</b>:
            los 5 jueces lo puntúan y 500 personas del público reaccionan. Las 3 mejores salen.
          </div>
          <div className="onb-datos">
            <div className="dato"><span className="dato-l">Investigación del mercado</span><span className="dato-v" style={{ color: 'var(--green)' }}>no cuesta créditos</span></div>
            <div className="dato"><span className="dato-l">Los 500 del público</span><span className="dato-v" style={{ color: 'var(--green)' }}>no cuesta créditos</span></div>
            <div className="dato"><span className="dato-l">Publicar</span><span className="dato-v" style={{ color: 'var(--amber)' }}>es lo único que gasta plata</span></div>
          </div>
          <div className="acc-why">
            Nada sale a tus cuentas sin pasar por el panel: si ninguna pieza convence, no se publica ninguna
            y sólo se gastaron los créditos de escribirla.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Clock size={14} style={{ color: 'var(--green)' }} /> Cuánto tarda</span>}
          action={<Badge tone="green">{onb.arrancado ? 'ya está en marcha' : 'unas 3 horas'}</Badge>}
        >
          <div className="bs">
            Con las cuentas conectadas, el motor tarda <b>unas 3 horas</b> en tener el primer informe del mercado
            y las primeras piezas listas. No hace falta que estés mirando: te avisa por WhatsApp cuando hay
            algo para decidir.
          </div>
          <div className="onb-datos">
            <div className="dato"><span className="dato-l">Primer informe del mercado</span><span className="dato-v">~2 h</span></div>
            <div className="dato"><span className="dato-l">Primeras piezas</span><span className="dato-v">~3 h</span></div>
            <div className="dato"><span className="dato-l">Veredicto del panel</span><span className="dato-v">al terminar las piezas</span></div>
          </div>
          <div className="row" style={{ gap: 9, marginTop: 4, flexWrap: 'wrap' }}>
            <Button variant="ghost" className="btn-sm" title="Muestra qué hace el motor mientras trabajás en esto"
              onClick={() => detalle({
                titulo: 'Qué hace el motor mientras tanto',
                sub: 'El onboarding no es un permiso: el motor ya está investigando con lo que hay. Esto es lo que está pasando ahora mismo.',
                bloques: [
                  { tipo: 'filas', items: [
                    { t: 'Lux · el mercado', s: 'leyó 47 anuncios de tus 6 competidores de la zona', etiqueta: 'en curso', tono: 'purple' },
                    { t: 'Rex · el presupuesto', s: 'comparó dónde rinde más cada peso hoy', etiqueta: 'en curso', tono: 'purple' },
                    { t: 'Kai · la pauta', s: 'revisa cada 15 minutos las campañas que ya corren', etiqueta: 'en curso', tono: 'purple' },
                    { t: 'Rumi · las conversaciones', s: 'espera tu OK para el primer mensaje', etiqueta: 'espera tu OK', tono: 'amber' },
                    { t: 'Nia · las piezas', s: 'todavía no escribió: arranca cuando tenga el material o el ángulo', etiqueta: 'sin arrancar', tono: 'muted' },
                  ] },
                  { tipo: 'aviso', texto: 'Cuando pongas algo en un paso, el motor lo toma en la próxima vuelta: no hay que apretar ningún botón para que lo use.' },
                ],
                fuente: 'Cada agente declara qué está haciendo en su propia ficha, en Hoy y en Campañas.',
              })}>Ver qué está haciendo ahora</Button>
            <Button variant="ghost" className="btn-sm" title="Muestra en qué se van cada uno de los créditos que usás"
              onClick={() => setVista('creditos')}><I_Credit size={13} /> En qué se van mis créditos</Button>
          </div>
        </Card>
      </div>

      <div className="acc-why" style={{ marginTop: 14 }}>
        <b>Nada de esto es obligatorio.</b> Podés dejarlo así: el motor trabaja con dos datos y completa el
        resto con lo que aprende de tus cuentas y tus conversaciones.
      </div>
    </div>
  );
}
