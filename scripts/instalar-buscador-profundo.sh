#!/usr/bin/env bash
# =====================================================================================================
# INSTALAR EL BUSCADOR PROFUNDO (gpt-researcher) EN ESTE SERVIDOR
#
# Qué deja: un investigador propio en /opt/gpt-researcher que Lux llama cuando toca un estudio de mercado de
# verdad. Lee las páginas enteras —no los titulares— y devuelve un informe con citas.
#
# Por qué NO usa lo que el proyecto pide por defecto:
#   · Tavily (la búsqueda que trae) es una API paga. Acá se usa DuckDuckGo: MEDIDO en este servidor, la
#     librería pasa el muro anti-robot (un curl directo recibe un 202).
#   · El modelo es DeepSeek (el que ya paga el producto), no OpenAI.
#   · Los embeddings son locales y en CPU: no hay servicio pago ni GPU de por medio. Son 384 dimensiones y
#     ~400 MB de memoria cuando están cargados.
#
# Se puede correr las veces que haga falta: si ya está clonado, actualiza; si ya está el entorno, lo reusa.
# =====================================================================================================
set -euo pipefail

CASA="${CASA:-/opt/gpt-researcher}"
UV="${UV:-/root/.hermes/bin/uv}"
REPO="https://github.com/assafelovic/gpt-researcher.git"
TRABAJADOR="/root/work/sinkroo-a/apps/api/workers/buscador-profundo.py"

echo "=== 1) el código ==="
if [ ! -d "$CASA/.git" ]; then
  mkdir -p "$CASA" && git clone --depth 1 "$REPO" "$CASA"
else
  git -C "$CASA" pull --ff-only || echo "(no se pudo actualizar: se sigue con lo que hay)"
fi

echo "=== 2) el entorno (Python propio, sin tocar el del sistema) ==="
[ -x "$CASA/.venv/bin/python" ] || "$UV" venv "$CASA/.venv" -p python3
"$UV" pip install -q --python "$CASA/.venv/bin/python" "$CASA"

echo "=== 3) la búsqueda y los embeddings ==="
# ddgs es el paquete de DuckDuckGo vigente (el viejo duckduckgo-search cambió de nombre en 2025).
# torch en versión CPU: la de CUDA pesa más de 2 GB y acá no hay GPU para esto.
"$UV" pip install -q --python "$CASA/.venv/bin/python" -U ddgs
"$UV" pip install -q --python "$CASA/.venv/bin/python" --torch-backend cpu langchain-huggingface sentence-transformers

echo "=== 4) la configuración (lee la llave del proyecto, no la copia a mano) ==="
if [ ! -f "$CASA/.env" ]; then
  LLAVE="$(grep -oP 'DEEPSEEK_API_KEY\s*=\s*[\"'\'']?\K[^\"'\''\n ]+' /root/work/sinkroo-a/.env.local || true)"
  if [ -z "$LLAVE" ]; then echo "FALTA la llave DEEPSEEK_API_KEY en /root/work/sinkroo-a/.env.local"; exit 1; fi
  cat > "$CASA/.env" <<EOF
RETRIEVER=duckduckgo
SMART_LLM=openai:deepseek-chat
FAST_LLM=openai:deepseek-chat
STRATEGIC_LLM=openai:deepseek-chat
OPENAI_API_KEY=$LLAVE
OPENAI_BASE_URL=https://api.deepseek.com/v1
EMBEDDING=huggingface:sentence-transformers/all-MiniLM-L6-v2
CONTEXT_FILTER=keyword
LANGUAGE=spanish
REPORT_FORMAT=APA
TOTAL_WORDS=1200
MAX_SEARCH_RESULTS_PER_QUERY=5
MAX_ITERATIONS=2
MAX_SUBTOPICS=3
MEMORY_BACKEND=local
SCRAPER=bs
MAX_SCRAPER_WORKERS=8
TEMPERATURE=0.4
VERBOSE=false
EOF
  chmod 600 "$CASA/.env"
fi

echo "=== 5) la prueba: una investigación corta de verdad ==="
"$CASA/.venv/bin/python" "$TRABAJADOR" \
  --pregunta "¿De dónde vienen los turistas de alto capital en Dubai? Datos publicados." \
  --salida /tmp/prueba-profundo.json
"$CASA/.venv/bin/python" - <<'PY'
import json
d = json.load(open('/tmp/prueba-profundo.json'))
print(f"OK · {d['segundos']} s · {len(d['fuentes'])} fuentes · {len(d['informe'])} caracteres de informe")
PY
echo "=== listo: Lux ya puede llamarlo ==="
