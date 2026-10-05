# =====================================================================================================
# EL BUSCADOR PROFUNDO — el trabajador que el motor llama cuando necesita un estudio de verdad.
#
# POR QUÉ EXISTE (y por qué no reemplaza al rastreo propio)
# El rastreo que hace Rex es liviano: cuatro consultas, los extractos de los resultados, 40 segundos. Alcanza
# para saber de dónde viene la demanda de un negocio global, y así se cargaron los mercados de World Key.
# Esto es otra cosa: un investigador que arma sus propias sub-preguntas, LEE LAS PÁGINAS ENTERAS —no el
# titular— y devuelve un informe largo con citas. Tarda minutos y pesa memoria, así que corre APARTE y A PEDIDO,
# nunca dentro de la corrida de minuto y medio.
#
# CÓMO SE USA
#   /opt/gpt-researcher/.venv/bin/python buscador-profundo.py --pregunta "..." --salida /tmp/informe.json
#   /opt/gpt-researcher/.venv/bin/python buscador-profundo.py --negocio <uuid> --salida ...
#
# QUÉ DEVUELVE
# Un JSON con: la pregunta, el informe en texto, las fuentes (con su título y su enlace) y cuánto tardó. El
# motor guarda eso como el informe del mercado de ese negocio y saca de ahí los países cuando corresponde.
# =====================================================================================================

import argparse
import asyncio
import json
import os
import re
import sys
import time

DIR = "/opt/gpt-researcher"
sys.path.insert(0, DIR)
os.chdir(DIR)

# La configuración vive en el .env del servicio (modelo, buscador, idioma). Se carga antes de importar la
# librería porque ella lee el entorno al armarse.
from dotenv import load_dotenv  # noqa: E402

load_dotenv(os.path.join(DIR, ".env"))

from gpt_researcher import GPTResearcher  # noqa: E402


async def investigar(pregunta: str, tipo: str) -> dict:
    t0 = time.time()
    investigador = GPTResearcher(query=pregunta, report_type=tipo)
    await investigador.conduct_research()
    informe = await investigador.write_report()
    fuentes = []
    try:
        for f in investigador.get_source_urls() or []:
            fuentes.append({"enlace": str(f)})
    except Exception:
        pass
    # El título de cada fuente: la librería lo entrega dentro del contexto, que puede venir como lista de
    # textos (cada uno empieza con "Source: <url>" y su título en una línea aparte). Se leen las dos formas.
    try:
        crudo = getattr(investigador, "context", []) or []
        for c in crudo:
            if isinstance(c, dict):
                url = str(c.get("url") or "")
                for f in fuentes:
                    if f["enlace"] == url:
                        f["titulo"] = str(c.get("title") or "")[:200]
            elif isinstance(c, str):
                enlace = ""
                for linea in c.splitlines()[:6]:
                    if not enlace:
                        m = re.search(r"https?://\S+", linea)
                        if m:
                            enlace = m.group(0).rstrip(").,")
                            continue
                    elif linea.strip() and not linea.lower().startswith(("source", "url")):
                        for f in fuentes:
                            if f["enlace"].rstrip("/") == enlace.rstrip("/"):
                                f["titulo"] = linea.strip()[:200]
                        break
    except Exception:
        pass
    # El nombre de cada fuente: la librería no siempre lo entrega suelto, pero EL INFORME SÍ lo cita, en formato
    # markdown —[Noticias de Emiratos, 2026](https://...)—. Se lee de ahí: es el nombre que el lector va a ver.
    citas = {}
    for nombre_cita, url_cita in re.findall(r"\[([^\]]{2,140})\]\((https?://[^)\s]+)\)", informe):
        citas.setdefault(url_cita.rstrip("/"), nombre_cita.strip())
    for f in fuentes:
        if not f.get("titulo"):
            f["titulo"] = citas.get(f["enlace"].rstrip("/"), "")
    return {
        "pregunta": pregunta,
        "informe": informe,
        "fuentes": fuentes,
        "segundos": round(time.time() - t0, 1),
    }


def pregunta_del_negocio(negocio: dict) -> str:
    """La pregunta que se le hace al investigador cuando el motor no escribió una propia."""
    donde = ", ".join([x for x in [negocio.get("ciudad"), negocio.get("zona")] if x]) or "su ciudad"
    que = negocio.get("rubro") or negocio.get("categoria") or "su negocio"
    return (
        f"¿De dónde vienen los clientes que pagan por {que} en {donde}? "
        "Quiero los mercados emisores y las nacionalidades que compran, con datos publicados "
        "(informes de turismo, estadísticas, noticias de la industria) y de dónde sale el dinero. "
        "Sin estimaciones: sólo lo que esté publicado."
    )


async def principal() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pregunta", default="")
    ap.add_argument("--negocio", default="")
    ap.add_argument("--tipo", default="research_report", help="research_report | deep_research")
    ap.add_argument("--salida", default="/tmp/informe-profundo.json")
    args = ap.parse_args()

    pregunta = args.pregunta.strip()
    if not pregunta and args.negocio:
        negocio = json.loads(os.environ.get("NEGOCIO_JSON", "{}"))
        pregunta = pregunta_del_negocio(negocio)
    if not pregunta:
        print("falta --pregunta o --pregunta con NEGOCIO_JSON", file=sys.stderr)
        return 1

    print(f"[profundo] investigando: {pregunta[:110]}", flush=True)
    resultado = await investigar(pregunta, args.tipo)
    with open(args.salida, "w") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=1)
    print(f"[profundo] listo en {resultado['segundos']} s · {len(resultado['fuentes'])} fuentes · "
          f"{len(resultado['informe'])} caracteres de informe", flush=True)
    print(f"[profundo] guardado en {args.salida}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(principal()))
