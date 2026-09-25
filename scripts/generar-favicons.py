#!/usr/bin/env python3
"""Genera el juego de favicons (el icono de la pestaña) a partir del logo en SVG del panel.

CÓMO SE USA (sólo hace falta si el logo cambia):
    python3 scripts/generar-favicons.py
y después se reemplazan los archivos de apps/dashboard-v2/public/ con los que quedan en la carpeta de
salida. Necesita Pillow (viene con el entorno de Hermes).

El SVG usa sólo M, C, V, H y Z, así que se puede rasterizar sin herramientas externas: se aplana cada
curva a una polilínea, se dibuja a 8x y se reduce (eso da el suavizado de bordes), y las dos figuras se
combinan con la multiplicación que pide el SVG (`mix-blend-mode: multiply`).
"""
import re
from pathlib import Path
from PIL import Image, ImageDraw

SVG = Path(__file__).resolve().parent.parent / 'apps/dashboard-v2/public/favicon.svg'
SALIDA = Path(__file__).resolve().parent / 'favicons-generados'
AZUL = (0x5D, 0x87, 0xFF)   # figura de abajo
CELESTE = (0x49, 0xBE, 0xFF)  # figura de arriba (se multiplica con la otra)
LADO = 32  # el viewBox del SVG
SUPER = 8  # cuántas veces más grande se dibuja antes de reducir
PASOS = 40  # segmentos por curva


def numeros(texto):
    return [float(x) for x in re.findall(r'[-+]?(?:\d+\.?\d*|\.\d+)', texto)]


def curvas(d):
    """Devuelve una lista de subcaminos, cada uno una lista de puntos (x, y)."""
    subcaminos, actual, punto, inicio = [], [], None, None
    for comando, argumentos in re.findall(r'([MmCcHhVvZz])([^MmCcHhVvZz]*)', d):
        ns = numeros(argumentos)
        if comando == 'M':
            if actual:
                subcaminos.append(actual)
            punto = (ns[0], ns[1]); inicio = punto; actual = [punto]
        elif comando == 'C':
            x1, y1, x2, y2, x, y = ns[:6]
            for i in range(1, PASOS + 1):
                t = i / PASOS
                u = 1 - t
                bx = u**3 * punto[0] + 3 * u**2 * t * x1 + 3 * u * t**2 * x2 + t**3 * x
                by = u**3 * punto[1] + 3 * u**2 * t * y1 + 3 * u * t**2 * y2 + t**3 * y
                actual.append((bx, by))
            punto = (x, y)
        elif comando == 'V':
            punto = (punto[0], ns[0]); actual.append(punto)
        elif comando == 'H':
            punto = (ns[0], punto[1]); actual.append(punto)
        elif comando in 'Zz':
            if inicio:
                actual.append(inicio)
    if actual:
        subcaminos.append(actual)
    return subcaminos


def mascara(subcaminos, lado):
    """Cobertura (0..255) de una figura, dibujada grande y reducida para suavizar los bordes."""
    grande = lado * SUPER
    img = Image.new('L', (grande, grande), 0)
    dibujo = ImageDraw.Draw(img)
    escala = grande / LADO
    for camino in subcaminos:
        if len(camino) >= 3:
            dibujo.polygon([(x * escala, y * escala) for x, y in camino], fill=255)
    return img.resize((lado, lado), Image.LANCZOS)


def icono(lado):
    texto = SVG.read_text()
    trazados = [curvas(m) for m in re.findall(r'd="([^"]+)"', texto)]
    figuras = [mascara(t, lado) for t in trazados]
    colores = [AZUL, CELESTE][:len(figuras)]

    # Se combinan a mano porque el SVG pide multiplicar la segunda figura sobre la primera.
    salida = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
    pxf, pxm = salida.load(), [f.load() for f in figuras]
    for y in range(lado):
        for x in range(lado):
            coberturas = [m[x, y] / 255 for m in pxm]
            a1 = coberturas[0]
            a2 = coberturas[1] if len(coberturas) > 1 else 0.0
            alfa = a1 + a2 - a1 * a2
            if alfa <= 0.001:
                continue
            c1, c2 = colores[0], colores[1] if len(colores) > 1 else colores[0]
            multiplicado = tuple(x * y / 255 for x, y in zip(c1, c2))
            r = (c1[0] * a1 * (1 - a2) + c2[0] * a2 * (1 - a1) + multiplicado[0] * a1 * a2) / alfa
            g = (c1[1] * a1 * (1 - a2) + c2[1] * a2 * (1 - a1) + multiplicado[1] * a1 * a2) / alfa
            b = (c1[2] * a1 * (1 - a2) + c2[2] * a2 * (1 - a1) + multiplicado[2] * a1 * a2) / alfa
            pxf[x, y] = (round(r), round(g), round(b), round(alfa * 255))
    return salida


SALIDA.mkdir(parents=True, exist_ok=True)
hechos = {}
for lado in (16, 32, 48, 96, 180, 192, 512):
    im = icono(lado)
    im.save(SALIDA / f'icono-{lado}.png')
    hechos[lado] = im
    print(f'{lado}x{lado} listo')

# El .ico con los tres tamaños clásicos dentro del mismo archivo.
hechos[48].save(SALIDA / 'favicon.ico', format='ICO',
                sizes=[(16, 16), (32, 32), (48, 48)])
print('favicon.ico listo')
print('archivos:', sorted(p.name for p in SALIDA.iterdir()))
