#!/usr/bin/env python3
"""
INVENTARIO DE UNA PRUEBA DE PUNTA A PUÑTA — y la regla que lo gobierna:

    SE LEE LO QUE YA ESTÁ TERMINADO, NUNCA LO QUE VA A MEDIAS.

Una corrida deja trabajo que sigue después de responder: el motor pinta las imágenes mientras
escribe, y el video se monta POR DETRÁS (tarda minutos y no puede colgar la corrida). Si el
inventario se lee apenas vuelve la corrida, dice «sin video» de piezas cuyo video todavía se
está montando: un dato falso, del mismo tipo que decir «no se generó nada».

Por eso este script, después de la corrida, ESPERA: mira cada pieza de video hasta que tenga su
video montado (o hasta el tope de tiempo, y entonces lo dice con nombre propio). Recién ahí
imprime el inventario, y lo que falte lo declara como «no terminó», no como «no se generó».

Uso:
    python3 inventario.py                     # crea la cuenta de pruebas y corre una ronda
    SESION=<token> python3 inventario.py      # usa una cuenta que ya existe
Variables: BASE (por defecto http://127.0.0.1:3010), ESPERA_MAX_S (por defecto 1200).
"""
import json, os, random, string, sys, time, urllib.error, urllib.request

BASE = os.environ.get('BASE', 'http://127.0.0.1:3010')
CORREO = os.environ.get('CORREO', 'mauricio@assetium.org')
ESPERA_MAX_S = int(os.environ.get('ESPERA_MAX_S', '1200'))   # 20 minutos de tope para el montaje
token = os.environ.get('SESION')


def pedir(metodo, ruta, cuerpo=None, esperar=120):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(BASE + ruta, data=datos, method=metodo)
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', 'Bearer ' + token)
    try:
        with urllib.request.urlopen(req, timeout=esperar) as r:
            return r.status, json.loads(r.read().decode() or '{}')
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or '{}')
        except Exception:
            return e.code, {}
    except Exception as e:
        return 'red', {'error': str(e)[:120]}


def es_pieza_de_video(formato: str) -> bool:
    """Video filmado: lo mismo que decide el motor. Un reel de texto lleva tarjetas, no planos."""
    f = (formato or '').lower()
    return 'video' in f and 'texto' not in f


def inventario():
    _, j = pedir('GET', '/api/piezas')
    return j.get('piezas', []) or []


def pendientes(piezas):
    """Lo que el motor sigue haciendo: piezas de video sin video montado y SIN fallo declarado."""
    out = []
    for p in piezas:
        if not es_pieza_de_video(p.get('formato', '')):
            continue
        g = p.get('generacion') or {}
        if not g.get('video_generado') and not g.get('video_error'):
            out.append(p)
    return out


def esperar_lo_que_falta(piezas, tope_s):
    """ESPERA A QUE TERMINE. Devuelve (piezas, dijo_que_faltan) — lo que no terminó se declara."""
    t0 = time.time()
    while True:
        faltan = pendientes(piezas)
        if not faltan:
            return piezas, []
        if time.time() - t0 > tope_s:
            return piezas, [f"{p['formato']} (id {p['id'][:8]})" for p in faltan]
        print(f"  esperando el montaje: faltan {len(faltan)} de {len(piezas)} · "
              f"{int(time.time() - t0)} s · {[p['formato'] for p in faltan]}", flush=True)
        time.sleep(20)
        piezas = inventario()


print('== 1. la cuenta de pruebas ==', flush=True)
if token:
    print('  se usa la sesión que ya existe', flush=True)
else:
    clave = ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(14))
    st, j = pedir('POST', '/api/auth/registro', {'email': CORREO, 'nombre': 'Verysset', 'clave': clave})
    print('  registro:', st, str(j)[:120], flush=True)
    if st != 201:
        sys.exit('no se pudo registrar la cuenta')
    token = j.get('token')
print('  sesión:', 'sí' if token else 'no', flush=True)

print('== 2. el perfil ==', flush=True)
print(' ', pedir('PUT', '/api/onboarding', {'datos': {
    'negocio_nombre': 'Verysset',
    'descripcion': 'Verificacion de activos con gemelos digitales, auditoria en vivo, RWA y tokenizacion de security para empresas y el Estado.',
    'negocio_links': 'https://verysset.com', 'rubro': 'servicios profesionales y consultoria',
    'zona': 'Bogota', 'tono': ['Profesional y formal'], 'canales': ['Facebook', 'Instagram'],
    'negocio_objetivo': 'Que lo conozcan', 'paises': ['Colombia']}})[0], flush=True)

print('== 3. el código de entrada ==', flush=True)
print(' ', pedir('POST', '/api/entrada/codigo', {'codigo': os.environ.get('CODIGO', 'SINKROO-ACTIVO')})[0], flush=True)

print('== 4. arrancar el motor ==', flush=True)
print(' ', pedir('POST', '/api/onboarding/arrancar', {}, esperar=300), flush=True)

print('== 5. la ronda: 5 piezas distintas ==', flush=True)
t0 = time.time()
st, j = pedir('POST', '/api/agentes/correr', {'ronda': True}, esperar=1800)
print(f'  corrida: {st} en {time.time() - t0:.0f} s', flush=True)

print('== 6. esperar a que TODO esté terminado (no se lee a medias) ==', flush=True)
piezas = inventario()
piezas, sin_terminar = esperar_lo_que_falta(piezas, ESPERA_MAX_S)

print(f'== 7. inventario (lo que quedó terminado: {len(piezas)} piezas) ==', flush=True)
for p in piezas:
    g = p.get('generacion') or {}
    img, vid, planos = g.get('imagen_generada') or {}, g.get('video_generado') or {}, g.get('planos') or {}
    fallo, falloImg = g.get('video_error') or {}, g.get('imagen_error') or {}
    print(f"   · {p.get('formato','?'):<34} "
          f"imagen={'sí' if img else ('SIN IMAGEN: ' + str(falloImg.get('motivo','?'))[:70] if falloImg else 'NO')} "
          f"({img.get('fuente','')[:30]}, {img.get('peso','')} b, {img.get('ancho','')}x{img.get('alto','')})  "
          f"video={'sí' if vid else ('FALLÓ: ' + str(fallo.get('motivo','?'))[:60] if fallo else ('NO' if es_pieza_de_video(p.get('formato','')) else '—'))} "
          f"({vid.get('segundos','')} s, {vid.get('peso','')} b, {vid.get('voz','')})  "
          f"planos={'sí' if planos else '—'}", flush=True)
if sin_terminar:
    print(f'  NO TERMINÓ A TIEMPO ({ESPERA_MAX_S} s): ' + ' · '.join(sin_terminar), flush=True)
else:
    print('  todo lo que el motor lanzó quedó terminado', flush=True)
print('INVENTARIO-FIN', flush=True)
