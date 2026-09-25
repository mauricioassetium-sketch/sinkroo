import { useState } from 'react';
import { Button, Badge } from './ui';
import { EstadoVacio } from './EstadoVacio';
import { I_Vote, I_Sparkle, I_Check, I_Zap, I_Plus } from './icons';
import { useDatos } from '../api/datos';
import { baseApi, token } from '../api/cliente';

// =============================================================================================
// MIROFISH EN SERIO — la ronda real: los 5 jueces y las 500 personas del público.
//
// El back ya sabe hacerlo (POST /api/mirofish/evaluar): puntúa con los cinco jueces, junta las 500
// reacciones del público y deja escrita la predicción con su desvío. Esta pantalla muestra ESO, con los
// votos y las opiniones que existen de verdad, y no la animación de la demostración.
//
// Lo que se cobra y por qué se ve: evaluar cuesta 48 créditos. El botón lo dice antes de que se toque, y
// si el saldo no alcanza el back lo avisa (y acá se lee el motivo).
// =============================================================================================

const CREDITOS_EVALUACION = 48;

export function MiroFishReal({ setToast }: { setToast: (t: string) => void }) {
  const d = useDatos();
  const [texto, setTexto] = useState('');
  const [titulo, setTitulo] = useState('');
  const [formato, setFormato] = useState('imagen');
  const [evaluando, setEvaluando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<any>(null);
  const [escrita, setEscrita] = useState(false);

  const saldo = d.creditos?.saldo ?? d.negocio?.creditos ?? 0;
  const piezaGuardada = d.piezas[0];

  /** Corre la evaluación. Si hay una pieza guardada se evalúa esa; si no, la que se escriba acá. */
  const evaluar = async (cuerpo: { pieza_id?: string; titulo?: string; texto?: string; formato?: string }) => {
    setEvaluando(true); setError(''); setResultado(null);
    try {
      const r = await fetch(baseApi() + '/api/mirofish/evaluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
        body: JSON.stringify(cuerpo),
      });
      const datos = await r.json();
      if (!r.ok) { setError(datos?.detalle || datos?.error || 'no se pudo evaluar'); return; }
      setResultado(datos);
      setToast(`MiroFish evaluó la pieza: ${datos.puntaje} puntos`);
      void d.refrescar();
    } catch (e) {
      setError('no se pudo hablar con el servidor: ' + (e as Error).message);
    } finally {
      setEvaluando(false);
    }
  };

  // ---------------- Sin piezas y nada escrito: decirlo, no inventar ----------------
  if (!piezaGuardada && !escrita && !resultado) {
    return (
      <div className="mf-r">
        <div className="mf-r-head">
          <span className="mf-r-t"><I_Vote size={16} /> MiroFish</span>
          <Badge tone="purple">los 5 jueces y 500 personas del público</Badge>
        </div>
        <EstadoVacio
          titulo="Todavía no hay ninguna pieza para evaluar"
          texto="MiroFish opina sobre una pieza concreta: su texto, su formato y su precio. Arme la primera en Campañas — suba su material y el motor la escribe — o escriba una acá para probar cómo puntúa."
          accion="Escribir una pieza para probar"
          onAccion={() => setEscrita(true)}
        />
      </div>
    );
  }

  return (
    <div className="mf-r">
      {/* ---- Qué se va a evaluar ---- */}
      <div className="mf-r-head">
        <span className="mf-r-t"><I_Vote size={16} /> MiroFish</span>
        <span className="mf-r-saldo">{saldo.toLocaleString('es-CO')} créditos · esta ronda cuesta {CREDITOS_EVALUACION}</span>
      </div>

      {escrita && !resultado && (
        <div className="mf-r-form">
          <div className="mf-r-campo">
            <label className="label">Título de la pieza</label>
            <input className="input" value={titulo} placeholder="Cómo se llama la pieza"
              onChange={e => setTitulo(e.target.value)} />
          </div>
          <div className="mf-r-campo">
            <label className="label">El texto que va a llevar</label>
            <div className="onb-ayuda">Escriba lo que diría la pieza: el gancho, qué ofrece y qué tiene que hacer el cliente. Con dos o tres líneas alcanza.</div>
            <textarea className="input" rows={4} value={texto} placeholder="Escriba aquí, con sus palabras"
              onChange={e => setTexto(e.target.value)} />
          </div>
          <div className="mf-r-campo">
            <label className="label">Formato</label>
            <div className="onb-chips">
              {['imagen', 'video', 'carrusel', 'historia'].map(f => (
                <button key={f} type="button" className={`tipo-chip ${formato === f ? 'sel' : ''}`}
                  title={`${f}: así lo va a puntuar el público`} onClick={() => setFormato(f)}>
                  {formato === f ? '✓ ' : ''}{f}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---- El botón: dice lo que cuesta antes de tocarlo ---- */}
      {!resultado && (
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          {escrita ? (
            <Button className="btn-sm" disabled={evaluando || texto.trim().length < 20}
              title={`Los 5 jueces puntúan y las 500 personas del público reaccionan. Cuesta ${CREDITOS_EVALUACION} créditos y queda en su libro.`}
              onClick={() => evaluar({ titulo: titulo.trim() || 'Pieza de prueba', texto: texto.trim(), formato })}>
              <I_Sparkle size={13} /> {evaluando ? 'El público está reaccionando…' : 'Evaluar con MiroFish'}
            </Button>
          ) : (
            <Button className="btn-sm" disabled={evaluando}
              title={`Se evalúa «${piezaGuardada?.titulo}». Los 5 jueces puntúan y 500 personas del público reaccionan: cuesta ${CREDITOS_EVALUACION} créditos.`}
              onClick={() => evaluar({ pieza_id: piezaGuardada.id })}>
              <I_Sparkle size={13} /> {evaluando ? 'El público está reaccionando…' : `Evaluar «${(piezaGuardada?.titulo || '').slice(0, 38)}»`}
            </Button>
          )}
          {escrita && (
            <Button variant="ghost" className="btn-sm" title="Vuelve a la pieza guardada, sin evaluar nada"
              onClick={() => { setEscrita(false); setTexto(''); setTitulo(''); }}>Usar la pieza guardada</Button>
          )}
        </div>
      )}

      {error && <div className="mf-r-error">{error}</div>}

      {/* ---- El resultado: los votos que existen de verdad ---- */}
      {resultado && (
        <div className="mf-r-res">
          <div className="mf-r-puntaje">
            <span className="mf-r-puntaje-n">{resultado.puntaje}</span>
            <span className="mf-r-puntaje-l">de 100 · puesto <b>{resultado.orden}</b> del lote</span>
          </div>

          <div className="mf-r-jueces">
            {resultado.jueces.map((j: any) => (
              <div key={j.juez} className="mf-r-juez">
                <span className="mf-r-juez-n">{j.juez}</span>
                <span className="mf-r-juez-barra"><span style={{ width: j.voto + '%' }} /></span>
                <span className="mf-r-juez-v">{j.voto}</span>
                <span className="mf-r-juez-o">{j.opinion}</span>
              </div>
            ))}
          </div>

          <div className="mf-r-publico">
            <div className="mf-r-publico-t">
              <I_Check size={13} /> {resultado.publico.total} personas del público reaccionaron
            </div>
            <div className="mf-r-reacciones">
              {Object.entries(resultado.reacciones as Record<string, number>).map(([k, n]) => (
                <span key={k} className={`mf-r-reaccion ${k}`}>{n} {k}</span>
              ))}
            </div>
            {resultado.publico.muestra?.length > 0 && (
              <div className="mf-r-dichos">
                {resultado.publico.muestra.slice(0, 6).map((m: any, i: number) => (
                  <div key={i} className="mf-r-dicho">“{m.comentario}” <small>agente {m.agente}</small></div>
                ))}
              </div>
            )}
          </div>

          <div className="mf-r-pred">
            <span className="mf-r-pred-t"><I_Zap size={13} /> Lo que el modelo había predicho</span>
            <span className="mf-r-pred-d">
              Predijo <b>{resultado.prediccion.predicho}</b> · pasó <b>{resultado.prediccion.observado}</b> ·
              desvío <b>{resultado.prediccion.desvio_pct > 0 ? '+' : ''}{resultado.prediccion.desvio_pct}%</b>
            </span>
            <span className="mf-r-pred-s">Con ese desvío el modelo corrige la próxima estimación. Cuesta {resultado.creditos} créditos.</span>
          </div>

          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <Button variant="outline" className="btn-sm" title="Evalúa otra vez para ver si el resultado se mantiene"
              onClick={() => setResultado(null)}><I_Plus size={13} /> Otra pieza</Button>
          </div>
        </div>
      )}
    </div>
  );
}
