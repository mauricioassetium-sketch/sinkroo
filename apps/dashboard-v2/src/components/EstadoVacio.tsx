import type { ReactNode } from 'react';
import { Button } from './ui';
import { MotorTrabajando } from './MotorTrabajando';

// =============================================================================================
// EL ESTADO VACÍO — lo que se ve cuando el negocio todavía no hizo nada.
//
// Es la cara de un panel conectado de verdad: no hay datos de ejemplo, hay un negocio nuevo y una
// invitación concreta a hacer la primera acción. Nunca dice «no hay datos»: dice qué hacer para tenerlos.
// =============================================================================================

export function EstadoVacio({ titulo, texto, accion, onAccion, icono }: {
  titulo: string; texto: string; accion?: string; onAccion?: () => void; icono?: ReactNode;
}) {
  return (
    <div className="vacio">
      <div className="vacio-ic">{icono ?? '◦'}</div>
      <div className="vacio-t">{titulo}</div>
      <div className="vacio-s">{texto}</div>
      {/* SI EL MOTOR ESTÁ TRABAJANDO, ACÁ SE VE. El dueño: «cuando el motor esté corriendo debe salir la
          misma barra de carga circular en todos los lugares donde el motor mete información». Este es el
          estado vacío compartido de todos los bloques que el motor llena, así que con esto queda cubierto
          cada uno de ellos sin repetir el aviso en cada pantalla. */}
      <div className="vacio-motor"><MotorTrabajando compacto /></div>
      {accion && onAccion && (
        <Button variant="outline" className="btn-sm" title={accion} onClick={onAccion}>{accion}</Button>
      )}
    </div>
  );
}
