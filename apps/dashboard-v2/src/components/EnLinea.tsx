import { Card, Badge, Button } from './ui';
import { BarRow } from './viz';
import { I_Play, I_Eye, I_Trend, I_Check, I_Refresh, I_Credit, I_Megaphone, I_Film, I_Image, I_File } from './icons';
import { useDetalle } from './Detalle';
import { PASOS_CAMPANA, type PasoCampana } from './CampanaPasos';
import { useDatos, type Campana } from '../api/datos';
import { EstadoVacio } from './EstadoVacio';

// =============================================================================================
// EN LÍNEA — el final del flujo: lo que se publicó y cómo está rindiendo AHORA.
//
// DE DÓNDE SALE CADA COSA: del back, siempre. Lo único medido de verdad son sus campañas: su
// estado, su gasto y su ROAS (`d.campanas`). El alcance, los clics y las ventas todavía no llegan
// del back, así que se muestran en «—» con la línea que dice cuándo llegan: escribir un número que
// nadie midió sería mentir sobre lo que hay.
//
// SIN NADA PUBLICADO la pantalla no muestra ninguna cifra: muestra el estado vacío, que dice qué
// va a ver acá y cuál es el paso que falta. Sin back (modo demostración) tampoco hay campañas, así
// que la pantalla es la misma: el mismo estado vacío, sin números de ejemplo.
//
// Cada botón de aquí hace algo QUE SE VE, y siempre una de estas dos cosas:
//   (a) abre el PANEL DE DETALLE (Detalle.tsx) con los números de esa campaña o el informe completo;
//   (b) cambia el estado en la pantalla misma: la fila se queda con el número congelado y su badge,
//       aparece la línea de por qué se frenó y el botón pasa a «reanudar».
// Ninguno avisa y se olvida: un aviso que se va solo no es una acción.
// =============================================================================================

/** Un decimal con coma: los números de esta pantalla se leen en castellano, no en un tablero en inglés. */
const conComa = (v: number | string) => Number(v).toFixed(1).replace('.', ',');

// ---------------------------------------------------------------------------------------------
// LO QUE SE LEE DE UNA CAMPAÑA DEL BACK — con las mismas palabras en toda la pantalla.
// ---------------------------------------------------------------------------------------------

/** El ROAS de una campaña como se lee: 4.2 → «4,2x». Sin dato medido, «—» (nunca un número escrito a mano). */
const roasDe = (c: Campana) => (typeof c.roas === 'number' && c.roas > 0 ? `${conComa(c.roas)}x` : '—');
/** El número detrás del ROAS, para ordenar y para medir contra la barra más alta. */
const roasN = (c: Campana) => (typeof c.roas === 'number' && c.roas > 0 ? c.roas : 0);
/** El gasto de la campaña, sin decimales: es dinero, se lee entero. */
const gastoDe = (c: Campana) => Math.round(Number(c.gasto) || 0);
/**
 * ¿Esta campaña ya salió a las redes? El back escribe «borrador» mientras la campaña está armada y
 * no publicada: eso no es «en línea», así que no entra en lo publicado que esta pantalla revisa.
 */
const yaPublicada = (c: Campana) => !(c.estado || '').trim().toLowerCase().startsWith('borrador');
/** El estado del back, en palabras de esta pantalla. */
const estadoLegible = (c: Campana): string => {
  const e = (c.estado || '').toLowerCase();
  if (e.startsWith('activ')) return 'publicada';
  if (e.includes('pausa')) return 'en pausa';
  if (e.includes('final') || e.includes('termin')) return 'terminada';
  return 'en borrador';
};
/** La fecha en que se armó, en corto. */
const creadaEl = (iso: string) => {
  const f = new Date(iso);
  return isNaN(f.getTime()) ? '' : f.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
};
/** El ícono de la pieza, leído de la forma de la campaña: el mismo vocabulario de la galería. */
const iconoDeForma = (forma: string) =>
  /video|reel|historia/i.test(forma || '') ? <I_Film size={16} />
    : /carrusel/i.test(forma || '') ? <I_File size={16} />
      : <I_Image size={16} />;

