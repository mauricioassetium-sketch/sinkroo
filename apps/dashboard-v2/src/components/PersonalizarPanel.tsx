import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Button } from './ui';
import { I_Palette, I_Image, I_Upload, I_Trash, I_Check, I_X, I_Eye, SinkrooMark } from './icons';
import {
  usePerfil, leerLogo, semaforoQueChoca, brilloDe, tieneMarca, paletaEfectiva, gradienteMarca,
  textoDeGradiente, PALETAS, PALETA_SINKROO, COLORES_MARCA, type Perfil,
} from '../lib/perfil';

// =============================================================================================
// «HACÉ TUYO ESTE PANEL» — el pop-up de la personalización: el logo del cliente y sus colores.
//
// Vive aparte del modal del perfil (que quedó siendo los datos de la cuenta: nombre, email,
// WhatsApp, zona y moneda). Este panel se abre desde la barra de arriba y desde el bloque de
// usuario del menú lateral.
//
// LO QUE LO HACE DISTINTO: es un panel lateral, no una pantalla que tapa todo. Cada cosa que el
// cliente toca acá se aplica YA MISMO en el dashboard de verdad, el de atrás: cambia un color y
// ve el panel entero repintarse sin cerrar nada. Eso es lo que lo vuelve algo para jugar.
//
// REGLA QUE NO SE ROMPE: los semáforos (verde de aprobado, ámbar de revisar, rojo de crítico y
// gris de neutro) no se pintan con la paleta del cliente. Si su color se parece a un semáforo, se
// lo avisamos en una línea, pero el semáforo manda igual.
// =============================================================================================

/** Lo único que se edita acá: el logo y los dos colores de la marca. */
type Marca = Pick<Perfil, 'logo' | 'col1' | 'col2'>;

const marcaDe = (p: Perfil): Marca => ({ logo: p.logo, col1: p.col1, col2: p.col2 });

