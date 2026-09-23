import { useState } from 'react';
import { SinkrooMark, I_ArrowRight, I_ArrowLeft } from '../components/sinkroo/icons';

const PASOS = [
  { t: 'Bienvenido', d: 'Vamos a conocerte: contanos de tu negocio para que la IA pueda ayudarte a vender más.' },
  { t: 'Tu negocio', d: 'Empecemos por lo básico: cómo se llama tu marca, en qué rubro está y qué vendés.' },
  { t: 'Modelo de negocio', d: 'Contanos cómo ganás dinero hoy: precios, márgenes y qué es lo que más te cuesta.' },
  { t: 'Tus productos', d: 'Subí fotos de tus principales productos para que la IA entienda tu oferta y tu estilo.' },
  { t: 'Tu historia', d: 'Contá con tus palabras quién sos, o subí un archivo con la información de tu emprendimiento.' },
  { t: 'Presupuesto', d: 'Decinos cuánto querés invertir por mes y te mostramos qué podés lograr con ese monto.' },
  { t: 'Conexión de canales', d: 'Conectá los canales donde vendés, para que la IA maneje todo desde un solo lugar.' },
];

const CATEGORIAS = ['Skincare / Belleza', 'Suplementos', 'Moda', 'Hogar', 'Tecnología', 'Alimentos', 'Fitness', 'Mascotas', 'Infantil', 'Servicios', 'Educación', 'Otro'];
const QUE_VENDO = ['Producto físico', 'Servicio', 'Digital (cursos, apps)', 'Suscripción', 'Físico + digital'];
const MODELOS = ['Venta directa (mis propios productos)', 'Revendo productos de terceros', 'Servicios a medida', 'Suscripción mensual', 'Mixto (producto + servicio)'];
const PRECIO_RANGOS = ['Menos de $1.000', '$1.000 - $5.000', '$5.000 - $20.000', '$20.000 - $100.000', 'Más de $100.000'];
const MARGENES = ['Bajo (menos de 20%)', 'Medio (20% - 50%)', 'Alto (más de 50%)', 'No lo sé'];
const FRECUENCIAS = ['Compra una sola vez', 'Repite una vez por mes', 'Repite varias veces por año', 'Servicio recurrente / suscripción'];
const DOLORES = ['Reconocimiento de marca', 'Conseguir más clientes', 'Fidelizar a los actuales', 'Aumentar el ticket', 'Vender por internet', 'Todo lo anterior'];


