import type { FastifyReply, FastifyRequest } from 'fastify';

// =============================================================================================
// LAS PÁGINAS DE LOS ENLACES DEL CORREO — lo que ve quien abre el enlace.
// =============================================================================================
//
// POR QUÉ EXISTEN
//   Los enlaces de los correos los abre una persona en el navegador, no el panel. Si la respuesta fuera
//   sólo JSON, el negocio vería llaves y comillas y no sabría si su correo quedó confirmado. Acá se
//   responde una página sencilla cuando quien pide es un navegador (manda «Accept: text/html») y el mismo
//   cuerpo en JSON cuando quien pide es un cliente de API o el panel. Una sola ruta, dos lectores.
//
// SIN ADORNOS Y SIN RASTREADORES
//   Ni imágenes remotas, ni fuentes de afuera, ni analítica: es HTML plano con los estilos pegados, para
//   que el enlace funcione igual en un celular sin datos. El token viaja sólo en la dirección.
// =============================================================================================

/** ¿Quien pide es un navegador esperando una página? */
export function quiereHtml(req: FastifyRequest): boolean {
  return String(req.headers.accept || '').includes('text/html');
}

const escapar = (t: string) =>
  String(t ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * La página del enlace. `formulario` agrega el campo del PIN nuevo con su botón (es la pantalla de
 * restablecer el PIN, que no tiene panel todavía): el formulario manda el token y el PIN nuevo a la
 * misma dirección, por POST.
 */
export function paginaDeEnlace(d: {
  titulo: string;
  mensaje: string;
  detalle?: string;
  enlace?: { texto: string; url: string };
  formulario?: { token: string };
}): string {
  const boton = d.enlace
    ? `<p style="margin:20px 0 0"><a href="${escapar(d.enlace.url)}" style="display:inline-block;background:#111114;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:bold">${escapar(d.enlace.texto)}</a></p>`
    : '';
  const detalle = d.detalle ? `<p style="margin:0 0 14px;color:#6b6b70;font-size:14px">${escapar(d.detalle)}</p>` : '';
  const form = d.formulario
    ? `<form id="pin" style="margin:22px 0 0">
         <label for="v" style="display:block;margin-bottom:6px;font-weight:bold">PIN nuevo (6 dígitos)</label>
         <input id="v" inputmode="numeric" autocomplete="off" maxlength="6" required
                style="width:100%;box-sizing:border-box;padding:11px;border:1px solid #c9c9cf;border-radius:8px;font-size:16px">
         <input id="t" type="hidden" value="${escapar(d.formulario.token)}">
         <button type="submit" style="margin-top:12px;background:#111114;color:#fff;border:0;padding:11px 18px;border-radius:8px;font-weight:bold">Guardar el PIN nuevo</button>
         <p id="m" style="margin:14px 0 0;font-size:14px"></p>
       </form>
       <script>
         (function () {
           // El token se lee de un campo escondido, no de un texto metido dentro del script: así el valor
           // queda dentro de un atributo bien escapado y no puede romper el script ni inyectar HTML.
           var f = document.getElementById('pin');
           f.addEventListener('submit', function (e) {
             e.preventDefault();
             var m = document.getElementById('m');
             m.textContent = 'Guardando…';
             fetch(location.pathname, {
               method: 'POST',
               headers: { 'content-type': 'application/json' },
               body: JSON.stringify({ token: document.getElementById('t').value, pin: document.getElementById('v').value })
             }).then(function (r) { return r.json().then(function (c) { return { ok: r.ok, c: c }; }); })
               .then(function (r) { m.textContent = r.c.detalle || r.c.error || (r.ok ? 'listo' : 'no se pudo'); })
               .catch(function () { m.textContent = 'no se pudo hablar con el servidor: intente otra vez'; });
           });
         })();
       </script>`
    : '';

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex">
    <title>${escapar(d.titulo)} · Sinkroo</title>
  </head>
  <body style="margin:0;padding:24px;background:#f6f6f7;font-family:Arial,Helvetica,sans-serif;color:#1c1c1e">
    <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e3e3e6;border-radius:12px;padding:28px">
      <h1 style="margin:0 0 14px;font-size:19px">${escapar(d.titulo)}</h1>
      <p style="margin:0 0 14px;line-height:1.5">${escapar(d.mensaje)}</p>
      ${detalle}
      ${form}
      ${boton}
      <hr style="border:none;border-top:1px solid #e3e3e6;margin:22px 0 14px">
      <p style="margin:0;font-size:12px;color:#6b6b70">Sinkroo · pre-validación de anuncios con agentes</p>
    </div>
  </body>
</html>`;
}

/**
 * Responde el enlace: página si es un navegador, JSON si es la API. `estado` es el código HTTP.
 */
export function responderEnlace(
  req: FastifyRequest,
  reply: FastifyReply,
  d: { estado: number; json: Record<string, unknown>; titulo: string; mensaje: string; detalle?: string; enlace?: { texto: string; url: string }; formulario?: { token: string } },
) {
  if (quiereHtml(req)) {
    return reply.status(d.estado).type('text/html; charset=utf-8').send(paginaDeEnlace(d));
  }
  return reply.status(d.estado).send(d.json);
}
