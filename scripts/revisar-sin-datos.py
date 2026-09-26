#!/usr/bin/env python3
"""Los datos del cazador de fantasmas: qué se busca y cómo se juzga.

Lo usa el recorrido que corre en el navegador (`browser_exec`). Acá viven las constantes para que el
recorrido de antes del arreglo y el de después usen EXACTAMENTE la misma vara.

La cuenta de prueba (`vacio@assetium.org`) tiene el motor arrancado —500 agentes del público— y cero
piezas, cero evaluaciones, cero campañas, cero hallazgos y cero conversaciones. Con el back encendido,
en esa cuenta no puede aparecer nada que el negocio no haya producido.
"""

# Lo que NUNCA puede verse en una cuenta que no lo produjo: los nombres propios del ejemplo.
FANTASMAS = [
    'Tienda Norte',            # el competidor inventado de la investigación
    'María Paula',             # la dueña del negocio de ejemplo
    'Skincare Natural',        # el negocio de ejemplo
    'Belleza & Co',            # competidor de ejemplo
    'DermaMarket',             # competidor de ejemplo
    'Antes y después',         # pieza de ejemplo
    'El problema primero',     # pieza de ejemplo
    'El precio sin vueltas',   # pieza de ejemplo
    'El testimonio solo',      # pieza de ejemplo
    'La rutina de 3 pasos',    # pieza de ejemplo
    'Verde salvia',            # color del ejemplo
    '26.716',                  # alcance escrito a mano en los resultados
    '4,3x',                    # retorno escrito a mano
    '8.930',                   # alcance de la pieza de ejemplo
]

PANTALLAS = ['Hoy', 'Campañas', 'Conversaciones', 'Mercado', 'Créditos', 'Referidos',
             'Cuenta y autonomía', 'Primeros pasos', 'Verificación']

# Las sub-pantallas de Campañas: la galería y el motor viven acá, no en el menú de la izquierda.
SUBTABS_CAMPANA = ['Con Sinkroo', 'MiroFish', 'La galería', 'En línea', 'Mis campañas']


def caza(texto: str) -> list:
    """Los fantasmas que aparecen en el texto de una pantalla."""
    t = (texto or '').lower()
    return [f for f in FANTASMAS if f.lower() in t]


def veredicto(textos: dict) -> dict:
    """{pantalla: [fantasmas]} y el total. Sin fantasmas, el panel dice la verdad."""
    hallados = {p: caza(t) for p, t in textos.items()}
    total = sum(len(v) for v in hallados.values())
    return {'por_pantalla': hallados, 'total': total, 'limpio': total == 0,
            'por_pantalla_con_fantasmas': {p: v for p, v in hallados.items() if v}}


# ---------------------------------------------------------------------------------------------
# LA DEMOSTRACIÓN TAMBIÉN VA VACÍA (regla del dueño, 25/09/2026): «vacía la demostración también».
# El recorrido sin back —la cuenta de demostración— se juzga con la MISMA vara: si aparece un nombre
# del ejemplo, no quedó vacía. Se guarda el veredicto aparte para poder comparar los dos.
# ---------------------------------------------------------------------------------------------
def compara(antes: dict, despues: dict) -> dict:
    """Lo que se cerró: fantasmas por pantalla que estaban y ya no."""
    return {
        'antes': antes.get('total', 0),
        'despues': despues.get('total', 0),
        'cerrados': {p: v for p, v in antes.get('por_pantalla_con_fantasmas', {}).items()
                     if p not in despues.get('por_pantalla_con_fantasmas', {})},
        'quedan': despues.get('por_pantalla_con_fantasmas', {}),
    }
