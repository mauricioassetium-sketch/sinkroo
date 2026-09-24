import { useState } from 'react';
import { Card, Badge, Button } from '../components/ui';
import { ViewHead } from '../components/viz';
import {
  I_Rocket, I_Check, I_ArrowLeft, I_ArrowRight, I_Upload, I_Image, I_Film, I_File, I_Zap,
  I_Shield, I_Users, I_Credit, I_Clock, I_Checklist,
} from '../components/icons';
import { MATERIAL, type CampoPublicacion } from '../data/publicaciones';
import { CARPETA, TENANT } from '../data/demo';
import { useDetalle } from '../components/Detalle';
import type { Vista } from '../components/Layout';
import { usePlan } from '../lib/plan';
import { useOnboarding } from '../lib/onboarding';
import {
  PASOS_ONB, PRIMERA_SEMANA, COSTO_PRIMERA_SEMANA, CONEXIONES_ONB, type CampoOnb,
} from '../data/onboarding';

// =============================================================================================
// PRIMEROS PASOS — el onboarding.
//
// Cinco pantallas cortas, con el mismo stepper que Campañas. Cada una dice para qué es, qué deduce
// el motor solo y ninguna es obligatoria. La última no termina en «listo»: arranca el motor y
// muestra el plan de la primera semana, día por día y con lo que cuesta. Lo primero que el cliente
// ve es trabajo del motor, no una pantalla de bienvenida.
// =============================================================================================

const IconoMaterial = ({ tipo }: { tipo: CampoPublicacion['tipo'] }) =>
  tipo === 'videos' ? <I_Film size={16} /> : tipo === 'archivos' ? <I_File size={16} /> : <I_Image size={16} />;