// =============================================================================================
// LA PANTALLA — sus campañas reales, y en «—» lo que la plataforma todavía no reportó.
// Sin campañas publicadas no hay nada que monitorear, así que no se afirma nada: va el estado vacío.
// =============================================================================================
export function EnLinea({ setToast, ir }: { setToast: (t: string) => void; ir?: (p: PasoCampana) => void }) {
  const detalle = useDetalle();
  const d = useDatos();
  const todas = d.campanas;
  const publicadas = todas.filter(yaPublicada);
  const conRetorno = publicadas.filter(c => roasN(c) > 0);
  const gastoTotal = todas.reduce((a, c) => a + gastoDe(c), 0);
  const maxRoas = Math.max(...conRetorno.map(roasN), 0);
  // El ROAS de lo publicado, ponderado por lo gastado: no es un promedio de la industria, es la
  // suma de lo que devolvieron sus campañas sobre la suma de lo que gastaron. Sin retorno medido, «—».
  const retornoTotal = conRetorno.reduce((a, c) => a + gastoDe(c) * roasN(c), 0);
  const gastoConRetorno = conRetorno.reduce((a, c) => a + gastoDe(c), 0);
  const roasCombinado = !conRetorno.length
    ? '—'
    : gastoConRetorno > 0
      ? `${conComa(retornoTotal / gastoConRetorno)}x`
      : `${conComa(conRetorno.reduce((a, c) => a + roasN(c), 0) / conRetorno.length)}x`;

  const irAlPaso1 = () => {
    if (ir) { ir(1); setToast('Su campaña nueva arranca en el paso 1'); }
    else setToast('Abra Campañas para armar una campaña nueva');
  };

  // (a) El detalle de UNA campaña: lo que el back manda de ella, sin rellenar ningún hueco.
  const detalleDe = (c: Campana) => detalle({
    titulo: `«${c.nombre}»`,
    sub: `Esto es lo que hay cargado de esta campaña, tal como está en su cuenta. Lo que la plataforma todavía no reporta aparece en «—».`,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Estado', v: estadoLegible(c), tono: c.estado.toLowerCase().startsWith('activ') ? 'green' : c.estado.toLowerCase().includes('pausa') ? 'amber' : 'muted' },
        { k: 'Lo que gastó', v: `$${gastoDe(c).toLocaleString('es-CO')}`, s: 'lo invertido en esta campaña hasta hoy' },
        { k: 'Lo que devuelve', v: roasDe(c), s: roasDe(c) === '—' ? 'la plataforma todavía no reportó su retorno' : 'por cada peso invertido', tono: roasDe(c) === '—' ? 'muted' : 'green' },
        { k: 'Forma', v: c.forma || 'sin definir', s: c.forma ? 'cómo está armada la campaña' : 'todavía no está definida' },
        { k: 'Dónde sale', v: (c.destinos || []).join(' + ') || 'sin destinos cargados', s: 'las redes y canales de esta campaña' },
        { k: 'Piezas', v: c.piezas ? `${c.piezas}` : 'sin piezas todavía', s: c.piezas ? 'las que tiene cargadas' : 'todavía no tiene una pieza creada' },
        { k: 'Objetivo', v: c.objetivo || 'sin objetivo escrito', s: c.objetivo ? 'para qué se está gastando' : 'falta escribirlo' },
        { k: 'Armada el', v: creadaEl(c.created_at) || 'sin fecha' },
      ] },
      { tipo: 'texto', texto: 'Mientras esta campaña no reporte retorno, su etiqueta queda en «—»: el panel no llena ese hueco con un promedio del rubro ni con un número de ejemplo.' },
    ],
    fuente: 'Sale de su campaña en el servidor: el estado, el gasto y el ROAS son los que hay guardados. El alcance, los clics y las ventas todavía no llegan del back.',
    acciones: [
      { label: 'Cerrar', onClick: () => {} },
    ],
  });

  // (a) El informe completo: todas sus campañas publicadas, una por una.
  const informe = () => detalle({
    titulo: `El informe de sus ${publicadas.length} campaña${publicadas.length === 1 ? '' : 's'} publicada${publicadas.length === 1 ? '' : 's'}`,
    sub: 'Campaña por campaña: lo que gastó y lo que devuelve hasta hoy. Las cifras que la plataforma todavía no reporta van en «—», no se escriben a mano.',
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Campañas publicadas', v: `${publicadas.length} de ${todas.length}`, s: todas.length > publicadas.length ? `${todas.length - publicadas.length} siguen en borrador` : 'todas las que hay están publicadas' },
        { k: 'Lo invertido hasta hoy', v: `$${gastoTotal.toLocaleString('es-CO')}`, s: 'lo que suman todas sus campañas' },
        { k: 'ROAS de lo publicado', v: roasCombinado, tono: roasCombinado === '—' ? 'muted' : 'green', s: conRetorno.length ? `ponderado por lo gastado: ${conRetorno.length} de ${publicadas.length} campañas ya reportan retorno` : 'todavía ninguna campaña reporta retorno' },
        { k: 'Personas alcanzadas', v: '—', s: 'llega cuando la plataforma la reporte' },
        { k: 'Clics al sitio', v: '—', s: 'llega cuando la plataforma los reporte' },
        { k: 'Ventas atribuidas', v: '—', s: 'llega cuando la plataforma las reporte' },
      ] },
      { tipo: 'filas', items: publicadas.map(c => ({
        t: c.nombre,
        s: `${c.forma || 'sin forma definida'} · ${(c.destinos || []).join(' + ') || 'sin destinos'} · $${gastoDe(c).toLocaleString('es-CO')} de gasto · ${c.piezas || 0} pieza${c.piezas === 1 ? '' : 's'}`,
        etiqueta: roasDe(c),
        tono: roasDe(c) === '—' ? 'muted' as const : 'green' as const,
      })) },
      { tipo: 'texto', texto: 'El alcance, los clics y las ventas no están hoy en su cuenta: en cuanto la plataforma los reporte, entran a esta misma pantalla y a este informe.' },
    ],
    fuente: 'Sale de sus campañas en el servidor: el gasto y el ROAS son los que reporta la plataforma. Todo lo demás queda en «—» mientras no llegue.',
    acciones: [
      { label: 'Cerrar', onClick: () => {} },
    ],
  });

  // (a) Campaña nueva: qué va a hacer el motor antes de arrancar, con sus números reales, y recién
  // ahí el paso 1 del flujo. Con los números que hay de verdad, sin costo ni carpetas de ejemplo.
  const campanaNueva = () => detalle({
    titulo: 'Campaña nueva: cómo arranca',
    sub: 'Le deja al principio del flujo. El camino corto: dice qué quiere, Sinkroo crea y MiroFish vota antes de que se gaste un peso.',
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Dónde arranca', v: `Paso 1 · ${PASOS_CAMPANA[0].t}`, s: PASOS_CAMPANA[0].d },
        { k: 'Sus piezas cargadas', v: String(d.piezas.length), s: d.piezas.length ? 'las que ya están en su cuenta, listas para sumar' : 'todavía no tiene piezas cargadas: el flujo las crea' },
        { k: 'Sus campañas hoy', v: `${todas.length}`, s: `${publicadas.length} publicada${publicadas.length === 1 ? '' : 's'} y ${todas.length - publicadas.length} en borrador` },
        { k: 'Créditos disponibles', v: (d.creditos?.saldo ?? d.negocio?.creditos ?? 0).toLocaleString('es-CO'), s: 'lo que le queda para que el motor trabaje' },
        { k: 'Quién la juzga', v: '5 jueces + 500 del público', s: 'arriba de 80 se publica; abajo, vuelve con la objeción' },
      ] },
      { tipo: 'pasos', items: PASOS_CAMPANA.map(p => `${p.t}: ${p.d}`) },
      { tipo: 'texto', texto: `Las ${publicadas.length} campaña${publicadas.length === 1 ? '' : 's'} que ya están publicadas siguen corriendo tal como están: la campaña nueva es otra cosa y no las toca.` },
      { tipo: 'aviso', tono: 'green', texto: 'Nada se publica ni se gasta hasta que usted lo confirme.' },
    ],
    fuente: 'Sale de su cuenta: las piezas, las campañas y los créditos son los que hay guardados en el servidor hoy.',
    acciones: [
      { label: 'Empezar de cero (paso 1)', variante: 'primary' as const, onClick: irAlPaso1 },
      { label: 'Cerrar', onClick: () => {} },
    ],
  });

  // MIENTRAS LEE: no se afirma nada. Recién cuando el back contesta se dice qué hay.
  if (d.cargando && todas.length === 0) {
    return (
      <Card>
        <EstadoVacio icono={<I_Megaphone size={22} />}
          titulo="Leyendo sus campañas del servidor…"
          texto="El panel está leyendo lo que tiene publicado en el servidor. Mientras lee no muestra ningún número: en un momento dice qué hay." />
      </Card>
    );
  }

  // SIN NADA PUBLICADO: el estado vacío honesto, con la invitación a armar la primera campaña.
  // Aquí NO aparece el aviso de que el motor revisa cada 15 minutos: no hay nada que revisar.
  if (publicadas.length === 0) {
    return (
      <div className="dash">
        <Card>
          <EstadoVacio icono={<I_Megaphone size={22} />}
            titulo={todas.length ? 'Todavía no hay nada publicado' : 'Su cuenta todavía no tiene campañas'}
            texto={todas.length
              ? `Tiene ${todas.length} campaña${todas.length === 1 ? '' : 's'} en borrador: mientras no las publique, acá no hay nada que revisar. Cuando salgan, esta pantalla muestra cómo rinde cada pieza, lo que gasta cada campaña y lo que devuelve.`
              : 'Cuando publique, acá se ve cómo rinde cada pieza: el sistema revisa cada 15 minutos y pausa la que no devuelve. Todavía no hay ninguna publicada, así que el paso que falta es armar la primera.'}
            accion={ir ? 'Armar mi primera campaña' : undefined}
            onAccion={ir ? irAlPaso1 : undefined} />
        </Card>

        <div className="duo" style={{ marginTop: 16 }}>
          <Card
            title={<span className="row" style={{ gap: 8 }}><I_Trend size={14} style={{ color: 'var(--green)' }} /> Qué va a ver acá</span>}
            action={<Badge tone="muted">sin cifras todavía</Badge>}
          >
            <div className="guards">
              <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Eye size={14} /></span>
                <span className="guard-lb">Personas alcanzadas y clics al sitio<small>lo que la plataforma reporte de cada pieza publicada</small></span>
                <span className="guard-val" style={{ color: 'var(--muted)' }}>—</span></div>
              <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Credit size={14} /></span>
                <span className="guard-lb">Ventas desde que salieron<small>las que el motor pueda atar a cada campaña</small></span>
                <span className="guard-val" style={{ color: 'var(--muted)' }}>—</span></div>
              <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Trend size={14} /></span>
                <span className="guard-lb">Retorno por peso invertido<small>el ROAS de cada campaña, contra el gasto que lleva</small></span>
                <span className="guard-val" style={{ color: 'var(--muted)' }}>—</span></div>
            </div>
            <div className="acc-why">
              Estas cifras no están escritas en el panel: <b>llegan del back y de la plataforma</b>. Mientras una
              no llegue, se queda en «—» con su explicación; nunca se rellena con un número de ejemplo.
            </div>
          </Card>

          <CicloSigue onClick={campanaNueva} />
        </div>
      </div>
    );
  }

  return (
    <div className="dash">
      <Card className="live-head">
        <div className="row spread" style={{ gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="row" style={{ gap: 11, flex: 1, minWidth: 240 }}>
            <span className="dot-live" />
            <div style={{ minWidth: 0 }}>
              <div className="bt">Monitoreo directo, en vivo</div>
              <div className="bs">
                {`Tiene ${publicadas.length} campaña${publicadas.length === 1 ? '' : 's'} publicada${publicadas.length === 1 ? '' : 's'} en sus redes.`}{' '}
                <b>El motor las mira cada 15 minutos</b> y le avisa si alguna se enfría o si conviene moverle presupuesto.
              </div>
            </div>
          </div>
          <Badge tone="green">{publicadas.length} publicada{publicadas.length === 1 ? '' : 's'}</Badge>
        </div>
      </Card>

      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Trend size={14} style={{ color: 'var(--green)' }} /> Cómo va todo junto</span>}
          action={<Badge tone={conRetorno.length ? 'green' : 'muted'}>{conRetorno.length ? 'con retorno medido' : 'sin retorno todavía'}</Badge>}
        >
          <div className="live-nums">
            <div className="live-n">
              <span className="live-v" style={{ color: 'var(--muted)' }}>—</span>
              <span className="live-l">personas alcanzadas</span>
            </div>
            <div className="live-n">
              <span className="live-v" style={{ color: 'var(--muted)' }}>—</span>
              <span className="live-l">clics al sitio</span>
            </div>
            <div className="live-n">
              <span className="live-v" style={{ color: 'var(--muted)' }}>—</span>
              <span className="live-l">ventas desde que salieron</span>
            </div>
            <div className="live-n">
              <span className="live-v">{roasCombinado}</span>
              <span className="live-l">ROAS de lo publicado{gastoConRetorno > 0 ? ' (ponderado por lo gastado)' : ''}</span>
            </div>
          </div>
          <div className="tiny" style={{ marginTop: 6, color: 'var(--amber)', fontWeight: 700 }}>
            El alcance, los clics y las ventas llegan cuando la plataforma los reporte: esa cifra todavía no
            está en su cuenta y el panel no la escribe a mano.
          </div>
          <div>
            <div className="bs" style={{ marginBottom: 8, marginTop: 14 }}>Cuánto devuelve cada campaña publicada:</div>
            {conRetorno.length === 0 ? (
              <div className="bs">
                Todavía ninguna campaña publicada reporta retorno: la plataforma no ha medido lo que devolvieron.
                Cuando lo mida, cada barra aparece acá.
              </div>
            ) : (
              [...conRetorno].sort((a, b) => roasN(b) - roasN(a)).map(c => (
                <BarRow key={c.id} label={c.nombre} valor={roasN(c)} max={maxRoas} formato={roasDe(c)} color="var(--green)" />
              ))
            )}
          </div>
          <div className="acc-why">
            <b>Monitoreo directo quiere decir esto:</b> no es un informe de ayer, es lo que está pasando
            mientras mira. Si un número se cae, el motor actúa o le avisa.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Check size={14} style={{ color: 'var(--green)' }} /> Lo que está publicado</span>}
          action={<Badge tone="purple">{publicadas.length} campaña{publicadas.length === 1 ? '' : 's'}</Badge>}
        >
          {publicadas.map(c => (
            <div key={c.id} className="pub">
              <span className="pub-mini"
                style={{ background: 'linear-gradient(150deg, #4A7C59, #4A7C5922 70%, var(--bg3))' }}
                title={`${c.forma || 'campaña'} · ${(c.destinos || []).join(' + ') || 'sin destinos'}`}>
                <span className="pub-mini-ico">{iconoDeForma(c.forma)}</span>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="rank-t">{c.nombre}</span>
                <span className="rank-m">
                  {c.forma || 'sin forma definida'} · {(c.destinos || []).join(' + ') || 'sin destinos'} · {estadoLegible(c)}
                </span>
                <span className="pub-nums">
                  <span>${gastoDe(c).toLocaleString('es-CO')} de gasto</span>
                  <span>{c.piezas || 0} pieza{c.piezas === 1 ? '' : 's'}</span>
                  <span style={{ color: roasDe(c) === '—' ? 'var(--muted)' : 'var(--green)', fontWeight: 800 }}>{roasDe(c)}</span>
                </span>
              </span>
              <span className="row" style={{ gap: 6, flexShrink: 0 }}>
                <Button variant="ghost" className="btn-sm"
                  title={`Abre «${c.nombre}»: su estado, lo que gastó, lo que devuelve y sus destinos. No cambia nada de la campaña.`}
                  onClick={() => detalleDe(c)}><I_Eye size={12} /></Button>
              </span>
            </div>
          ))}
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button variant="ghost" className="btn-sm"
              title="Abre el informe de lo publicado: campaña por campaña, lo que gastó y lo que devuelve, y qué cifras todavía no llegan de la plataforma"
              onClick={informe}>Ver el informe completo</Button>
          </div>
          {todas.length > publicadas.length && (
            <div className="tiny" style={{ marginTop: 10, color: 'var(--muted2)', fontWeight: 700 }}>
              Además tiene {todas.length - publicadas.length} campaña{todas.length - publicadas.length === 1 ? '' : 's'} en
              borrador: no cuentan acá hasta que las publique.
            </div>
          )}
          <div className="acc-why">
            Esta lista es lo que hay publicado en su cuenta, <b>tal como está en el servidor</b>: el estado, el
            gasto y el ROAS de cada campaña. Lo que todavía no llegó se queda en «—».
          </div>
        </Card>
      </div>

      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Credit size={14} style={{ color: 'var(--amber)' }} /> Lo que el motor está cuidando solo</span>}
          action={<Badge tone="muted">sin movimientos que reportar</Badge>}
        >
          <EstadoVacio
            titulo="Todavía no hay nada que reportar"
            texto="Acá van a aparecer los movimientos que el motor haga solo sobre lo publicado: lo que ajustó, lo que frenó y lo que le avisó antes de gastar. Su cuenta todavía no tiene ninguno."
          />
          <div className="acc-why">
            Esto es lo que el motor hace <b>mientras no mira</b>. Cuando haga algo por su cuenta, queda acá con
            su hora y el número que tenía antes.
          </div>
        </Card>

        <CicloSigue onClick={campanaNueva} />
      </div>
    </div>
  );
}

