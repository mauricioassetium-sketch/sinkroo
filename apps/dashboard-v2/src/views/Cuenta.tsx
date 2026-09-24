import { useState } from 'react';
import { Card, Badge, Button, Dinero, NotaMoneda } from '../components/ui';
import { ViewHead, Gauge, BarRow } from '../components/viz';
import { I_Settings, I_Check, I_Shield, I_Lock, I_Plus, I_Zap, I_Credit, I_Link, I_Clock, I_Sun, I_X } from '../components/icons';
import { MODOS, EXCEPCIONES, FRENOS, CONEXIONES, CREDITOS_MOV, TENANT, INVESTIGACION_MERCADO, type Modo, type Conexion } from '../data/demo';
import { useDetalle, type Bloque } from '../components/Detalle';

const NOMBRE: Record<Modo, string> = { auto: 'Automático', shared: 'Compartido', manual: 'Manual' };

/** La hora real de cada movimiento: es lo que hace que el historial no sea un texto fijo. */
const ahora = () => new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

const palabraCuenta = (n: number) => (n === 1 ? 'una cosa' : `${n} cosas`);

export function ViewCuenta({ setToast, modo, setModo }: { setToast: (t: string) => void; modo: Modo; setModo: (m: Modo) => void }) {
  // La misma pantalla, dos pieles: si la cuenta es de un creador, ve su Cuenta y autonomía (el dial
  // acción por acción, los guardrails y su Ficha). El corte va en el cuerpo de esta función, antes
  // que cualquier otro hook, así el cambio de piel no altera el orden de los hooks de la vista de
  // negocio: ésa vive intacta abajo, en `ViewCuentaNegocio`.
  return <ViewCuentaNegocio setToast={setToast} modo={modo} setModo={setModo} />;
}