export function PersonalizarPanel({ abierto, senal = 0, cerrar, avisar }: {
  abierto: boolean; senal?: number; cerrar: () => void; avisar?: (t: string) => void;
}) {
  const { perfil, guardar, previsualizar, terminarPrevia } = usePerfil();
  const [borrador, setBorrador] = useState<Marca>(() => marcaDe(perfil));
  const [guardado, setGuardado] = useState(false);
  const [sinEspacio, setSinEspacio] = useState(false);
  const [errorLogo, setErrorLogo] = useState('');
  const [arrastrando, setArrastrando] = useState(false);
  // «Ver el panel completo»: esconde el panel un momento para mirar el dashboard entero, pero
  // NO pierde nada: el borrador y la vista previa siguen vivos hasta que guardes o descartes.
  const [mirando, setMirando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  // Cada vez que se abre, se parte de lo que hay guardado.
  const [abiertoAntes, setAbiertoAntes] = useState(false);
  if (abierto && !abiertoAntes) {
    setAbiertoAntes(true); setBorrador(marcaDe(perfil)); setGuardado(false);
    setSinEspacio(false); setErrorLogo(''); setMirando(false); setArrastrando(false);
  }
  if (!abierto && abiertoAntes) setAbiertoAntes(false);

  // Volver a tocar cualquiera de las dos puertas (la barra de arriba o tu nombre en el menú)
  // trae el panel de vuelta aunque lo hayas corrido con «Ver el panel completo», sin perder nada.
  const [senalAntes, setSenalAntes] = useState(senal);
  if (senal !== senalAntes) { setSenalAntes(senal); setMirando(false); }

  // AL INSTANTE: mientras el panel está abierto, el dashboard real (el de atrás) se pinta con lo
  // que estás tocando. Si cerrás sin guardar, todo vuelve a tu logo y tus colores de antes.
  useEffect(() => { if (abierto) previsualizar({ ...perfil, ...borrador }); }, [borrador, abierto]);
  useEffect(() => { if (!abierto) terminarPrevia(); }, [abierto]);

  if (!abierto) return null;

  const set = (k: keyof Marca, v: string) => { setBorrador(p => ({ ...p, [k]: v })); setGuardado(false); };
  const hayCambios = borrador.logo !== perfil.logo || borrador.col1 !== perfil.col1 || borrador.col2 !== perfil.col2;
  const marcaPropia = tieneMarca({ ...perfil, ...borrador });
  const paleta = paletaEfectiva({ ...perfil, ...borrador });
  const choque = semaforoQueChoca(borrador.col1) || semaforoQueChoca(borrador.col2);
  // Una sola regla para el degradado de la muestra y el del panel de verdad: lo que se ve acá es
  // exactamente lo que queda en los botones.
  const grad = marcaPropia ? gradienteMarca(paleta.col1, paleta.col2)
    : gradienteMarca(PALETA_SINKROO.col1, PALETA_SINKROO.col2);
  const sobreGrad = marcaPropia ? textoDeGradiente(paleta.col1, paleta.col2) : '#ffffff';

  const subirLogo = (archivo?: File) => {
    if (!archivo) return;
    setErrorLogo('');
    leerLogo(archivo)
      .then(datos => { set('logo', datos); avisar?.('Logo cargado: ya se ve en tu barra de arriba y en el saludo del día'); })
      .catch((e: Error) => setErrorLogo(e.message || 'No pudimos leer la imagen.'));
  };

  const soltar = (e: DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    subirLogo(e.dataTransfer?.files?.[0]);
  };

  const salvar = () => {
    const ok = guardar({ ...perfil, ...borrador });
    if (!ok) { setSinEspacio(true); return; }
    setGuardado(true);
    avisar?.('Listo: tu logo y tus colores quedaron guardados en tu cuenta');
    cerrar();
  };

  const descartar = () => {
    setBorrador(marcaDe(perfil));
    setErrorLogo('');
    setGuardado(false);
    terminarPrevia();
    cerrar();
  };

  // ---------- «Ver el panel completo»: el panel se corre a un costado, los cambios quedan ----------
  if (mirando) {
    return (
      <button className="pers-flotante" type="button"
        title="Volvé a la personalización. Tus cambios siguen ahí, tal como los dejaste, sin guardar todavía."
        onClick={() => setMirando(false)}>
        <I_Palette size={15} /> Seguir personalizando
      </button>
    );
  }

  return (
    <aside className="pers-panel" aria-label="Personalizar el panel: tu logo y tus colores">
      {/* ---------- Encabezado: el título que invita ---------- */}
      <div className="pers-head">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="pers-ttl"><I_Palette size={17} /> Hacé tuyo este panel</div>
          <div className="tiny muted" style={{ marginTop: 4 }}>
            Tu logo y tus colores. Se ve en todo el panel y queda guardado en tu cuenta.
          </div>
        </div>
        <button className="icon-btn" title="Cerrar la personalización sin guardar: tu panel vuelve a tu logo y tus colores de antes"
          onClick={descartar}><I_X size={16} /></button>
      </div>

      <div className="pers-body">
        {/* ===================== (a) TU LOGO ===================== */}
        <div className="marca-h"><I_Image size={15} /> <b>Tu logo</b></div>
        <div className="tiny muted" style={{ marginBottom: 10 }}>
          Arrastrá la imagen acá o hacé clic para elegirla de tu compu. Se ve en tu barra de
          arriba y en el saludo del día.
        </div>
        <div className={`pers-drop ${arrastrando ? 'drag' : ''}`} role="button" tabIndex={0}
          title="Arrastrá el archivo de tu logo acá, o hacé clic para buscarlo en tu compu (PNG, JPG o SVG)"
          onClick={() => entrada.current?.click()}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); entrada.current?.click(); } }}
          onDragOver={e => { e.preventDefault(); setArrastrando(true); }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={soltar}>
          <span className="pers-drop-prev">
            {borrador.logo
              ? <img src={borrador.logo} alt={`Logo de ${perfil.marca || 'tu negocio'}`} />
              : <SinkrooMark size={58} />}
          </span>
          <span className="pers-drop-tx">
            {arrastrando ? 'Soltá la imagen acá' : borrador.logo ? 'Tu logo, en grande' : 'Arrastrá tu logo acá'}
            <small>
              {arrastrando
                ? 'La achicamos solos antes de guardarla.'
                : borrador.logo
                  ? `${perfil.marca || 'Tu negocio'}: así se ve tal cual lo va a ver tu equipo.`
                  : 'o hacé clic para buscarlo en tu compu. PNG, JPG o SVG, hasta 6 MB.'}
            </small>
          </span>
        </div>
        {/* Un solo cargador (el label y el recuadro de arriba apuntan al mismo input). */}
        <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <label className="btn btn-ghost btn-sm marca-subir"
            title="Elegí el archivo de tu logo (PNG, JPG o SVG). Se achica solo antes de guardarse y no se sube a ningún lado.">
            <I_Upload size={13} /> {borrador.logo ? 'Cambiar el logo' : 'Subir mi logo'}
            <input ref={entrada} className="pers-file" type="file" accept="image/*"
              onChange={e => { subirLogo(e.target.files?.[0] ?? undefined); e.target.value = ''; }} />
          </label>
          {borrador.logo && (
            <Button variant="ghost" className="btn-sm"
              title="Quita tu logo y el panel vuelve al búho de Sinkroo. Es reversible: podés volver a subirlo cuando quieras."
              onClick={() => { set('logo', ''); setErrorLogo(''); }}>
              <I_Trash size={13} /> Quitar el logo
            </Button>
          )}
        </div>
        <div className="tiny muted" style={{ marginTop: 7 }}>
          {borrador.logo
            ? 'Tu logo vive en tu cuenta: aparece en tu barra de arriba y en el saludo del día, y también en tu marca.'
            : 'Sin logo propio se ve el de Sinkroo, como hasta ahora. Es reversible: lo quitás cuando quieras.'}
        </div>
        {errorLogo && <div className="tiny" style={{ color: 'var(--red)', marginTop: 6 }}>{errorLogo}</div>}

        {/* ===================== (b) TUS COLORES ===================== */}
        <div className="marca-sep" />
        <div className="marca-h"><I_Palette size={15} /> <b>Tus colores</b></div>
        <div className="tiny muted" style={{ marginBottom: 10 }}>
          Tu color principal y tu color de acento pintan la identidad del panel: el botón principal,
          el brillo del saludo, la sección activa del menú y la serie principal del gráfico. Con que
          elijas uno ya se ve en el panel: el otro lo saco de ese mismo hasta que elijas el tuyo.
        </div>

        <div className="marca-col2">
          {([['col1', 'Color principal'], ['col2', 'Color de acento']] as const).map(([clave, etiqueta]) => (
            <div key={clave} className="marca-col-bloque">
              <label className="label" style={{ marginBottom: 8 }}>{etiqueta}</label>
              <div className="row" style={{ gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                <label className="marca-picker" title={`Elegir un ${etiqueta.toLowerCase()} propio con el selector de color`}
                  style={{ background: borrador[clave] || 'var(--bg3)' }}>
                  <input type="color" value={borrador[clave] || '#4A7C59'}
                    onChange={e => set(clave, e.target.value)} />
                </label>
                <span className="marca-hex mono">{borrador[clave] || '— sin definir —'}</span>
                {borrador[clave] && (
                  <button className="marca-x" title="Vaciar este color y volver a los colores de Sinkroo"
                    onClick={() => set(clave, '')}>✕</button>
                )}
              </div>
              <div className="row" style={{ gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
                {COLORES_MARCA.map(c => (
                  <button key={c} className={`perf-color ${borrador[clave] === c ? 'sel' : ''}`}
                    title={`Usar ${c} como ${etiqueta.toLowerCase()}`}
                    style={{ background: c }} onClick={() => set(clave, c)} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <label className="label" style={{ marginTop: 14, marginBottom: 8 }}>Paletas ya armadas</label>
        <div className="marca-paletas">
          {PALETAS.map(p => {
            const on = borrador.col1 === p.col1 && borrador.col2 === p.col2;
            return (
              <button key={p.nombre + p.col1 + p.col2} type="button" className={`marca-paleta ${on ? 'sel' : ''}`}
                title={on ? `Ya estás usando ${p.nombre} ${p.detalle}` : `Usar la paleta ${p.nombre} ${p.detalle}: se aplica al instante en tu panel`}
                onClick={() => { setBorrador(b => ({ ...b, col1: p.col1, col2: p.col2 })); setGuardado(false); }}>
                <span className="marca-paleta-pt" style={{ background: gradienteMarca(p.col1, p.col2) }} />
                <span className="marca-paleta-tx">{on ? '✓ ' : ''}{p.nombre}<small>{p.detalle}</small></span>
              </button>
            );
          })}
        </div>

        <div className="pers-grad" style={{ background: grad, color: sobreGrad }}
          title="Así se ve el botón principal de tu panel con los colores que elegiste ahora mismo">
          <span>Tu botón principal, con estos colores</span>
          <span className="pers-grad-hex mono">{borrador.col1 || 'Sinkroo'} · {borrador.col2 || 'Sinkroo'}</span>
        </div>

        {choque && (
          <div className="tiny" style={{ color: 'var(--amber)', marginTop: 9 }}>
            Ojo: tu color se parece al {choque}. Lo usás igual en los botones, el menú y el gráfico, pero
            en los avisos manda el semáforo: así el rojo nunca deja de querer decir crítico.
          </div>
        )}
        {marcaPropia && brilloDe(borrador.col1) > 0.72 && (
          <div className="tiny muted" style={{ marginTop: 6 }}>
            Tu color principal es clarito: en los botones uso una versión un poco más oscura para que el
            texto se lea bien. El tono sigue siendo el tuyo.
          </div>
        )}

        {/* ===================== (c) JUGAR CON EL PANEL ===================== */}
        <div className="pers-jugar">
          <div className="marca-h" style={{ marginBottom: 4 }}><I_Eye size={15} /> <b>Jugá con el panel</b></div>
          <div className="tiny muted">
            Todo lo que tocás se aplica ya mismo en el panel de atrás, el de verdad: movés un color y lo
            ves repintarse sin cerrar nada. Probá tranquilo: hasta que no guardes, no cambia nada para tu equipo.
          </div>
          <button className="btn btn-ghost btn-sm" type="button" style={{ marginTop: 10 }}
            title="Corre este panel a un costado para que veas el dashboard entero. Tus cambios siguen ahí y volvés con un clic."
            onClick={() => setMirando(true)}>
            <I_Eye size={13} /> Ver el panel completo
          </button>
        </div>
      </div>

      {/* ===================== (d) GUARDAR, DESCARTAR O VOLVER ===================== */}
      <div className="pers-foot">
        <div className="tiny muted" style={{ marginBottom: 9 }}>
          Se ven al instante. Guardá para que queden.
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <Button className="btn-sm" disabled={!hayCambios}
            title={hayCambios
              ? 'Guarda tu logo y tus colores en tu cuenta: quedan así cada vez que entres.'
              : 'Todavía no cambiaste nada: tocá un color o subí tu logo.'}
            onClick={salvar}>
            <I_Check size={13} /> Guardar mis colores
          </Button>
          <Button variant="ghost" className="btn-sm"
            title="Cierra sin guardar y devuelve el panel a tu logo y tus colores de antes. Nada de lo que probaste queda."
            onClick={descartar}>Descartar</Button>
          <Button variant="ghost" className="btn-sm"
            title="Vuelve a los colores violetas de Sinkroo como punto de partida. Después tocá «Guardar mis colores» para que quede."
            onClick={() => { setBorrador(b => ({ ...b, col1: '', col2: '' })); setGuardado(false); }}>
            <I_Trash size={13} /> Volver a los colores de Sinkroo
          </Button>
        </div>
        {guardado && (
          <div className="tiny" style={{ color: 'var(--green)', fontWeight: 700, marginTop: 8 }}>
            <I_Check size={12} /> Guardado: se ve en todo el panel.
          </div>
        )}
        {sinEspacio && (
          <div className="tiny" style={{ color: 'var(--red)', marginTop: 8 }}>
            El navegador no dejó guardar (¿modo privado o el logo pesa mucho?). Probá con un logo más chico.
          </div>
        )}
      </div>
    </aside>
  );
}
