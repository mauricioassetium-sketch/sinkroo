import { Component, type ReactNode } from 'react';
import { Card, Button } from './ui';

// =============================================================================================
// LA GUARDA DE PANTALLA
//
// Si algo se rompe dentro de una pantalla, el error sube hasta la raíz y React desmonta TODO lo que
// había pintado: el panel queda en blanco y el negocio se queda sin nada, sin saber qué pasó ni cómo
// seguir. Ya pasó una vez: un campo que el back mandó como texto donde el panel esperaba una lista
// —«Contenido en sus redes», sin formatos medidos— dejó Campañas en blanco.
//
// Esta guarda agarra el error, dice en castellano qué pasó y deja el resto del panel en pie. La
// pantalla se arregla sola al cambiar de sección (la guarda se rehace con cada vista) y también con
// el botón, que recarga lo que hay en el servidor sin perder la sesión.
//
// NO reemplaza la causa: el error queda escrito en la consola con su detalle para poder arreglarlo.
// =============================================================================================

type Props = { children: ReactNode; /** El nombre de la pantalla, para poder decir dónde fue. */ que?: string };
type Estado = { error: Error | null };

export class Guarda extends Component<Props, Estado> {
  state: Estado = { error: null };

  static getDerivedStateFromError(error: Error): Estado {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // El detalle va a la consola del navegador: es lo que se mira para arreglar la causa.
    console.error('[Sinkroo] se rompió la pantalla', this.props.que || '', error, info?.componentStack || '');
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Card
        title="Esta pantalla se rompió"
        action={<Button variant="outline" onClick={() => window.location.reload()} title="Vuelve a cargar el panel desde el servidor. La sesión no se pierde.">Volver a cargar el panel</Button>}
      >
        <div className="bs" style={{ marginBottom: 10 }}>
          Algo falló al pintar <b>{this.props.que || 'esta pantalla'}</b>, y para que no se llevara puesto
          todo el panel, quedó acá. <b>El resto del panel sigue funcionando</b>: puede cambiar de sección
          con el menú de la izquierda.
        </div>
        <div className="acc-why"><b>Qué dijo el servidor: </b>{this.state.error.message || 'un error sin mensaje'}</div>
        <div className="acc-why">
          Esto es un defecto nuestro, no un dato que falte. El error quedó anotado en la consola del
          navegador con su detalle para poder arreglarlo.
        </div>
      </Card>
    );
  }
}