/** El ciclo que no se corta: es cómo trabaja el motor, y se explica igual en toda la pantalla. */
function CicloSigue({ onClick }: { onClick: () => void }) {
  return (
    <Card
      title={<span className="row" style={{ gap: 8 }}><I_Refresh size={14} style={{ color: 'var(--purple3)' }} /> ¿Y después?</span>}
      action={<Badge tone="purple">el ciclo sigue</Badge>}
    >
      <div className="bs">
        Cuando una pieza se enfría, el ciclo arranca de nuevo <b>sin que haga nada</b>:
        vuelve a MiroFish, se crean opciones nuevas y salen las mejores.
      </div>
      <div className="guards">
        <div className="guard"><span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Play size={14} /></span>
          <span className="guard-lb">Revisa lo que está rindiendo<small>Cuál de sus piezas trae la gente más barata</small></span></div>
        <div className="guard"><span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Refresh size={14} /></span>
          <span className="guard-lb">Crea variantes de la que gana<small>Con el mismo ángulo y los colores que ya funcionaron</small></span></div>
        <div className="guard"><span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Eye size={14} /></span>
          <span className="guard-lb">Reemplaza la que se enfría<small>No se apaga nada hasta que la nueva rinde igual o mejor</small></span></div>
      </div>
      <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
        <Button variant="ghost" className="btn-sm"
          title="Le muestra con qué arranca una campaña nueva en su cuenta (sus piezas, sus campañas y sus créditos) y desde ahí le lleva al paso 1 del flujo. Nada se publica ni se gasta hasta que lo confirme."
          onClick={onClick}>Crear una campaña nueva</Button>
      </div>
      <div className="acc-why">
        El ciclo <b>no se corta</b>: lo que se publica alimenta lo que se crea después.
        Cuanto más corre, mejor elige.
      </div>
    </Card>
  );
}
