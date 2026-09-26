import { useState } from 'react';
import { Card, Badge, Button } from '../components/ui';
import { ViewHead } from '../components/viz';
import { I_Gift, I_Copy, I_Check, I_Users, I_Credit } from '../components/icons';
import { useDatos } from '../api/datos';
import { EstadoVacio } from '../components/EstadoVacio';

// =============================================================================================
// REFERIDOS — el negocio que trae a otro y cobra en créditos.
//
// TODO SALE DE SU CUENTA: el link sale del nombre de su negocio y los referidos, de los que haya
// traído. Hoy el back todavía no manda la red de referidos, así que la pantalla muestra el estado
// vacío honesto —qué va a ver acá, cómo se gana y qué falta—, sin una red ni unas cifras de ejemplo.
// Sin back (modo demostración) no hay cuenta que leer: la pantalla es la misma.
//
// LO ÚNICO QUE NO ES DATO SUYO es el reglamento del programa (cuánto paga, cuándo y qué hito hay):
// es la lista de condiciones del producto, igual para todos, y va como tal.
// =============================================================================================

const PREMIO = 250;
const HITO = 5;
const PREMIO_HITO = 1000;

/** El código del link de referido sale del nombre del negocio: no se escribe a mano. */
const codigoDe = (nombre: string) =>
  nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function ViewReferidos({ setToast }: { setToast: (t: string) => void }) {
  // De dónde sale todo: de su cuenta. Sin back no hay negocio del que sacar el link ni red que leer.
  const d = useDatos();
  const esReal = d.real;
  const negocio = esReal ? (d.negocio?.name || '') : '';
  const link = negocio ? `https://sinkroo.ai/r/${codigoDe(negocio)}` : '';
  const saldoHoy = esReal ? (d.creditos?.saldo ?? 0) : null;
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setCopiado(true); setToast('Link copiado'); }
    catch { setToast(link); }
  };

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Gift size={19} />}
        titulo="Referidos"
        sub="Cada persona que usted trae y paga su primer mes le devuelve créditos. No es un descuento: son créditos que el motor usa para trabajar."
        nums={[
          { v: esReal ? '+0' : '—', l: 'créditos ganados', c: 'var(--green)' },
          { v: esReal ? '0' : '—', l: 'referidos que pagaron', c: 'var(--purple3)' },
          { v: esReal ? '0' : '—', l: 'invitados sin pagar' },
          { v: `+${PREMIO}`, l: 'por cada uno que paga' },
        ]}
      />

      {/* ============ EL LINK Y EL PROGRESO ============ */}
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Gift size={14} style={{ color: 'var(--purple3)' }} /> Su link</span>}
          action={<Badge tone="green">+{PREMIO} créditos por referido</Badge>}
        >
          <div className="bs">
            Pase este link a quien le pueda servir. <b>Gana créditos cuando la otra persona paga</b>,
            no cuando se registra: así nadie llena la red de cuentas vacías.
          </div>
          {link ? (
            <div className="row link-row" style={{ gap: 8 }}>
              <input className="input" value={link} readOnly style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }} />
              <Button className="btn-sm" title="Copie el link al portapapeles para pasarlo por donde quiera. No cambia nada de su cuenta." onClick={copiar}>
                <I_Copy size={14} /> {copiado ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          ) : (
            <div className="bs">
              Su link sale del nombre de su negocio: cuando el panel lea su cuenta, aparece acá con su
              botón de copiar. Todavía no se leyó.
            </div>
          )}
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">El que entra recibe</span><span className="dato-v" style={{ color: 'var(--green)' }}>+{PREMIO} créditos</span></div>
            <div className="dato"><span className="dato-l">Usted recibe</span><span className="dato-v" style={{ color: 'var(--green)' }}>+{PREMIO} créditos</span></div>
          </div>
          <div className="acc-why">
            Ganan los dos: <b>el que llega empieza con créditos para probar</b> y usted sigue cargando el motor
            sin poner dinero. Los créditos de referidos no vencen mientras su plan esté activo.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Credit size={14} style={{ color: 'var(--amber)' }} /> Cómo va su red</span>}
          action={<Badge tone="muted">{esReal ? 'sin referidos todavía' : 'sin leer'}</Badge>}
        >
          <EstadoVacio
            titulo="Todavía no hay referidos que contar"
            texto={`Los referidos entran cuando la otra persona paga su primer mes, no cuando se registra. Acá van a quedar cuántos van, cuántos créditos dejaron y cuánto falta para el hito de ${HITO}: al llegar, se suman ${PREMIO_HITO.toLocaleString('es-CO')} créditos extra de una sola vez.`}
            accion={link ? 'Copiar mi link' : undefined}
            onAccion={link ? copiar : undefined}
          />
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Invitados sin pagar</span><span className="dato-v">{esReal ? '0' : '—'}</span></div>
            <div className="dato"><span className="dato-l">Créditos ganados</span><span className="dato-v" style={{ color: 'var(--green)' }}>{esReal ? '+0' : '—'}</span></div>
            <div className="dato"><span className="dato-l">Su saldo hoy</span><span className="dato-v">{saldoHoy === null ? '—' : saldoHoy.toLocaleString('es-CO')}</span></div>
          </div>
          <div className="acc-why">
            Un referido que no paga también sirve: <b>le dejó su contacto</b>. El motor se lo recuerda
            una vez por semana, para cuando le sirva.
          </div>
        </Card>
      </div>

      {/* ============ LA RED Y LAS REGLAS ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--purple3)' }} /> Su red</span>}
          action={<Badge tone="purple">{esReal ? '0 personas' : 'sin leer'}</Badge>}
        >
          <EstadoVacio
            titulo="Su red está en cero"
            texto={`Todavía no trajo a nadie: no hay referidos que hayan pagado ni créditos ganados. El que llega empieza con ${PREMIO} créditos y usted gana los mismos ${PREMIO} cuando paga su primer mes, no antes. Pase su link y el primero que pague le devuelve ${PREMIO}.`}
            accion={link ? 'Copiar mi link' : undefined}
            onAccion={link ? copiar : undefined}
          />
          <div className="acc-why">
            Acá va a aparecer cada persona que traiga, con su estado: <b>si ya pagó, si todavía no</b> y los
            créditos que dejó. Los del segundo nivel —los que traen sus propios invitados— también suman.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Credit size={14} style={{ color: 'var(--green)' }} /> Las reglas, sin letra menuda</span>}
          action={<Badge tone="green">claras</Badge>}
        >
          <div className="guards">
            <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="guard-lb">Se paga cuando el otro paga<small>No cuando se registra. Así nadie infla la red con cuentas vacías.</small></span>
              <span className="guard-val">{PREMIO}</span></div>
            <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="guard-lb">Sin límite de referidos<small>Cuantos más trae, más créditos. No hay techo mensual.</small></span>
              <span className="guard-val">∞</span></div>
            <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="guard-lb">Los créditos no vencen<small>Mientras su plan esté activo, quedan en su saldo y puede juntarlos.</small></span>
              <span className="guard-val">12 meses</span></div>
            <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="guard-lb">El que entra también gana<small>Empieza con {PREMIO} créditos: puede probar el motor sin pagar nada.</small></span>
              <span className="guard-val">{PREMIO}</span></div>
            <div className="guard"><span style={{ color: 'var(--amber)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="guard-lb">Hito de {HITO} referidos<small>Al llegar, se suman {PREMIO_HITO.toLocaleString('es-CO')} créditos extra de una sola vez.</small></span>
              <span className="guard-val" style={{ color: 'var(--amber)' }}>{PREMIO_HITO.toLocaleString('es-CO')}</span></div>
          </div>
          <div className="acc-why">
            Todas las reglas son las mismas para todos y <b>no hay condiciones ocultas</b>:
            si algo cambia, le avisamos antes de que cambie y lo que ya ganó se respeta con las reglas anteriores.
          </div>
        </Card>
      </div>
    </div>
  );
}