export function ViewOnboarding({ setToast, setVista }: { setToast: (t: string) => void; setVista: (v: Vista) => void }) {
  const onb = useOnboarding();
  const detalle = useDetalle();
  const { plan } = usePlan();
  const [pendiente, setPendiente] = useState(false); // «Seguir después»: se fue sin marcarlo
  const paso = PASOS_ONB.find(p => p.n === onb.paso)!;
  const ultimo = paso.n === PASOS_ONB.length;
  const esteListo = onb.listos.includes(paso.n);

  const elegir = (campo: CampoOnb, op: string) => {
    const actual = onb.datos[campo.id];
    if (campo.tipo === 'chips-multi') {
      const lista = (actual as string[] | undefined) || [];
      onb.escribir(campo.id, lista.includes(op) ? lista.filter(x => x !== op) : [...lista, op]);
    } else {
      onb.escribir(campo.id, actual === op ? '' : op);
    }
  };

  const irAlSiguiente = (marcar: boolean) => {
    if (marcar) onb.marcar(paso.n);
    setPendiente(!marcar);
    if (!ultimo) onb.irA(paso.n + 1);
    else setToast('Podés arrancar el motor cuando quieras: nada de lo que pusiste se pierde');
  };

  // ---------------------------------------------------------------------------------------------
  // Los controles. Se dibujan desde la data: agregar un dato al onboarding es agregar una línea
  // en PASOS_ONB, no escribir pantalla nueva.
  // ---------------------------------------------------------------------------------------------
  const control = (campo: CampoOnb) => {
    const v = onb.datos[campo.id];

    if (campo.tipo === 'texto' || campo.tipo === 'numero') {
      return (
        <input className="input" style={campo.ancho ? { maxWidth: campo.ancho } : undefined}
          placeholder={campo.ayuda} value={(v as string) || ''}
          onChange={e => onb.escribir(campo.id, e.target.value)} />
      );
    }

    if (campo.tipo === 'chips' || campo.tipo === 'chips-multi') {
      const lista = campo.tipo === 'chips-multi' ? ((v as string[]) || []) : [];
      const activo = (op: string) => (campo.tipo === 'chips-multi' ? lista.includes(op) : v === op);
      return (
        <div className="onb-chips">
          {(campo.opciones || []).map(op => (
            <button key={op} type="button" className={`tipo-chip ${activo(op) ? 'sel' : ''}`}
              title={campo.detalle?.[op] || `${op}: elegilo para que el motor trabaje con eso`}
              onClick={() => elegir(campo, op)}>
              {activo(op) ? '✓ ' : ''}{op}
            </button>
          ))}
          {(campo.tipo === 'chips-multi' ? lista : (v ? [v as string] : [])).map(op => (
            <div key={op} className="tiny onb-elegido">
              <I_Check size={11} /> <b>{op}</b>{campo.detalle?.[op] ? ` — ${campo.detalle[op]}` : ''}
            </div>
          ))}
        </div>
      );
    }

    if (campo.tipo === 'material') {
      return (
        <div className="onb-mat">
          {MATERIAL.map(m => {
            const carpeta = CARPETA[m.id] || [];
            const puestos = onb.material[m.id] || [];
            const subidos = puestos.filter(p => !carpeta.some(c => c.nombre === p));
            return (
              <div key={m.id} className="onb-mat-fila">
                <div className="onb-mat-lb">
                  <span className="onb-mat-ic"><IconoMaterial tipo={m.tipo} /></span>
                  <span style={{ minWidth: 0 }}>
                    <b>{m.etiqueta.replace(/^\S+\s/, '')}</b>
                    <small>{puestos.length ? `${puestos.length} elegido${puestos.length > 1 ? 's' : ''}` : m.ayuda}</small>
                  </span>
                  <label className="onb-mat-up" title={`Subir algo nuevo a «${m.etiqueta.replace(/^\S+\s/, '')}»: queda en tu carpeta`}>
                    <I_Upload size={13} />
                    <input type="file" multiple style={{ display: 'none' }}
                      onChange={e => { Array.from(e.target.files || []).forEach(f => onb.alternarMaterial(m.id, f.name)); setToast(`${e.target.files?.length || 0} archivo a «${m.etiqueta.replace(/^\S+\s/, '')}»`); }} />
                  </label>
                </div>
                <div className="onb-mat-chips">
                  {carpeta.map(c => {
                    const puesto = puestos.includes(c.nombre);
                    return (
                      <button key={c.nombre} type="button" className={`tipo-chip onb-chip-arch ${puesto ? 'sel' : ''}`}
                        title={puesto ? `Ya está elegido (${c.peso}). Tocá para sacarlo de esta configuración.` : `Sumar «${c.nombre}» (${c.peso}) sin volver a subirlo.`}
                        onClick={() => onb.alternarMaterial(m.id, c.nombre)}>
                        {puesto ? '✓ ' : ''}{c.nombre}
                      </button>
                    );
                  })}
                  {subidos.map(nombre => (
                    <button key={nombre} type="button" className="tipo-chip onb-chip-arch sel"
                      title="Lo subiste recién: queda en tu carpeta para la próxima campaña."
                      onClick={() => onb.alternarMaterial(m.id, nombre)}>✓ {nombre}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // ---------------------------------------------------------------------------------------------
  // El paso 5: las conexiones y el arranque.
  // ---------------------------------------------------------------------------------------------
  const conectadas = (onb.datos['conectadas'] as string[] | undefined) || [];
  const alternarConexion = (key: string) => {
    const nuevas = conectadas.includes(key) ? conectadas.filter(k => k !== key) : [...conectadas, key];
    onb.escribir('conectadas', nuevas);
    const c = CONEXIONES_ONB.find(x => x.key === key)!;
    setToast(nuevas.includes(key) ? `${c.nombre} conectada: ${c.detalle}` : `${c.nombre} desconectada: el motor ya no publica ahí`);
  };

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Rocket size={19} />}
        titulo="Primeros pasos"
        sub="Cinco pantallas cortas y el motor queda trabajando. Nada es obligatorio: lo que no pongas, lo deduce solo."
        nums={[
          { v: `${onb.listos.length} de ${PASOS_ONB.length}`, l: 'pasos hechos', c: onb.listos.length === PASOS_ONB.length ? 'var(--green)' : 'var(--purple3)' },
          { v: onb.arrancado ? 'En marcha' : 'Sin arrancar', l: 'el motor', c: onb.arrancado ? 'var(--green)' : 'var(--amber)' },
          { v: `Plan ${plan.nombre}`, l: `${plan.creditosMes.toLocaleString('es-AR')} créditos por mes` },
          { v: String(COSTO_PRIMERA_SEMANA), l: 'créditos de la primera semana' },
        ]}
      />

      {/* El stepper: el mismo de Campañas, para que las dos etapas del producto se lean igual. */}
      <div className="pasos">
        {PASOS_ONB.map(p => (
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
            <div className="onb-conexiones">
              {CONEXIONES_ONB.map(c => {
                const activo = conectadas.includes(c.key);
                return (
                  <div key={c.key} className="guard">
                    <span style={{ fontSize: 17, flexShrink: 0 }}>{c.icono}</span>
                    <span className="guard-lb">{c.nombre}
                      <small>{activo && c.habilitadoHoy ? `${c.detalle} Ya estaba conectada cuando entraste: si la dejás, el motor sigue publicando ahí.` : c.detalle}</small>
                    </span>
                    <Badge tone={activo ? 'green' : 'muted'}>{activo ? 'conectada' : 'sin conectar'}</Badge>
                    <Button variant={activo ? 'outline' : 'ghost'} className="btn-sm"
                      title={activo ? `Desconecta ${c.nombre}: el motor deja de publicar ahí al instante y sus automatizaciones se pausan. Reversible desde acá mismo.` : `Conecta ${c.nombre}: ${c.detalle}`}
                      onClick={() => alternarConexion(c.key)}>
                      {activo ? 'Desconectar' : 'Conectar'}
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* La verificación: es legal y va aparte. El aviso apunta a dónde se hace, no la hace acá. */}
            <div className="onb-infiere" style={{ borderColor: 'rgba(245,158,11,.32)' }}>
              <span className="onb-infiere-ic" style={{ color: 'var(--amber)' }}><I_Shield size={13} /></span>
              <span><b>Falta la verificación de identidad: </b>es obligatoria para pautar y se resuelve en
                {' '}<button className="onb-link" title="Abre Verificación, donde se suben los documentos"
                  onClick={() => setVista('kyc')}>Verificación</button>.
                Hasta que esté, el motor prepara todo y no publica nada.</span>
            </div>

            {/* El arranque: lo que pasa cuando aprieta. */}
            {onb.arrancado ? (
              <>
                <div className="onb-arrancado">
                  <I_Rocket size={15} />
                  <span><b>El motor está trabajando.</b> Arrancó por el mercado: en unas horas vas a ver el primer
                    informe y las piezas de la semana en Campañas. Nada de esto gasta plata hasta que la pieza pasa el panel.</span>
                </div>
                <div className="onb-semana">
                  {PRIMERA_SEMANA.map(d => (
                    <div key={d.dia} className="onb-dia">
                      <span className="onb-dia-n">{d.dia}</span>
                      <span className="onb-dia-quien">{d.quien}</span>
                      <span className="onb-dia-que">{d.que}</span>
                      <span className="onb-dia-cr">{d.creditos}</span>
                    </div>
                  ))}
                  <div className="onb-dia-total">
                    <span>Total de la primera semana</span>
                    <span><b>{COSTO_PRIMERA_SEMANA} créditos</b> de los {plan.creditosMes.toLocaleString('es-AR')} del plan {plan.nombre} · publicar es aparte</span>
                  </div>
                </div>
                <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
                  <Button className="btn-sm" title="Va a tu panel: lo que el motor ya hizo te espera en Hoy"
                    onClick={() => setVista('hoy')}><I_ArrowRight size={13} /> Ir a mi panel</Button>
                  <Button variant="ghost" className="btn-sm" title="Abre Campañas, donde aparecen el informe del mercado y las piezas de la semana"
                    onClick={() => setVista('campanas')}>Ver las campañas</Button>
                  <Button variant="ghost" className="btn-sm" title="Muestra en qué se va cada crédito y cuántos te quedan"
                    onClick={() => setVista('creditos')}>Mis créditos</Button>
                </div>
              </>
            ) : (
              <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
                <Button className="btn-sm" title={`Arranca el motor ahora: investiga tu mercado y prepara las piezas de la semana. Cuesta ${COSTO_PRIMERA_SEMANA} créditos y no gasta plata hasta que las piezas pasan el panel.`}
                  onClick={() => {
                    onb.arrancar();
                    onb.marcar(5);
                    setToast(`${onb.listos.length >= 4 ? 'Listo' : 'El motor arrancó'}: empieza por el mercado, no gasta nada hasta publicar`);
                  }}><I_Rocket size={13} /> Arrancar el motor</Button>
                <Button variant="ghost" className="btn-sm" title="Guarda lo que pusiste y te deja seguir después desde Hoy"
                  onClick={() => { onb.desmarcar(5); setVista('hoy'); setToast('Guardado: seguís cuando quieras desde Hoy'); }}>
                  Dejarlo para después
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="onb-campos">
              {paso.campos.map(c => (
                <div key={c.id} className="onb-campo">
                  <label className="label">{c.etiqueta}</label>
                  {control(c)}
                </div>
              ))}
            </div>

            {paso.nota && <div className="acc-why">{paso.nota}</div>}

            <div className="row" style={{ gap: 9, marginTop: 16, flexWrap: 'wrap' }}>
              {paso.n > 1 && (
                <Button variant="ghost" className="btn-sm" title="Volvé al paso anterior: nada de lo que pusiste se pierde"
                  onClick={() => onb.irA(paso.n - 1)}><I_ArrowLeft size={13} /> Atrás</Button>
              )}
              <Button className="btn-sm" title={onb.completo(paso.n) ? 'Queda anotado y pasás al paso siguiente' : 'Pasás al paso siguiente; este queda pendiente y el motor usa lo que haya'}
                onClick={() => irAlSiguiente(true)}>
                {onb.completo(paso.n) ? <>Continuar <I_ArrowRight size={13} /></> : <>Seguir después <I_ArrowRight size={13} /></>}
              </Button>
              <Button variant="ghost" className="btn-sm" title="Te muestra qué hace el motor con lo de este paso y de dónde saca el resto"
                onClick={() => detalle({
                  titulo: `${paso.t}: qué hace el motor con esto`,
                  sub: paso.paraQue,
                  bloques: [
                    { tipo: 'pasos', items: paso.minima.map(id => {
                      const c = paso.campos.find(x => x.id === id);
                      const puestoTxt = onb.completo(paso.n);
                      return `${c ? c.etiqueta : id}: ${puestoTxt ? 'ya está puesto' : 'todavía falta'}`;
                    }) },
                    ...(paso.infiere ? [{ tipo: 'texto' as const, texto: `Lo que el motor saca solo: ${paso.infiere}` }] : []),
                    { tipo: 'aviso' as const, texto: 'Este paso no bloquea nada: el motor arranca igual y va corrigiendo con lo que aprenda de tus conversaciones y de tu cuenta.' },
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
                    { t: 'Nia · las piezas', s: 'todavía no escribió: arranca cuando le des el material o el ángulo', etiqueta: 'sin arrancar', tono: 'muted' },
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
        <b>Nada de esto es obligatorio.</b> {TENANT.cuenta} puede arrancar con dos datos y el motor trabaja igual:
        lo que pongas ahora es para que la primera semana no se pierda adivinando.
      </div>
    </div>
  );
}