function ViewCuentaNegocio({ setToast, modo, setModo }: { setToast: (t: string) => void; modo: Modo; setModo: (m: Modo) => void }) {
  const detalle = useDetalle();
  const [niveles, setNiveles] = useState<Record<string, Modo>>(
    Object.fromEntries(EXCEPCIONES.map(e => [e.key, e.nivel])),
  );

  // =============================================================================================
  // LO QUE ESTA PANTALLA CAMBIA — y por eso queda escrito en la pantalla, no en un aviso que se va.
  // Cada estado de acá abajo tiene su línea o su etiqueta a la vista, con la hora real del momento
  // en que se produjo el cambio.
  // =============================================================================================

  /** Los movimientos del dial y de las excepciones de esta visita, con su hora: es lo que abre «Ver historial». */
  const [historial, setHistorial] = useState<{ hora: string; t: string; s: string }[]>([]);
  /** La auto-recarga: cambia lo que dice la tarjeta de créditos y evita que el motor se detenga. */
  const [autoRecarga, setAutoRecarga] = useState(false);
  /** La hora en que se encendió: es la que se muestra en la línea de la pantalla, no una hora fija. */
  const [autoRecargaDesde, setAutoRecargaDesde] = useState('');
  /** El resultado de la última prueba de cada conexión, con la hora: queda a la vista en la fila. */
  const [pruebas, setPruebas] = useState<Record<string, string>>({});
  /** Conexiones marcadas para reemplazar el token. Reversible desde la misma fila. */
  const [paraReemplazar, setParaReemplazar] = useState<string[]>([]);
  /** Conexiones que el dueño agendó para conectar hoy. Todavía NO están conectadas. */
  const [paraConectar, setParaConectar] = useState<string[]>([]);

  const registrar = (t: string, s: string) => setHistorial(h => [...h, { hora: ahora(), t, s }]);

  const cambiar = (key: string, m: Modo, fijo?: boolean) => {
    const ex = EXCEPCIONES.find(e => e.key === key);
    // La vigilancia es la única sin palanca: en vez de un aviso que se va, explica por qué con su dato real.
    if (fijo) { abrirVigilancia(); return; }
    const antes = niveles[key] ?? ex?.nivel ?? 'auto';
    setNiveles({ ...niveles, [key]: m });
    if (antes !== m) registrar(`«${ex?.etiqueta}» pasa a ${NOMBRE[m]}`, `venía en ${NOMBRE[antes]}`);
    setToast(`"${ex?.etiqueta}" ahora trabaja en modo ${NOMBRE[m]}`);
  };

  const volverACompartido = () => {
    if (modo !== 'shared') registrar('El motor vuelve a Compartido', `venía en ${NOMBRE[modo]}: prepara todo y te pide OK antes de gastar`);
    setModo('shared');
    setToast('Modo Compartido activado: el motor prepara y te pide OK antes de gastar un peso');
  };

  // ---------------------------------------------------------------------------------------------
  // LOS PANELES DE DETALLE — el dato real de cada cosa, en el mismo lugar para todos los botones.
  // ---------------------------------------------------------------------------------------------

  /** «La vigilancia no se puede apagar»: el por qué, con el reloj real de la vigilancia. */
  const abrirVigilancia = () => detalle({
    titulo: 'La vigilancia no se puede apagar',
    sub: 'Es lo único de esta pantalla que no tiene palanca. Y es lo que hace que el motor nunca esté quieto.',
    bloques: [
      { tipo: 'texto', texto: EXCEPCIONES[0].nota },
      { tipo: 'datos', filas: [
        { k: 'Cada cuánto mira', v: INVESTIGACION_MERCADO.cadencia, s: `arrancó ${INVESTIGACION_MERCADO.arranco}, ${INVESTIGACION_MERCADO.desde}` },
        { k: 'Revisiones hechas', v: String(INVESTIGACION_MERCADO.revisiones), s: 'desde que terminaste el onboarding' },
        { k: 'Última revisión', v: INVESTIGACION_MERCADO.ultimaRevision, tono: 'green' },
        { k: 'Dónde mira', v: INVESTIGACION_MERCADO.zona, s: INVESTIGACION_MERCADO.zonaDetalle },
        { k: 'Lo que cuesta', v: 'nada', s: 'no gasta créditos: sólo lee' },
      ] },
      { tipo: 'aviso', texto: 'Si la vigilancia se pudiera apagar, el motor dejaría de enterarse de lo que pasa y el resto de la autonomía trabajaría a ciegas. Todo lo demás sí lo decidís vos.' },
    ],
    fuente: 'Sale del reloj real de la vigilancia de esta cuenta: cuándo arrancó, cada cuánto revisa y cuántas veces revisó.',
    acciones: [
      { label: 'Entendido', variante: 'primary', onClick: () => setToast('La vigilancia sigue activa: es lo que mantiene el motor despierto') },
    ],
  });

  /** «Ver historial»: los movimientos de esta visita, con la hora, y con qué nivel viene trabajando cada acción. */
  const abrirHistorial = () => {
    const propias = EXCEPCIONES.filter(e => (niveles[e.key] ?? e.nivel) !== modo);
    const bloques: Bloque[] = [
      historial.length > 0
        ? { tipo: 'filas', items: historial.slice().reverse().map(h => ({ t: h.t, s: h.s, etiqueta: h.hora, tono: 'purple' as const })) }
        : { tipo: 'texto', texto: 'Todavía no moviste nada en esta visita: el motor viene trabajando como lo dejaste la última vez. En cuanto muevas el dial o una excepción, cada cambio queda acá con la hora.' },
      { tipo: 'datos', filas: [
        { k: 'Modo general hoy', v: NOMBRE[modo], s: 'es el que decide cuando una acción no tiene nivel propio' },
        { k: 'Acciones con nivel propio', v: `${propias.length} de ${EXCEPCIONES.length}`, s: 'no siguen el modo general: tienen su propia palanca' },
        { k: 'Excepciones sin palanca', v: String(EXCEPCIONES.filter(e => e.fijo).length), s: 'la vigilancia: es la que mantiene el motor despierto' },
        { k: 'Frenos que valen siempre', v: String(FRENOS.length), s: 'no dependen del modo: valen también en Automático' },
      ] },
      { tipo: 'filas', items: EXCEPCIONES.map(e => {
        const n = niveles[e.key] ?? e.nivel;
        return { t: e.etiqueta, s: e.nota, etiqueta: NOMBRE[n], tono: (n === 'auto' ? 'green' : n === 'shared' ? 'purple' : 'muted') as 'green' | 'purple' | 'muted' };
      }) },
      { tipo: 'aviso', texto: 'Cambiar de modo no borra nada de lo que el motor ya hizo: la bitácora queda completa. Y la vigilancia no se puede apagar: es lo que hace que el motor nunca esté quieto.' },
    ];
    detalle({
      titulo: 'Historial de autonomía',
      sub: 'Lo que moviste en esta visita, con la hora, y con qué nivel viene trabajando cada tipo de acción.',
      bloques,
      fuente: 'Sale de esta misma pantalla: el dial, las 7 excepciones y los 7 frenos que tenés hoy. Se actualiza en cuanto cambiás algo.',
      acciones: modo === 'shared'
        ? [{ label: 'Cerrar', onClick: () => {} }]
        : [{ label: 'Volver a Compartido', variante: 'primary', onClick: volverACompartido }],
    });
  };

  /** «Conectar mi API»: qué habilita, qué hace el motor mientras tanto, y la deja agendada. */
  const abrirConexion = (c: Conexion) => detalle({
    titulo: `Conectar ${c.nombre}`,
    sub: `${c.rol}. ${c.detalle}`,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Qué habilita', v: c.capacidades.join(' · ') },
        { k: 'De quién es el acceso', v: 'Tuyo', s: 'conectás tu propio proveedor: Sinkroo no te pide la cuenta' },
        { k: 'Qué necesitás', v: 'El acceso de tu proveedor', s: 'una sola vez' },
        { k: 'Mientras no esté', v: 'El motor sigue sin esta capacidad', s: 'nada de lo que ya corre se frena por esto' },
      ] },
      { tipo: 'pasos', items: [
        'Pegás el acceso de tu proveedor.',
        'Se prueba contra su API antes de guardarlo.',
        'Recién ahí la conexión figura como conectada.',
        `El motor empieza a usar: ${c.capacidades.join(', ').toLowerCase()}.`,
      ] },
      { tipo: 'aviso', tono: 'amber', texto: 'Hasta que la prueba dé bien, esta conexión no cuenta como conectada: la pantalla no muestra funcionando nada que todavía no lo esté.' },
    ],
    fuente: `Sale del estado real de ${c.nombre} en esta cuenta, hoy.`,
    acciones: [
      { label: 'Agendarla para conectar hoy', variante: 'primary', onClick: () => {
        setParaConectar(p => (p.includes(c.key) ? p : [...p, c.key]));
        setToast(`${c.nombre} quedó agendada: cuando pegues el acceso lo probamos antes de guardarlo`);
      } },
      { label: 'Ahora no', onClick: () => setToast(`${c.nombre} queda como está: sin conectar`) },
    ],
  });

  /** «Reemplazar»: qué implica cambiar el token, y deja la conexión marcada. */
  const abrirReemplazo = (c: Conexion) => detalle({
    titulo: `Reemplazar el token de ${c.nombre}`,
    sub: 'Cambiar un token no toca nada de lo que ya publicaste: es para cuando rotás el acceso o el proveedor te dio uno nuevo.',
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Conexión', v: c.nombre, s: c.detalle },
        { k: 'Qué usa ahora', v: 'El token actual', s: 'sigue andando hasta que el nuevo pase la prueba' },
        { k: 'Qué habilita', v: c.capacidades.join(' · ') },
        { k: 'Mientras lo cambiás', v: 'No se frena nada', s: 'lo que está corriendo sigue corriendo' },
      ] },
      { tipo: 'pasos', items: [
        'Pegás el token nuevo de tu proveedor.',
        'Se prueba contra su API antes de guardarlo.',
        'Si responde bien, el viejo se descarta y queda el nuevo.',
        'Si no responde, sigue el viejo: una conexión nunca queda a medio cambiar.',
      ] },
      { tipo: 'aviso', tono: 'amber', texto: 'El token viejo se descarta recién cuando el nuevo responde. Si lo pegás mal, la conexión sigue funcionando como hasta ahora.' },
    ],
    fuente: `Sale del estado real de ${c.nombre} en esta cuenta, hoy.`,
    acciones: [
      { label: 'Marcarla para reemplazo', variante: 'primary', onClick: () => {
        setParaReemplazar(p => (p.includes(c.key) ? p : [...p, c.key]));
        setToast(`${c.nombre} quedó marcada: sigue con el token actual hasta que pegues el nuevo`);
      } },
      { label: 'Cancelar', onClick: () => setToast(`${c.nombre} sigue con el token actual: sin cambios`) },
    ],
  });

  const pctCreditos = Math.round((TENANT.creditos / TENANT.creditosMes) * 100);
  const conectadas = CONEXIONES.filter(c => c.estado === 'conectada').length;
  const porConectar = CONEXIONES.filter(c => c.estado !== 'conectada').length;

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Settings size={19} />}
        titulo="Cuenta y autonomía"
        sub="Cuánto decide la IA y cuánto decidís vos. Se puede cambiar cuando quieras, sin perder nada."
        nums={[
          { v: NOMBRE[modo], l: 'modo actual', c: 'var(--purple3)' },
          { v: TENANT.creditos.toLocaleString('es-AR'), l: 'créditos disponibles' },
          { v: String(TENANT.diasAutonomia), l: 'días de autonomía', c: 'var(--amber)' },
          { v: `${conectadas}/${CONEXIONES.length}`, l: 'conexiones activas', c: 'var(--green)' },
        ]}
      />

      {/* ============ EL DIAL ============ */}
      <div className="csec" style={{ marginTop: 0 }}>
        <span className="csec-n">★</span>
        <span className="csec-t">¿Cuánto decide la IA?</span>
        <span className="csec-s">Una decisión tuya. El mismo vidrio del motor, tres comportamientos distintos</span>
      </div>
      <Card>
        <div className="dial-modes">
          {MODOS.map(m => (
            <div key={m.key} className={`dial-mode ${modo === m.key ? 'on' : ''}`}
              onClick={() => {
                if (modo !== m.key) registrar(`El motor pasa a ${m.nombre}`, `venía en ${NOMBRE[modo]}`);
                setModo(m.key);
                setToast(`Modo ${m.nombre}: ${m.desc}`);
              }}>
              <div className="dial-mode-top">
                <span className="dial-radio" />
                <span className="dial-mode-nm">{m.nombre}</span>
                {m.key === 'shared' && <span className="badge badge-purple" style={{ marginLeft: 'auto', fontSize: 9 }}>recomendado</span>}
              </div>
              <div className="dial-mode-ds">{m.desc}</div>
              <code className="dial-vidrio">{m.vidrio}</code>
            </div>
          ))}
        </div>

        <div className="alarm" style={{ marginTop: 15, borderLeft: '3px solid var(--purple2)', background: 'rgba(168,85,247,.05)' }}>
          <div className="alarm-head">
            <span className="alarm-sev oportunidad">CÓMO SE VE EN EL MOTOR</span>
          </div>
          <div className="alarm-sug">
            {modo === 'auto'
              ? <>En <b>Automático</b> el motor no te pregunta nada: hace y te lo cuenta en la bitácora. Vas a ver "hizo 3 acciones mientras no estabas". Lo que igual no puede tocar son los frenos de abajo.</>
              : modo === 'shared'
                ? <>En <b>Compartido</b> el motor prepara todo y se frena esperándote. Vas a ver "3 decisiones esperan tu OK" en la barra del motor, y podés resolverlas sin salir de Tu día.</>
                : <>En <b>Manual</b> el motor sólo sugiere y acumula propuestas. Vos escribís, publicás y respondés. No gasta nada por su cuenta.</>}
          </div>
        </div>

        <div className="row" style={{ gap: 20, marginTop: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <I_Credit size={22} style={{ color: 'var(--amber)' }} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <Gauge pct={pctCreditos} label="Días de autonomía restantes"
              detalle={`${TENANT.creditos.toLocaleString('es-AR')} de ${TENANT.creditosMes.toLocaleString('es-AR')} créditos`} />
            <div className="bs" style={{ marginTop: 8 }}>
              Con el modo actual el motor trabaja <b style={{ color: 'var(--purple3)' }}>{TENANT.diasAutonomia} días más</b> y se detiene el 5 de octubre.
              El modo Automático consume más: bajaría a 8 días.
            </div>
          </div>
          {autoRecarga && <Badge tone="green">auto-recarga activa</Badge>}
          <Button variant={autoRecarga ? 'outline' : 'primary'} className="btn-sm"
            title={autoRecarga
              ? 'Apaga la auto-recarga: el motor vuelve a detenerse cuando se agoten los créditos. Reversible: la podés volver a activar.'
              : 'Paga el próximo paquete solo cuando los créditos bajen de 500, sin que el motor se detenga. Reversible: se apaga cuando quieras.'}
            onClick={() => {
              const nuevo = !autoRecarga;
              setAutoRecarga(nuevo);
              setAutoRecargaDesde(nuevo ? ahora() : '');
              setToast(nuevo
                ? 'Auto-recarga activada: al bajar de 500 créditos se paga el paquete y el motor no se detiene'
                : 'Auto-recarga apagada: volvés a recargar vos cuando quieras');
            }}>
            {autoRecarga ? <><I_Check size={13} /> Apagar auto-recarga</> : <><I_Zap size={13} /> Activar auto-recarga</>}
          </Button>
        </div>

        {autoRecarga && (
          <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12, color: 'var(--green)', fontWeight: 700 }}>
            <I_Check size={13} /> Auto-recarga activa desde las {autoRecargaDesde}: cuando los créditos bajen de 500
            se paga el próximo paquete y el motor <b>no se detiene el 5 de octubre</b>. Se apaga con el mismo botón, sin perder nada del plan.
          </div>
        )}
      </Card>

      {/* ============ EXCEPCIONES Y FRENOS ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Settings size={14} style={{ color: 'var(--purple3)' }} /> Excepciones por tipo de acción</span>}
          action={<Badge tone="purple">{EXCEPCIONES.length}</Badge>}
        >
          <div className="exc">
            {EXCEPCIONES.map(e => (
              <div key={e.key} className="exc-row">
                <div className="exc-top">
                  <span className="exc-lb">{e.etiqueta}</span>
                  {e.fijo && <span className="exc-fijo">no se puede apagar</span>}
                  <div className="seg-group">
                    {(['auto', 'shared', 'manual'] as Modo[]).map(m => (
                      <span key={m} className={`seg ${(niveles[e.key] ?? e.nivel) === m ? 'on' : ''} ${e.fijo && m !== 'auto' ? 'locked' : ''}`}
                        onClick={() => cambiar(e.key, m, e.fijo)}>{NOMBRE[m]}</span>
                    ))}
                  </div>
                </div>
                <div className="exc-nota">{e.nota}</div>
              </div>
            ))}
          </div>
          <div className="acc-why">
            No es una sola palanca: <b>el dinero y los clientes tienen su propio nivel</b>.
            Pausar una campaña que se quema va en Automático aunque todo lo demás te pregunte.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Shield size={14} style={{ color: 'var(--green)' }} /> Frenos</span>}
          action={<Badge tone="green">siempre activos</Badge>}
        >
          <div className="guards">
            {FRENOS.map(f => (
              <div key={f.key} className="guard">
                <I_Lock size={14} style={{ color: 'var(--purple3)', flexShrink: 0 }} />
                <span className="guard-lb">{f.etiqueta}<small>{f.porQue}</small></span>
                <span className="guard-val"><Dinero monto={f.valor} /></span>
              </div>
            ))}
          </div>
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Cortes por freno este mes</span><span className="dato-v">7</span></div>
            <div className="dato"><span className="dato-l">Plata que evitaron</span><span className="dato-v" style={{ color: 'var(--green)' }}><Dinero monto={180} /></span></div>
            <div className="dato"><span className="dato-l">Te pidió permiso</span><span className="dato-v" style={{ color: 'var(--amber)' }}>2 veces</span></div>
          </div>
          <div className="bs" style={{ marginTop: 11 }}>
            Los frenos no son castigos: son lo que te permite dejar el modo Automático prendido sin estar mirando.
            Cada vez que uno se activa, el motor te lo cuenta en la bitácora con el motivo.
          </div>
          <div className="acc-why">
            Aplican <b>incluso en Automático</b>. Si esto se pudiera desactivar, el modo Automático no debería existir:
            un bug que toca presupuestos sin techo cuesta plata real.
          </div>
          <NotaMoneda />
          <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Badge tone="green">La autonomía es un techo, no un piso</Badge>
            <Badge tone="purple">La IA puede pedir más control, nunca tomarlo</Badge>
          </div>
        </Card>
      </div>

      {/* ============ CONEXIONES Y CRÉDITOS ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Link size={14} style={{ color: 'var(--green)' }} /> Conexiones</span>}
          action={<Badge tone={porConectar ? 'amber' : 'green'}>{conectadas} de {CONEXIONES.length}</Badge>}
        >
          <div className="bs" style={{ marginBottom: 12 }}>
            Todo lo externo es tuyo: conectás tu propia API, no la nuestra. Cada conexión declara qué <b>capacidades</b> habilita.
            Las conectadas se pueden probar y sus tokens, reemplazar: cada movimiento queda escrito en la fila.
          </div>
          {CONEXIONES.map(c => {
            const probada = pruebas[c.key];
            const marcadaReemplazo = paraReemplazar.includes(c.key);
            const agendada = paraConectar.includes(c.key);
            return (
            <div key={c.key} style={{ padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="row spread" style={{ marginBottom: 6 }}>
                <span className="row" style={{ gap: 9 }}>
                  <span style={{ fontSize: 17 }}>{c.emoji}</span>
                  <span>
                    <span className="bt">{c.nombre}</span>
                    <span className="tiny muted" style={{ display: 'block' }}>{c.rol}</span>
                  </span>
                </span>
                <span className="row" style={{ gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {probada && <Badge tone="green">probada {probada}</Badge>}
                  {marcadaReemplazo && <Badge tone="amber">token por reemplazar</Badge>}
                  {agendada && <Badge tone="amber">para conectar hoy</Badge>}
                  <Badge tone={c.estado === 'conectada' ? 'green' : c.estado === 'error' ? 'red' : 'muted'}>
                    {c.estado === 'conectada' ? 'conectada' : c.estado === 'error' ? 'vencida' : 'por conectar'}
                  </Badge>
                </span>
              </div>
              <div className="bs">{c.detalle}</div>
              <div className="row" style={{ gap: 7, marginTop: 9, flexWrap: 'wrap' }}>
                {c.capacidades.map(cap => <span key={cap} className="badge badge-muted" style={{ fontSize: 9.5 }}>{cap}</span>)}
              </div>
              <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {c.estado === 'conectada' ? (
                  <>
                    <Button variant="ghost" className="btn-sm"
                      title="Prueba el token contra la API y deja el resultado con la hora en esta fila. No guarda ni cambia el token: reversible, no toca nada de lo que está corriendo."
                      onClick={() => {
                        const h = ahora();
                        setPruebas(p => ({ ...p, [c.key]: h }));
                        setToast(`${c.nombre} respondió bien a las ${h}: el token sigue activo`);
                      }}><I_Check size={13} /> {probada ? 'Probar de nuevo' : 'Probar'}</Button>
                    {marcadaReemplazo ? (
                      <Button variant="ghost" className="btn-sm"
                        title="Deja sin efecto el reemplazo: la conexión sigue con el token actual. Reversible: se puede marcar otra vez."
                        onClick={() => {
                          setParaReemplazar(p => p.filter(k => k !== c.key));
                          setToast(`Se canceló el reemplazo de ${c.nombre}: sigue con el token actual`);
                        }}><I_X size={13} /> Cancelar reemplazo</Button>
                    ) : (
                      <Button variant="ghost" className="btn-sm"
                        title="Te muestra qué implica cambiar el token y deja la conexión marcada para reemplazarlo. Reversible: se cancela desde esta misma fila."
                        onClick={() => abrirReemplazo(c)}>Reemplazar</Button>
                    )}
                  </>
                ) : agendada ? (
                  <Button variant="outline" className="btn-sm"
                    title="La saca de la lista para conectar hoy: vuelve a quedar como estaba, sin conectar. Reversible."
                    onClick={() => {
                      setParaConectar(p => p.filter(k => k !== c.key));
                      setToast(`${c.nombre} vuelve a quedar sin conectar`);
                    }}><I_X size={13} /> Quitar de la lista</Button>
                ) : (
                  <Button className="btn-sm"
                    title="Te muestra qué habilita esta conexión y qué hace el motor mientras tanto, y la deja agendada para conectar hoy. Reversible: se quita de la lista cuando quieras."
                    onClick={() => abrirConexion(c)}><I_Link size={13} /> Conectar mi API</Button>
                )}
              </div>
              {probada && (
                <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, color: 'var(--green)', fontWeight: 700 }}>
                  <I_Check size={13} /> Probada a las {probada}: respondió bien y el token sigue activo. No se guardó nada nuevo ni se frenó nada.
                </div>
              )}
              {marcadaReemplazo && (
                <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, color: 'var(--amber)', fontWeight: 700 }}>
                  <I_Clock size={13} /> Marcada para reemplazar el token: sigue usando el actual hasta que pegues el nuevo y la prueba dé bien. El motor no se frena mientras tanto.
                </div>
              )}
              {agendada && (
                <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, color: 'var(--amber)', fontWeight: 700 }}>
                  <I_Clock size={13} /> Agendada para conectar hoy: cuando pegues el acceso de {c.nombre} se prueba antes de guardarlo. Hasta entonces el motor sigue sin {c.capacidades.join(', ').toLowerCase()}.
                </div>
              )}
            </div>
            );
          })}
          <div className="acc-why">
            Las capacidades son lo que el negocio pide (<b>"enviar mensaje", "leer anuncios"</b>), no un proveedor concreto.
            Si mañana cambiás de herramienta, el motor sigue funcionando sin tocar una línea.
          </div>
        </Card>

        <div className="col">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Credit size={14} style={{ color: 'var(--amber)' }} /> Créditos</span>}
          action={<Badge tone="amber">{TENANT.creditos.toLocaleString('es-AR')} disponibles</Badge>}
        >
          <div style={{ marginBottom: 16 }}>
            <Gauge pct={100 - pctCreditos} label="Consumo del mes" detalle={`${100 - pctCreditos}% usado`} color="var(--grad)" />
          </div>
          <div className="bs" style={{ marginBottom: 6 }}>Qué consume el motor, en claro:</div>
          <BarRow label="Campañas" valor={180} max={180} color="var(--purple2)" />
          <BarRow label="Análisis IA" valor={40} max={180} color="var(--green)" />
          <BarRow label="Conversaciones" valor={0} max={180} color="var(--muted)" />
          <div className="bs" style={{ marginTop: 8 }}>Las conversaciones no consumen créditos: están incluidas en el plan Pro.</div>

          <div className="guards" style={{ marginTop: 16 }}>
            {CREDITOS_MOV.map((m, i) => (
              <div key={i} className="guard">
                <span style={{ color: m.tipo === 'entrada' ? 'var(--green)' : 'var(--muted)', flexShrink: 0 }}>
                  {m.tipo === 'entrada' ? <I_Plus size={14} /> : <I_Clock size={14} />}
                </span>
                <span className="guard-lb">{m.detalle}<small>{m.fecha}</small></span>
                <span className="guard-val" style={{ color: m.tipo === 'entrada' ? 'var(--green)' : 'var(--muted)' }}>
                  {m.cantidad > 0 ? '+' : ''}{m.cantidad}
                </span>
              </div>
            ))}
          </div>
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Se repone</span><span className="dato-v" style={{ color: autoRecarga ? 'var(--green)' : 'var(--amber)' }}>{autoRecarga ? 'automático' : 'manual'}</span></div>
            <div className="dato"><span className="dato-l">Próxima recarga</span><span className="dato-v">{autoRecarga ? 'al bajar de 500' : 'cuando la actives'}</span></div>
            <div className="dato"><span className="dato-l">Consumo por día</span><span className="dato-v">150 créditos</span></div>
          </div>
          {autoRecarga && (
            <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 11, color: 'var(--green)', fontWeight: 700 }}>
              <I_Check size={13} /> Auto-recarga activa: no tenés que acordarte de recargar ni mirar los días de autonomía.
            </div>
          )}
          <div className="acc-why">
            <b>Días de autonomía</b> es la traducción de los créditos a algo que se entiende:
            cuánto puede seguir trabajando el motor si no recargás.
          </div>
        </Card>

        <div className="card" style={{ background: 'linear-gradient(120deg, rgba(168,85,247,.09), transparent)' }}>
          <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
            <I_Sun size={20} style={{ color: 'var(--purple3)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="bt">Podés cambiar el modo en cualquier momento</div>
              <div className="bs" style={{ marginTop: 4 }}>
                Si te cansa aprobar, pasás a Automático. Si algo te asusta, volvés a Compartido.
                <b> Nada de lo que el motor hizo se pierde al cambiar de modo.</b>
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Button variant="outline" className="btn-sm"
              title="Abre lo que moviste en esta visita, con la hora, y con qué nivel viene trabajando cada tipo de acción hoy."
              onClick={abrirHistorial}>Ver historial</Button>
            <Button variant="ghost" className="btn-sm" title="Vuelve al modo recomendado, el que te pide OK antes de gastar. Reversible: podés volver a Automático cuando quieras."
              onClick={volverACompartido}>Volver a Compartido</Button>
          </div>
          {historial.length > 0 && (
            <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12, color: 'var(--purple3)', fontWeight: 700 }}>
              <I_Clock size={13} /> En esta visita moviste {palabraCuenta(historial.length)}: el historial las tiene con la hora y qué nivel tenía antes (la última: {historial[historial.length - 1].hora}).
            </div>
          )}
          <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Badge tone="purple">Cambiar de modo no borra nada</Badge>
            <Badge tone="green">Podés volver cuando quieras</Badge>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
