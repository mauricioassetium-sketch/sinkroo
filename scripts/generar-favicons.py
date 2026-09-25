#!/usr/bin/env python3
"""Genera el juego de favicons (el icono de la pestaña) a partir del LOGO de Sinkroo.

El logo es `apps/dashboard-v2/public/67.png`: el búho morado con las cejas y el pico plateados, el mismo
que el panel muestra en la pantalla (`SinkrooMark`). Viene con fondo transparente y con márgenes vacíos
alrededor, así que acá se recorta el margen, se centra en un cuadrado con un respiro parejo y se sacan
todos los tamaños.

CÓMO SE USA (sólo hace falta si el logo cambia):
    python3 scripts/generar-favicons.py
y después se copian los archivos que quedan en `scripts/favicons-generados/` a
`apps/dashboard-v2/public/`. Necesita Pillow (viene con el entorno de Hermes).

POR QUÉ SE REDUCE PASO A PASO
    Bajar de 405 a 16 de una sola vez deja los bordes sucios. Se reduce a la mitad varias veces
    (405 → 202 → 101 → 50 → 25 → 16), que es lo que hace el ojo al mirar de lejos: así el búho se
    entiende hasta en el tamaño más chico.
"""
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
LOGO = RAIZ / 'apps/dashboard-v2/public/67.png'
SALIDA = Path(__file__).resolve().parent / 'favicons-generados'
RESPIRO = 0.05              # aire alrededor del búho, en tanto por uno del lado
FONDO_IOS = (0, 0, 0, 255)  # el fondo real del panel (iOS no respeta la transparencia)


def cuadrado_del_logo():
    """El búho, recortado del margen vacío y centrado en un cuadrado con respiro."""
    logo = Image.open(LOGO).convert('RGBA')
    caja = logo.getbbox()
    buho = logo.crop(caja) if caja else logo
    lado = round(max(buho.size) * (1 + RESPIRO * 2))
    lienzo = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
    lienzo.paste(buho, ((lado - buho.width) // 2, (lado - buho.height) // 2), buho)
    return lienzo


def reducir(imagen, lado):
    """Reduce a la mitad hasta quedar cerca del tamaño pedido y ahí cierra el ajuste."""
    copia = imagen
    while copia.width // 2 >= lado:
        copia = copia.resize((copia.width // 2, copia.height // 2), Image.LANCZOS)
    if copia.width != lado:
        copia = copia.resize((lado, lado), Image.LANCZOS)
    return copia


SALIDA.mkdir(parents=True, exist_ok=True)
maestro = cuadrado_del_logo()
print(f'logo recortado y centrado: {maestro.size[0]}x{maestro.size[1]}')

hechos = {}
for lado in (16, 32, 48, 96, 180, 512):
    im = reducir(maestro, lado)
    im.save(SALIDA / f'icono-{lado}.png')
    hechos[lado] = im
    print(f'{lado}x{lado} listo')

# Para iOS, sobre el fondo del panel: iOS no respeta la transparencia y la deja negra igual, así que se
# pone a propósito (y así el icono se ve igual en todos los teléfonos).
ios = Image.new('RGBA', hechos[180].size, FONDO_IOS)
ios.alpha_composite(hechos[180])
ios.convert('RGB').save(SALIDA / 'apple-touch-icon.png')
print('apple-touch-icon.png listo (180x180, sobre el fondo del panel)')

# El .ico con los tres tamaños clásicos dentro del mismo archivo.
hechos[48].save(SALIDA / 'favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
print('favicon.ico listo')
print('archivos:', sorted(p.name for p in SALIDA.iterdir()))
