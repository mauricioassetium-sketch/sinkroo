// =============================================================================================
// LA LANDING — la puerta de entrada. Seis bloques, cada uno de una pantalla de celular o menos.
//
// REGLAS QUE LA MANDAN (y que conviene no romper al editarla):
//   1. EL TEXTO ES DEL DUEÑO, LITERAL. Aquí no se reescribe ni se agrega una promesa más. Si hay
//      que cambiar algo, se cambia en el contenido y de ahí para acá; no se «mejora» por gusto.
//   2. CORTA. Nada de párrafos largos: una idea por bloque y, donde se pueda, una línea.
//   3. SE HABLA DE USTED. Español de Colombia, trato de usted.
//   4. NADA SE ESCONDE POR JAVASCRIPT. No hay animaciones de entrada ni estados invisibles que
//      alguien tenga que destapar: el texto se pinta de una vez, sin trampas de «anti-blank».
//   5. LOS BOTONES VAN A /panel/, en la misma ventana: son enlaces, no formularios. No hay ningún
//      campo de correo, así que no hay nada que prometa enviar algo que no se envía.
// =============================================================================================

import './styles.css';

/** Adónde llevan todos los botones «Entrar a mi panel». */
const PANEL = '/panel/';

/** Los seis pasos, una línea cada uno. */
const PASOS = [
  'Conecta su negocio: sus datos, su material y sus redes.',
  'El equipo investiga: seis agentes leen el mercado y guardan cada hallazgo con la fuente.',
  'El motor escribe las piezas.',
  'MiroFish las prueba: cinco jueces y quinientos del público.',
  'Usted aprueba: lo que pasa el filtro se publica; lo que no, se corrige.',
  'Se mide: qué rindió cada pieza, cuánto costó y cuánto se desvió el modelo.',
];

/** Los tres planes, con los precios tal cual. */
const PLANES = [
  {
    nombre: 'Base',
    precio: '39 USD por mes',
    creditos: '2.000 créditos',
    detalle: 'Una marca y una campaña a la vez.',
    elegido: false,
  },
  {
    nombre: 'Pro',
    precio: '79 USD por mes',
    creditos: '5.000 créditos',
    detalle: 'Varias campañas corriendo a la vez y el equipo investigando todos los días.',
    elegido: true,
  },
  {
    nombre: 'Estudio',
    precio: '149 USD por mes',
    creditos: '12.000 créditos',
    detalle: 'Varias marcas o un catálogo grande, con hasta 5 marcas en la misma cuenta.',
    elegido: false,
  },
];

/** El botón grande, el mismo en los tres lugares donde aparece. */
function BotonPanel() {
  return (
    <a className="cta" href={PANEL}>
      Entrar a mi panel
    </a>
  );
}

export function App() {
  return (
    <div className="page">
      {/* ===== BLOQUE 1 — PORTADA ===== */}
      <section className="bloque portada">
        <div className="marca">
          <img className="buho" src="/67.png" width={72} height={72} alt="Sinkroo: el búho" />
          <span className="marca-nombre">Sinkroo</span>
        </div>
        <h1 className="titular">Tu equipo de marketing, trabajando solo 24/7</h1>
        <p className="bajada">
          Investiga su mercado, escribe las piezas, las publica y mide cada peso. Todo el trabajo
          queda hecho: sólo queda aprobar.
        </p>
        <BotonPanel />
        <p className="linea-chica">
          El sistema entra por invitación: su código de entrada lo recibe de quien le instaló el
          sistema.
        </p>
      </section>

      {/* ===== BLOQUE 2 — EL FILTRO ===== */}
      <section className="bloque tarjeta">
        <h2 className="titulo-bloque">Nada sale a internet sin pasar el filtro</h2>
        <p className="cuerpo">
          Cada pieza se prueba contra 500 personas simuladas y 5 jueces antes de gastar un peso. La
          que no convence no se publica: vuelve a corregirse y queda guardada con el voto de cada
          juez.
        </p>
        <ul className="datos">
          <li className="dato">5 jueces</li>
          <li className="dato">500 personas del público</li>
          <li className="dato">0 pesos antes del veredicto</li>
        </ul>
        <p className="cuerpo linea">
          Usted ve el motor trabajando: en qué etapa va, cómo viene el sentimiento del mercado y qué
          votó cada juez.
        </p>
      </section>

      {/* ===== BLOQUE 3 — CÓMO TRABAJA ===== */}
      <section className="bloque tarjeta">
        <h2 className="titulo-bloque">Cómo trabaja</h2>
        <ol className="pasos">
          {PASOS.map((paso, i) => (
            <li className="paso" key={paso}>
              <span className="paso-num" aria-hidden="true">
                {i + 1}
              </span>
              <span className="paso-texto">{paso}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ===== BLOQUE 4 — CÓMO SE ENTRA ===== */}
      <section className="bloque tarjeta">
        <h2 className="titulo-bloque">Así se entra</h2>
        <p className="cuerpo">
          Se entra con un código de entrada. Adentro, el panel arranca vacío: se va llenando con lo
          que su negocio haga, paso por paso. No hay datos de ejemplo ni cifras que nadie haya
          medido.
        </p>
        <BotonPanel />
      </section>

      {/* ===== BLOQUE 5 — PLANES ===== */}
      <section className="bloque tarjeta">
        <h2 className="titulo-bloque">Planes</h2>
        <ul className="planes">
          {PLANES.map((plan) => (
            <li className={`plan${plan.elegido ? ' plan-elegido' : ''}`} key={plan.nombre}>
              <div className="plan-encabezado">
                <span className="plan-nombre">{plan.nombre}</span>
                {plan.elegido ? <span className="pildora">El más elegido</span> : null}
              </div>
              <p className="plan-precio">{plan.precio}</p>
              <p className="plan-creditos">{plan.creditos}</p>
              <p className="plan-detalle">{plan.detalle}</p>
            </li>
          ))}
        </ul>
        <p className="cuerpo linea">
          El detalle de cada plan y la carga de créditos están adentro del panel.
        </p>
      </section>

      {/* ===== BLOQUE 6 — CIERRE ===== */}
      <section className="bloque tarjeta cierre">
        <h2 className="titulo-bloque">Su marketing, en automático</h2>
        <p className="cuerpo">El motor trabaja; usted aprueba. Nada sale a las cuentas sin su OK.</p>
        <BotonPanel />
      </section>

      <footer className="pie">
        Sinkroo · Dubai (SHAMS) · Latam ·{' '}
        <a href="mailto:info@sinkroo.com">info@sinkroo.com</a>
      </footer>
    </div>
  );
}
