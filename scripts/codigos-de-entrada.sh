#!/usr/bin/env bash
# =============================================================================================
# CÓDIGOS DE ENTRADA — el script del dueño.
#
#   bash scripts/codigos-de-entrada.sh crear "<nota>" [usos_max]
#   bash scripts/codigos-de-entrada.sh listar
#   bash scripts/codigos-de-entrada.sh revocar "<codigo>"
#
# Crea, lista y revoca los códigos con los que un negocio entra al producto. El código se dicta por
# fuera (WhatsApp, teléfono), así que es corto, en mayúsculas y sin caracteres que se confundan al
# leerlos: nada de O con 0 ni de I/L con 1.
#
# Los datos de la base salen de `.env.local` (la clave `DATABASE_URL`) si está; si no, se usan los de
# desarrollo. NUNCA se conecta sola a producción: si apunta a otra base, es porque el archivo lo dice.
# =============================================================================================
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ------------------------------- Con qué base se habla -------------------------------
# Se busca el .env.local en las dos partes donde puede estar (la raíz del repo y apps/api).
ENTORNO=""
for candidato in "$RAIZ/.env.local" "$RAIZ/apps/api/.env.local"; do
  if [ -f "$candidato" ]; then ENTORNO="$candidato"; break; fi
done

URL_BASE=""
if [ -n "${DATABASE_URL:-}" ]; then
  # Lo que venga en el entorno manda: sirve para apuntar a una base de pruebas sin tocar el archivo.
  URL_BASE="$DATABASE_URL"
  ORIGEN_CLAVE="la variable de entorno DATABASE_URL"
fi
if [ -z "$URL_BASE" ] && [ -n "$ENTORNO" ]; then
  # Se lee la línea DATABASE_URL a mano: el archivo tiene claves con caracteres que `source` rompería.
  LINEA="$(grep -E '^[[:space:]]*(export[[:space:]]+)?DATABASE_URL=' "$ENTORNO" | tail -1 || true)"
  if [ -n "$LINEA" ]; then
    URL_BASE="${LINEA#*=}"
    URL_BASE="$(printf '%s' "$URL_BASE" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
  fi
fi
if [ -z "$URL_BASE" ]; then
  URL_BASE="postgres://sinkroo:sinkroo@127.0.0.1:5432/sinkroo"
  ORIGEN_CLAVE="los datos de desarrollo (no hay DATABASE_URL en .env.local)"
elif [ -z "${ORIGEN_CLAVE:-}" ]; then
  # Llegó del archivo, no del entorno.
  ORIGEN_CLAVE=".env.local ($ENTORNO)"
fi

# Sin la clave para que no quede en pantalla ni en el historial.
DONDE="$(printf '%s' "$URL_BASE" | sed 's#//[^@/]*@#//#')"

# psql sin adornos: sólo el dato, y cortando al primer error.
psql_de() { psql "$URL_BASE" -v ON_ERROR_STOP=1 -q -A -t "$@"; }

# ------------------------------- Cómo se ve por pantalla -------------------------------
AZUL=$'\033[1;34m'; VERDE=$'\033[1;32m'; ROJO=$'\033[1;31m'; GRIS=$'\033[0;90m'; FIN=$'\033[0m'
if [ ! -t 1 ]; then AZUL=""; VERDE=""; ROJO=""; GRIS=""; FIN=""; fi

morir() { printf '%s%s%s\n' "$ROJO" "$1" "$FIN" >&2; exit 1; }

# Un código nuevo: 8 caracteres al azar de un alfabeto sin letras ni números que se confundan.
# El `|| true` es por el corte del tubo: cuando `head` ya tiene los 8, `tr` se queda sin lector y el
# shell lo da por error; sin esto el script se detendría aquí mismo.
generar_codigo() {
  local alfabeto="23456789ABCDEFGHJKMNPQRSTUVWXYZ" cuerpo
  cuerpo="$(LC_ALL=C tr -dc "$alfabeto" < /dev/urandom 2>/dev/null | head -c 8 || true)"
  printf 'SINK-%s-%s' "${cuerpo:0:4}" "${cuerpo:4:4}"
}

# El código se guarda y se compara en MAYÚSCULAS y sin espacios: es lo que llega copiado del chat.
normalizar_codigo() { printf '%s' "$1" | tr -d '[:space:]' | tr '[:lower:]' '[:upper:]'; }

# Una nota puede traer comillas o apóstrofes («Cliente de O'Brien»). Duplicar la comilla simple es la
# forma de meterla dentro de un texto SQL: la sentencia no se rompe y no se puede inyectar nada.
escapa_sql() { printf '%s' "$1" | sed "s/'/''/g"; }

