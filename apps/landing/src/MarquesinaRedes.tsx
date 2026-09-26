import { REDES, type Red } from './redes'
import './marquesina.css'

/** Una ficha: logo a color de marca + nombre en texto claro. */
function Ficha({ red }: { red: Red }) {
  return (
    <div className="mrq-ficha" data-red={red.id}>
      <span className="mrq-logo" style={{ color: red.color }}>
        <svg
          className="mrq-svg"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="currentColor"
          aria-hidden="true"
          focusable="false"
        >
          <path d={red.trazo} />
        </svg>
      </span>
      <span className="mrq-nombre">{red.nombre}</span>
    </div>
  )
}

/**
 * Una fila que se desliza sola, en bucle infinito y sin saltos:
 * la lista se duplica al final y la animación recorre exactamente la mitad
 * del ancho de la pista (una copia completa), así el final empalma con el principio.
 */
function Fila({ redes, lado }: { redes: Red[]; lado: 'izq' | 'der' }) {
  const pista = [...redes, ...redes]

  return (
    <div className="mrq-mascara">
      <div className={`mrq-pista mrq-pista--${lado}`} data-fila={lado}>
        {pista.map((red, i) => (
          <Ficha key={`${red.id}-${i}`} red={red} />
        ))}
      </div>
    </div>
  )
}

/** Franja de las 15 redes: la fila de arriba va hacia la izquierda y la de abajo hacia la derecha. */
export function MarquesinaRedes() {
  return (
    <section className="mrq" aria-label="Redes sociales donde puedes conectar tu contenido">
      <Fila redes={REDES} lado="izq" />
      <Fila redes={REDES} lado="der" />
    </section>
  )
}
