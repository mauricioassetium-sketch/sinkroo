import { Badge, Button, Card } from './ui';
import { EstadoVacio } from './EstadoVacio';
import { I_Lock, I_Mail, I_Shield } from './icons';
import type { Seguridad } from '../lib/seguridad';

// =============================================================================================
// LA TARJETA DE SEGURIDAD DE LA CUENTA — dos filas y nada más: el PIN y el correo.
//
// Las dos dicen el estado REAL que devolvió el back (`GET /api/seguridad/estado`). Aquí no se afirma
// nada de memoria ni se promete un correo que no va a salir: si el servidor no tiene el correo
// configurado, esta tarjeta lo dice con las variables que faltan, en vez de decir «le enviamos un
// correo».
//
// Es una función del estado que le pasan: la pantalla de Cuenta la dibuja con lo que devuelve
// `useSeguridad()`, y así se puede revisar cada caso sin navegador.
// =============================================================================================

export type VistaSeguridad = Pick<
  Seguridad, 'estado' | 'cargando' | 'error' | 'configurarPin' | 'pedirOtroCorreo' | 'pidiendoCorreo' | 'avisoCorreo' | 'refrescar'
>;

export function TarjetaSeguridad({ seg }: { seg: VistaSeguridad }) {
  const e = seg.estado;

  return (
    <Card
      title={<span className="row" style={{ gap: 8 }}><I_Shield size={14} style={{ color: 'var(--purple3)' }} /> Seguridad de la cuenta</span>}
      action={<Badge tone={!e ? 'muted' : e.tiene_pin ? 'green' : 'amber'}>
        {!e ? (seg.cargando ? 'leyendo' : 'sin leer') : e.tiene_pin ? 'con PIN' : 'sin PIN'}
      </Badge>}
    >
      {!e ? (
        /* El back no respondió: se dice eso, y no se inventa un estado. Mientras lee, dice que está leyendo. */
        <EstadoVacio
          {...(seg.cargando
            ? { titulo: 'Leyendo el estado de seguridad del servidor…', texto: 'El panel está preguntando si su negocio tiene PIN y si su correo está confirmado. Mientras lee no afirma nada.' }
            : { titulo: 'No se pudo leer el estado de seguridad', texto: seg.error || 'El estado del PIN y del correo de esta cuenta vive en el servidor. No respondió; vuelva a leerlo y aparece tal como está.' })}
          {...(seg.cargando ? {} : { accion: 'Volver a leer', onAccion: () => seg.refrescar() })} />
      ) : (
        <>
          {/* ---------- FILA 1: EL PIN DE SEGURIDAD ---------- */}
          <div className="guard">
            <I_Lock size={14} style={{ color: 'var(--purple3)', flexShrink: 0 }} />
            <span className="guard-lb">
              PIN de seguridad
              <small>
                {e.tiene_pin
                  ? 'Está puesto: el panel le pide sus seis dígitos antes de desconectar una cuenta o de arrancar el motor.'
                  : 'Todavía no tiene: hoy se puede desconectar una cuenta o arrancar el motor sin que el panel le pida nada.'}
              </small>
            </span>
            <span className="guard-val" style={{ color: e.tiene_pin ? 'var(--green)' : 'var(--amber)' }}>
              {e.tiene_pin ? 'activo' : 'sin crear'}
            </span>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <Button className="btn-sm"
              title={e.tiene_pin
                ? 'Cambia el PIN del negocio: le pide el actual y los seis dígitos nuevos dos veces (POST /api/seguridad/pin con pin_actual).'
                : 'Crea el PIN del negocio: seis dígitos dos veces para confirmar. Desde ahí, las acciones sensibles lo piden (POST /api/seguridad/pin).'}
              onClick={() => seg.configurarPin()}>
              <I_Lock size={13} /> {e.tiene_pin ? 'Cambiar el PIN' : 'Crear el PIN de seis dígitos'}
            </Button>
            {e.tiene_pin && (
              <span className="tiny muted" style={{ alignSelf: 'center' }}>
                {e.bloqueado_hasta
                  ? `Bloqueado por intentos fallidos hasta ${new Date(e.bloqueado_hasta).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}.`
                  : typeof e.intentos_restantes === 'number'
                    ? `Le quedan ${e.intentos_restantes} intento${e.intentos_restantes === 1 ? '' : 's'} antes de que el servidor lo frene.`
                    : ''}
              </span>
            )}
          </div>

          {/* ---------- FILA 2: EL CORREO DE LA CUENTA ---------- */}
          <div className="guard" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <I_Mail size={14} style={{ color: e.correo_configurado ? 'var(--green)' : 'var(--red)', flexShrink: 0 }} />
            <span className="guard-lb">
              Correo de la cuenta
              <small>
                {!e.correo_configurado
                  ? 'El servidor todavía no tiene configurado el correo, así que no sale ningún correo: ni el de bienvenida ni el de confirmación de la dirección.'
                  : e.correo_verificado
                    ? 'Su dirección quedó confirmada: el motor puede avisarle por correo.'
                    : 'Su dirección todavía no está confirmada. Mientras no lo esté, el panel se lo recuerda acá.'}
              </small>
            </span>
            <span className="guard-val" style={{ color: !e.correo_configurado ? 'var(--red)' : e.correo_verificado ? 'var(--green)' : 'var(--amber)' }}>
              {!e.correo_configurado ? 'no configurado' : e.correo_verificado ? 'verificado' : 'sin verificar'}
            </span>
          </div>

          {!e.correo_configurado && (
            <>
              <div className="bs" style={{ marginTop: 10 }}>
                Mientras falte, este panel no le promete ningún correo: no hay por dónde mandarlo. Su cuenta
                funciona igual — el correo hace falta para confirmar la dirección y para los avisos.
              </div>
              {e.falta?.length > 0 && (
                <div className="row" style={{ gap: 7, marginTop: 9, flexWrap: 'wrap' }}>
                  {e.falta.map(v => <span key={v} className="badge badge-muted" style={{ fontSize: 9.5 }}>{v}</span>)}
                </div>
              )}
            </>
          )}

          {e.correo_configurado && !e.correo_verificado && (
            <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <Button className="btn-sm" disabled={seg.pidiendoCorreo}
                title="Vuelve a pedir el correo de confirmación para la dirección de la cuenta (POST /api/auth/verificar/reenviar)."
                onClick={() => seg.pedirOtroCorreo()}>
                <I_Mail size={13} /> {seg.pidiendoCorreo ? 'Pidiendo…' : 'Pedir otro correo'}
              </Button>
            </div>
          )}

          {seg.avisoCorreo && (
            <div className="tiny" style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginTop: 9, color: 'var(--muted2)', fontWeight: 700 }}>
              <I_Shield size={13} style={{ flexShrink: 0, marginTop: 2 }} /> {seg.avisoCorreo}
            </div>
          )}

          <div className="acc-why">
            <b>De dónde sale esto:</b> del estado que guarda el servidor, no de esta visita. El PIN se pide en
            las acciones que tocan algo de verdad y el token de la confirmación del correo caduca: por eso
            vencido se puede pedir otro sin perder nada.
          </div>
        </>
      )}
    </Card>
  );
}