export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [negocio, setNegocio] = useState('');
  const [queVendo, setQueVendo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [modelo, setModelo] = useState('');
  const [precioRango, setPrecioRango] = useState('');
  const [margen, setMargen] = useState('');
  const [frecuencia, setFrecuencia] = useState('');
  const [dolor, setDolor] = useState('');
  const [productos, setProductos] = useState<string[]>([]);
  const [presentacion, setPresentacion] = useState('');
  const [pitch, setPitch] = useState('');
  const [distinto, setDistinto] = useState('');
  const [otraInfo, setOtraInfo] = useState('');
  const [presupuesto, setPresupuesto] = useState(20);
  const [canales, setCanales] = useState<string[]>([]);
  const [archivoInfo, setArchivoInfo] = useState('');

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

  const subirProductos = (files: FileList | null) => {
    if (!files) return;
    const nuevos: string[] = [];
    let cargados = 0;
    const max = Math.min(files.length, 10 - productos.length);
    for (let i = 0; i < max; i++) {
      const f = files[i];
      const r = new FileReader();
      r.onload = () => { nuevos.push(String(r.result)); cargados++; if (cargados === max) setProductos([...productos, ...nuevos]); };
      r.readAsDataURL(f);
    }
  };

  const avanzar = () => {
    if (step < 6) setStep(step + 1); else onDone();
  };

  return (
    <div className="ob-shell">
      <div className={step === 0 ? 'ob-card ob-hero' : 'ob-card'}>
        {step === 0 && (
          <div className="ob-hero-bg">
            <img src="ob-hero.jpg" alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />
            <div className="ob-hero-veil" />
          </div>
        )}
        <div className="ob-progress"><div className="ob-progress-fill" style={{ width: `${((step + 1) / 7) * 100}%` }} /></div>
        <div className="ob-head">
          <span className="ob-ico"><SinkrooMark size={26} radius={7} /></span>
          <div>
            <div className={step === 0 ? "ob-title ob-title-welcome" : "ob-title"}>{PASOS[step].t}</div>
            <div className="ob-desc">{PASOS[step].d}</div>
          </div>
        </div>

        {step === 0 && (
          <div className="hero-block">
            <div className="ob-hero-badge"><span className="dot" /> Inteligencia Artificial para tu negocio</div>
            <h1 className="ob-hero-h1">No necesitás saber de marketing.<br /><span className="grad">Sinkroo lo hace todo por vos.</span></h1>
            <p className="ob-hero-sub">
              Cualquier persona puede ser <b>experta en marketing sin saber nada</b>. Sinkroo hace <b>todo en automático, de la publicación a la venta</b>,
              apuntando al verdadero mercado que querés alcanzar.
            </p>
            <div className="ob-hero-universal">
              <div className="ob-universal-line">¿Tenés un negocio? <b>Ya tenés todo lo que hace falta.</b></div>
              <div className="ob-universal-sub">Sin importar el rubro, el tamaño ni tu experiencia: Sinkroo se ocupa del resto, de la primera publicación a la primera venta.</div>
            </div>
            <div className="ob-hero-note">📥 La información que subas es justo la que la IA necesita para avanzar.</div>
            <div className="ob-hero-chips">
              <div className="ob-hero-chip"><b>Todo en automático</b>De la publicación a la venta, sin mover un dedo.</div>
              <div className="ob-hero-chip"><b>Al mercado exacto</b>La IA apunta a quien de verdad te compra.</div>
            </div>
            <div className="ob-hero-foot">
              <span>⚡ 7 pasos · 5 minutos</span>
              <span>🧠 Cero conocimiento técnico</span>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="ob-fields">
            <div><div className="ob-q"><span className="ob-q-n">1</span><span className="ob-q-t">¿Cómo se llama tu marca o negocio?</span></div><div className="ob-q-sub">El nombre con el que te conocen tus clientes, o el que querés crear. Ej: Skincare Natural, Panadería La Esquina, Estudio de Yoga Lucía.</div><input className="input" placeholder="Ej. Skincare Natural" value={negocio} onChange={e => setNegocio(e.target.value)} /></div>
            <div><div className="ob-q"><span className="ob-q-n">2</span><span className="ob-q-t">Categoría</span></div><div className="ob-q-sub">Elegí la que más se parece a tu negocio. Así la IA te compara con marcas parecidas y arma tu estrategia.</div><div className="chip-grid">{CATEGORIAS.map(c => <div key={c} className={`chip ${categoria === c ? 'sel' : ''}`} onClick={() => setCategoria(c)}>{c}</div>)}</div></div>
            <div><div className="ob-q"><span className="ob-q-n">3</span><span className="ob-q-t">¿Qué vendés?</span></div><div className="ob-q-sub">Lo principal que vendés. Ej: cremas que envías por correo, clases por Zoom, una app con suscripción.</div><div className="chip-grid">{QUE_VENDO.map(q => <div key={q} className={`chip ${queVendo === q ? 'sel' : ''}`} onClick={() => setQueVendo(q)}>{q}</div>)}</div></div>
            <div className="ob-tip">💡 Cuanto más claro lo describas, más precisa va a ser la IA para tu marca.</div>
          </div>
        )}

        {step === 2 && (
          <div className="ob-fields">
            <div><div className="ob-q"><span className="ob-q-n">1</span><span className="ob-q-t">¿Cómo ganás dinero hoy?</span></div><div className="ob-q-sub">Pensá en una venta típica: cobrás por producto, por servicio, por suscripción mensual, o una mezcla de varias.</div><div className="chip-grid">{MODELOS.map(m => <div key={m} className={`chip ${modelo === m ? 'sel' : ''}`} onClick={() => setModelo(m)}>{m}</div>)}</div></div>
            <div><div className="ob-q"><span className="ob-q-n">2</span><span className="ob-q-t">Precio promedio de venta</span></div><div className="ob-q-sub">Lo que paga un cliente en una compra normal. Ej: si tus cremas cuestan $18, elegí el rango que las incluye.</div><div className="chip-grid">{PRECIO_RANGOS.map(m => <div key={m} className={`chip ${precioRango === m ? 'sel' : ''}`} onClick={() => setPrecioRango(m)}>{m}</div>)}</div></div>
            <div><div className="ob-q"><span className="ob-q-n">3</span><span className="ob-q-t">Margen de ganancia</span></div><div className="ob-q-sub">De cada $100 que cobrás, ¿cuánto te queda después de costos? Si no lo sabés, marcá No sé y la IA lo estima.</div><div className="chip-grid">{MARGENES.map(m => <div key={m} className={`chip ${margen === m ? 'sel' : ''}`} onClick={() => setMargen(m)}>{m}</div>)}</div></div>
            <div><div className="ob-q"><span className="ob-q-n">4</span><span className="ob-q-t">Cada cuánto compra un cliente</span></div><div className="ob-q-sub">Ej: una sola vez, cada tanto, o todos los meses como una suscripción.</div><div className="chip-grid">{FRECUENCIAS.map(m => <div key={m} className={`chip ${frecuencia === m ? 'sel' : ''}`} onClick={() => setFrecuencia(m)}>{m}</div>)}</div></div>
            <div><div className="ob-q"><span className="ob-q-n">5</span><span className="ob-q-t">¿Qué te está costando hoy?</span></div><div className="ob-q-sub">Tu mayor desafío ahora: conseguir clientes, que te compren más, darte a conocer. La IA se enfoca ahí primero.</div><div className="chip-grid">{DOLORES.map(m => <div key={m} className={`chip ${dolor === m ? 'sel' : ''}`} onClick={() => setDolor(m)}>{m}</div>)}</div></div>
            <div className="ob-tip">💡 El margen define cuánto podés invertir en publicidad. La IA lo usa para calcular tu presupuesto ideal.</div>
          </div>
        )}

        {step === 3 && (
          <div className="ob-fields">
            <div className="ob-help">📸 Subí fotos de tus principales productos. <b>Máximo 10.</b> La IA las usa para entender tu oferta, tu estilo y tu público.</div>
            <div className="ob-prod-drop">
              <input id="ob-prod-file" type="file" accept="image/*" multiple onChange={e => subirProductos(e.target.files)} style={{ display: 'none' }} />
              <div className="ob-prod-drop-in" onClick={() => document.getElementById('ob-prod-file')?.click()}>
                <div className="ob-prod-drop-ico">📷</div>
                <div><b>Hacé click para subir tus fotos</b></div>
                <div className="small muted">JPG o PNG · hasta 10 imágenes</div>
      </div>
            </div>
            {productos.length > 0 && (
              <div className="ob-prod-grid">
                {productos.map((pr, i) => (
                  <div key={i} className="ob-prod-item">
                    <img src={pr} alt={'Producto ' + (i + 1)} />
                    <button className="ob-prod-x" onClick={() => setProductos(productos.filter((_, j) => j !== i))}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="ob-tip">💡 Sin fotos ahora? No pasa nada: podés agregarlas después desde el dashboard.</div>
          </div>
        )}

        {step === 4 && (
          <div className="ob-fields">
            <div className="ob-help">✍️ Contale a la IA quién sos. Escribí con tus palabras o subí un archivo con información de tu negocio (precios, catálogo, textos de venta, historial).</div>
            <div><div className="ob-q"><span className="ob-q-n">1</span><span className="ob-q-t">Tu presentación</span></div><div className="ob-q-sub">Cómo te presentarías a alguien que no conoce tu negocio. Ej: "Vendo cosmética natural artesanal hecha en Córdoba, para pieles sensibles. Mis clientas son mujeres 30-50."</div>
              <textarea className="input ob-textarea" rows={3} placeholder="Escribí acá tu presentación..." value={presentacion} onChange={e => setPresentacion(e.target.value)} />
            </div>
            <div><div className="ob-q"><span className="ob-q-n">2</span><span className="ob-q-t">Tu pitch de venta</span></div><div className="ob-q-sub">En una frase: qué vendés, para quién y el beneficio clave. Ej: "Cremas naturales que cuidan la piel sensible, hechas a mano en Córdoba."</div>
              <textarea className="input ob-textarea" rows={3} placeholder="Escribí acá tu pitch..." value={pitch} onChange={e => setPitch(e.target.value)} />
            </div>
            <div><div className="ob-q"><span className="ob-q-n">3</span><span className="ob-q-t">Qué te hace distinto</span></div><div className="ob-q-sub">Tu diferencial frente a la competencia. Ej: "Mis productos van del taller directo a tu casa, sin intermediarios, y cada crema la hago yo misma."</div>
              <textarea className="input ob-textarea" rows={3} placeholder="Escribí acá tu diferencial..." value={distinto} onChange={e => setDistinto(e.target.value)} />
            </div>
            <div><div className="ob-q"><span className="ob-q-n">4</span><span className="ob-q-t">Otra información útil</span></div><div className="ob-q-sub">Algo más que quieras que la IA sepa: historia, años en el rubro, equipo, envíos, formas de pago.</div>
              <textarea className="input ob-textarea" rows={3} placeholder="Escribí acá cualquier otra cosa..." value={otraInfo} onChange={e => setOtraInfo(e.target.value)} />
            </div>
            <div><div className="ob-q"><span className="ob-q-n">5</span><span className="ob-q-t">O subí tu información como archivo</span></div><div className="ob-q-sub">Si tenés catálogo, lista de precios o textos de venta en PDF o Word, subilos y la IA los lee por vos.</div></div><div className="ob-file-opt">
              <input id="ob-info-file" type="file" accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx" onChange={e => e.target.files?.[0] && setArchivoInfo(e.target.files[0].name)} style={{ display: 'none' }} />
              <div className="ob-file-line" onClick={() => document.getElementById('ob-info-file')?.click()}>
                <span className="ob-file-ico">📎</span>
                <span><b>Preferís subir tu información?</b> <span className="small muted">PDF, Word, TXT, Excel · La IA lo lee y extrae todo.</span></span>
                {archivoInfo ? <span className="ob-file-ok">✓ {archivoInfo}</span> : <span className="ob-file-plus">+</span>}
              </div>
            </div>
            <div className="ob-tip">💡 Lo que escribas acá es lo primero que la IA lee de tu negocio. Cuéntale lo que le dirías a un amigo de tu emprendimiento.</div>
          </div>
        )}

        {step === 5 && (
          <div className="ob-fields">
            <div className="slider-row"><span className="small muted">Presupuesto mensual</span><div style={{ flex: 1 }} /><span className="slider-val">${presupuesto.toLocaleString('es-AR')}</span></div>
            <input type="range" min="20" max="5000" step="20" value={presupuesto} onChange={e => setPresupuesto(+e.target.value)} style={{ background: `linear-gradient(90deg, #7c3aed, #a855f7 ${((presupuesto - 20) / 4980) * 100}%, rgba(139,92,246,.15) ${((presupuesto - 20) / 4980) * 100}%)` }} />
            <div className="row small muted" style={{ justifyContent: 'space-between' }}><span>$20</span><span>$5,000</span></div>
            <div className="ob-budget-cards">
              <div className="chip" style={{ width: 'auto' }} onClick={() => setPresupuesto(20)}><span style={{ fontWeight: 700 }}>Arranque</span> <span className="small muted">$20/mes</span></div><div className="chip" style={{ width: 'auto' }} onClick={() => setPresupuesto(500)}><span style={{ fontWeight: 700 }}>Inicial</span> <span className="small muted">~$500/mes</span></div>
              <div className="chip" style={{ width: 'auto' }} onClick={() => setPresupuesto(800)}><span style={{ fontWeight: 700 }}>Crecimiento</span> <span className="small muted">~$800/mes</span></div>
              <div className="chip" style={{ width: 'auto' }} onClick={() => setPresupuesto(2000)}><span style={{ fontWeight: 700 }}>Escala</span> <span className="small muted">~$2,000/mes</span></div>
            </div>
            <div className="ob-proyeccion">
              <div className="ob-proyeccion-t">📈 Proyección con ${presupuesto.toLocaleString('es-AR')}/mes</div>
              <div className="ob-seg-row"><span className="ob-seg-l">Alcance estimado</span><span className="ob-seg-v">{(presupuesto * 22).toLocaleString('es-AR')} personas/mes</span></div>
              <div className="ob-seg-row"><span className="ob-seg-l">Ventas estimadas</span><span className="ob-seg-v">~{Math.max(0, Math.round(presupuesto / 28))} por mes</span></div>
              <div className="ob-seg-row"><span className="ob-seg-l">ROAS esperado</span><span className="ob-seg-v">3.2x - 4.5x</span></div>
            </div>
            <div className="ob-tip">💡 Podés empezar chico y escalar. La IA optimiza el gasto para el mejor retorno, no para gastar de más.</div>
          </div>
        )}

        {step === 6 && (
          <div className="ob-fields">
            <div className="ob-help">🔗 Conectá tus canales. Los datos de cada uno alimentan tu dashboard.</div>
            <div className="ob-canal-grid">
              <div className={`ob-canal ${canales.includes('WhatsApp') ? 'sel' : ''}`} onClick={() => toggle(canales, setCanales, 'WhatsApp')}><span className="ob-canal-ico">💬</span><div><div style={{ fontWeight: 700 }}>WhatsApp</div><div className="small muted">Cierre de ventas y atención</div></div></div>
              <div className={`ob-canal ${canales.includes('Instagram') ? 'sel' : ''}`} onClick={() => toggle(canales, setCanales, 'Instagram')}><span className="ob-canal-ico">📸</span><div><div style={{ fontWeight: 700 }}>Instagram</div><div className="small muted">Alcance orgánico y comunidad</div></div></div>
              <div className={`ob-canal ${canales.includes('Meta Ads') ? 'sel' : ''}`} onClick={() => toggle(canales, setCanales, 'Meta Ads')}><span className="ob-canal-ico">🎯</span><div><div style={{ fontWeight: 700 }}>Meta Ads</div><div className="small muted">Tráfico pago y conversiones</div></div></div>
              <div className={`ob-canal ${canales.includes('Email') ? 'sel' : ''}`} onClick={() => toggle(canales, setCanales, 'Email')}><span className="ob-canal-ico">✉️</span><div><div style={{ fontWeight: 700 }}>Email</div><div className="small muted">Carrito abandonado y reventa</div></div></div>
              <div className={`ob-canal ${canales.includes('TikTok') ? 'sel' : ''}`} onClick={() => toggle(canales, setCanales, 'TikTok')}><span className="ob-canal-ico">🎵</span><div><div style={{ fontWeight: 700 }}>TikTok</div><div className="small muted">Alcance orgánico a audiencias nuevas</div></div></div>
            </div>
            <div className="ob-help">🔒 Conexión segura. Podés conectar más canales después, cuando quieras.</div>
          </div>
        )}

        <div className="ob-nav">
          <button className="btn btn-ghost" onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0}><I_ArrowLeft size={16} /> Atrás</button>
          <span className="ob-step">{step + 1} / 7</span>
          <button className="btn btn-primary" onClick={avanzar} style={step === 0 ? { padding: '14px 28px', fontSize: 15, fontWeight: 800 } : undefined}>
            {step === 0 ? 'Empezar ahora' : step === 6 ? 'Terminar' : 'Siguiente'} <I_ArrowRight size={step === 0 ? 18 : 16} />
          </button>
        </div>
        {step === 0 && (
          <button className="ob-skip" onClick={onDone}>Saltar esta sección →</button>
        )}
      </div>
    </div>
  );
}