COMANDO="${1:-}"

# Antes de tocar nada: ¿se puede hablar con esa base y existe la tabla? Si no, se dice qué falta, en vez
# de dejar salir un error crudo de psql.
case "$COMANDO" in
  crear|listar|revocar)
    if ! psql_de -c 'SELECT 1;' >/dev/null 2>&1; then
      morir "No se pudo hablar con la base de datos ($DONDE, clave: $ORIGEN_CLAVE). Revise que Postgres esté arriba y que la conexión esté bien escrita."
    fi
    if [ "$(psql_de -c "SELECT coalesce(to_regclass('public.codigos_entrada')::text, '');")" = "" ]; then
      morir "La tabla de códigos todavía no existe en esa base ($DONDE). La crea el propio back al arrancar: levante el back una vez y vuelva a intentarlo."
    fi
    ;;
esac

case "$COMANDO" in
  crear)
    NOTA="${2:-}"
    USOS="${3:-1}"
    [ -n "$NOTA" ] || morir "Falta la nota. Dígame para quién es el código: bash scripts/codigos-de-entrada.sh crear \"Skincare Natural · Ana\""
    case "$USOS" in ''|*[!0-9]*) morir "Los usos tienen que ser un número entero (por ejemplo 1).";; esac
    [ "$USOS" -ge 1 ] || morir "Los usos tienen que ser 1 o más."

    # Si el código sorteado ya existía, la clave primaria no deja repetirlo y se sortea otro.
    NOTA_SQL="$(escapa_sql "$NOTA")"
    CODIGO=""; INTENTO=0
    while [ "$INTENTO" -lt 10 ]; do
      CANDIDATO="$(generar_codigo)"
      INSERTADO="$(psql_de -c "INSERT INTO codigos_entrada (codigo, nota, usos_max) VALUES ('$CANDIDATO', '$NOTA_SQL', $USOS) ON CONFLICT (codigo) DO NOTHING RETURNING codigo;")"
      if [ -n "$INSERTADO" ]; then CODIGO="$INSERTADO"; break; fi
      INTENTO=$((INTENTO + 1))
    done
    [ -n "$CODIGO" ] || morir "No se pudo crear el código: la base no respondió o el código se repitió diez veces seguidas."

    printf '\n%s╔══════════════════════════════════════════════════╗%s\n' "$VERDE" "$FIN"
    printf '%s║           CÓDIGO DE ENTRADA NUEVO                ║%s\n' "$VERDE" "$FIN"
    printf '%s╚══════════════════════════════════════════════════╝%s\n\n' "$VERDE" "$FIN"
    printf '   %sCÓDIGO:  %s%s%s\n' "$AZUL" "$VERDE" "$CODIGO" "$FIN"
    printf '   %sNota:    %s\n' "$AZUL" "$NOTA"
    if [ "$USOS" = "1" ]; then
      printf '   %sSirve:   %s1 vez%s\n' "$AZUL" "$VERDE" "$FIN"
    else
      printf '   %sSirve:   %s%s veces%s\n' "$AZUL" "$VERDE" "$USOS" "$FIN"
    fi
    printf '\n   %sDíctele ese código al negocio: lo escribe en «Código de entrada» y queda registrado.%s\n' "$GRIS" "$FIN"
    printf '   %sQueda anotado con su nota, y cuando lo use aquí se ve como usado.%s\n' "$GRIS" "$FIN"
    printf '   %sBase: %s (%s)%s\n\n' "$GRIS" "$DONDE" "$ORIGEN_CLAVE" "$FIN"
    ;;

  listar)
    TOTAL="$(psql_de -c "SELECT count(*)::text FROM codigos_entrada;")"
    if [ "$TOTAL" = "0" ]; then
      printf '\n%sTodavía no hay códigos de entrada en %s.%s\n' "$AZUL" "$DONDE" "$FIN"
      printf '%sCree uno con: bash scripts/codigos-de-entrada.sh crear "<nota>" [usos_max]%s\n\n' "$GRIS" "$FIN"
      exit 0
    fi

    printf '\n%sCÓDIGOS DE ENTRADA (%s en total, en %s)%s\n\n' "$AZUL" "$TOTAL" "$DONDE" "$FIN"
    printf '%s%-19s %-7s %-12s %-17s %s%s\n' "$GRIS" "CÓDIGO" "USOS" "ESTADO" "CREADO" "NOTA Y QUIÉN ENTRÓ" "$FIN"
    printf '%s%s%s\n' "$GRIS" "------------------------------------------------------------------------------------------------------" "$FIN"

    psql_de -F '|' -c "
      SELECT
        c.codigo,
        c.usos::text || '/' || c.usos_max::text,
        CASE WHEN c.usos = 0 THEN 'sin usar'
             WHEN c.usos < c.usos_max THEN 'medio usado'
             ELSE 'ya usado' END,
        to_char(c.creado_at, 'YYYY-MM-DD HH24:MI'),
        c.nota || CASE WHEN coalesce(n.nombres, '') = '' THEN '' ELSE '  ·  entró: ' || n.nombres END
      FROM codigos_entrada c
      LEFT JOIN (
        SELECT x.codigo, string_agg(b.name, ', ' ORDER BY x.usado_at) AS nombres
          FROM codigos_entrada_usos x
          JOIN businesses b ON b.id = x.business_id
         GROUP BY x.codigo
      ) n ON n.codigo = c.codigo
      ORDER BY c.creado_at DESC;" \
      | while IFS='|' read -r cod usos estado creado resto; do
          printf '%-19s %-7s %-12s %-17s %s\n' "$cod" "$usos" "$estado" "$creado" "$resto"
        done
    printf '\n%sRevocar uno: bash scripts/codigos-de-entrada.sh revocar "<codigo>"%s\n\n' "$GRIS" "$FIN"
    ;;

  revocar)
    [ -n "${2:-}" ] || morir "Falta el código. Dígame cuál: bash scripts/codigos-de-entrada.sh revocar \"SINK-4F7A-2C91\""
    CODIGO="$(normalizar_codigo "$2")"
    USADO_POR="$(psql_de -c "SELECT coalesce(string_agg(b.name, ', '), '') FROM codigos_entrada_usos x JOIN businesses b ON b.id = x.business_id WHERE x.codigo = '$CODIGO';")"
    BORRADO="$(psql_de -c "DELETE FROM codigos_entrada WHERE codigo = '$CODIGO' RETURNING codigo;")"
    if [ -z "$BORRADO" ]; then
      printf '\n%sEse código no existe: %s%s\n' "$ROJO" "$CODIGO" "$FIN"
      printf '%sLos códigos se escriben en mayúsculas y con guiones (SINK-4F7A-2C91). Vea cuáles hay con:%s\n' "$GRIS" "$FIN"
      printf '%s   bash scripts/codigos-de-entrada.sh listar%s\n\n' "$GRIS" "$FIN"
      exit 1
    fi
    printf '\n%sCódigo revocado: %s%s\n' "$VERDE" "$CODIGO" "$FIN"
    if [ -n "$USADO_POR" ]; then
      printf '%sYa había entrado con él: %s%s\n' "$GRIS" "$USADO_POR" "$FIN"
      printf '%sSu cuenta y su negocio quedan intactos, pero en el panel dejan de figurar como registrados%s\n' "$GRIS" "$FIN"
      printf '%s(ese estado se apoya en el código, y el código ya no está).%s\n' "$GRIS" "$FIN"
    else
      printf '%sNo lo había usado nadie: con ese código ya no entra ningún negocio.%s\n' "$GRIS" "$FIN"
    fi
    printf '\n'
    ;;

  *)
    printf '\n%sCÓDIGOS DE ENTRADA — qué se puede hacer%s\n\n' "$AZUL" "$FIN"
    printf '  %screar%s   "<nota>" [usos_max]   Crea un código y lo muestra.\n' "$VERDE" "$FIN"
    printf '  %slistar%s                        Muestra los códigos, sus usos y quién entró.\n' "$VERDE" "$FIN"
    printf '  %srevocar%s "<codigo>"            Borra un código.\n\n' "$VERDE" "$FIN"
    printf '  Ejemplos:\n'
    printf '%s    bash scripts/codigos-de-entrada.sh crear "Skincare Natural · Ana"\n' "$GRIS"
    printf '    bash scripts/codigos-de-entrada.sh crear "Feria de belleza" 5\n'
    printf '    bash scripts/codigos-de-entrada.sh listar\n'
    printf '    bash scripts/codigos-de-entrada.sh revocar "SINK-4F7A-2C91"%s\n\n' "$FIN"
    printf '  %sBase de datos: %s — clave: %s%s\n\n' "$GRIS" "$DONDE" "$ORIGEN_CLAVE" "$FIN"
    if [ -n "$COMANDO" ]; then exit 1; fi
    exit 0
    ;;
esac
