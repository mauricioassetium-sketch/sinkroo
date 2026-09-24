# 08 · Sinkroo Creadores — la otra piel del mismo motor

> Modelo de producto v2.0 (documento del dueño, 24/09/2026): «Creadores deja de ser otro producto:
> es **la misma máquina, otra piel**». Este archivo registra cómo quedó implementado en el Centro de
> Mando v2, qué está cubierto y qué falta. Fuente: `modelo-de-producto (2).pdf` + `src/data/creador.ts`.

---

## 1 · La decisión central

El motor no se toca: **los 6 agentes** (Lux, Rex, Nia, Kai, Sol, Rumi) conservan nombre, color y rol
técnico. Cambia **qué miran y qué producen**, y eso sale de la **Ficha del creador**. Tampoco se
duplican las piezas del sistema: el dial de autonomía por acción, los guardrails, el panel de 5, el
sistema de créditos con días de autonomía, la vigilancia cada 15 minutos y las vistas del Centro de
Mando son **los mismos**; se re-etiquetan y se recalibran sus valores.

Implementado así: `src/data/creador.ts` es **data, no código nuevo** (la piel se cambia ahí), y el
panel tiene un interruptor **Negocio / Creador** en el menú que escribe el mismo dato que el
onboarding (`useOnboarding().tipo`). Cada piel guarda su propio avance del onboarding.

## 2 · Qué cambia, en una tabla

| Pieza del motor | En Negocios | En Creadores | Estado |
|---|---|---|---|
| 6 agentes | mercado, estrategia, piezas, pauta, resultados, cierre | vigía del nicho, estratega del perfil, creativo, guardián del presupuesto, analista, closer de marcas | ✅ en `AGENTES_CREADOR` y en Hoy |
| Dial de autonomía | por acción, sobre campañas | por acción, sobre piezas, pitches y DMs (7 acciones) | ✅ data + vista de Cuenta |
| Guardrails | gasto de pauta, KYC, no molestar | créditos (300/día), deals, horario de marcas (22–8) | ✅ data + vista de Cuenta |
| Panel de 5 | puntúa campañas y avisos | puntúa hooks, guiones y pitches; la pieza rechazada **no se cobra** | ✅ data + Contenido/Créditos |
| Créditos | Plan Pro 5.000/mes | Bienvenida 100 · Creador $29/1.500 · Pro $59/4.000 · Top-up $10/1.000 | ✅ data + vista de Créditos |
| Piezas | anuncio, feed, historia, mensaje | post, historias, pauta, pitch, entregable UGC, remaster 4K | ✅ `PIEZAS_CREADOR` |
| Objetivos | ventas y leads | deals, lanzamiento propio, colaboraciones, fechas, tráfico, comunidad | ✅ `OBJETIVOS_CREADOR` |
| Vistas | Hoy, Campañas, Conversaciones, Mercado… | Hoy, **Contenido, Mensajes, Nicho**… | ✅ menú y títulos |
| Recursos | 7 tipos de material del negocio | material del creador (piezas, comentarios de fans, estilo, rates) | 🟡 el onboarding ya sube archivos; falta la re-etiqueta en el panel de material |
| Vigilancia 15 min | campañas, métricas, chats | nicho, métricas del creador, DMs | ✅ en el ritmo de la semana y el nicho |

## 3 · Los cinco perfiles y los dos carriles

Una sola pregunta decide todo: **¿ganás por tu audiencia o por tu trabajo?** Los cinco perfiles
(creador de contenido, influencer, UGC, especialista, local/nicho) están en `PERFILES_CREADOR` con
sus señales de clasificación, y el carril define la promesa, lo que el equipo hace y las métricas:
**audiencia** (seguidores, interacción, alcance) o **trabajo** (pitches, respuesta, deals, ticket).

La demostración está cargada con una **creadora UGC** (Camila Ferreyra, carril trabajo): es el carril
que el documento recomienda arrancar primero porque «reusa a Rumi tal cual y es el que factura».

## 4 · Lo que ya está en el panel (v2)

- **Hoy (creador)**: las decisiones que esperan el OK con su motivo, la bitácora reversible, los
  4 principios de comportamiento del equipo, el pipeline de 7 etapas con las marcas reales, el equipo
  calibrado, el ritmo lunes/viernes y las 4 funciones transversales.
- **Menú y títulos** re-etiquetados, con el interruptor de piel.
- **Contenido, Mensajes, Nicho, Créditos y Cuenta** con la piel de creador (vistas dedicadas).

## 5 · Lo que falta (y por qué se dejó para después)

1. **Onboarding del creador según §4**: el documento pide 8–10 minutos conversacionales con pantalla 0
   de bienvenida, **la pregunta raíz** (¿audiencia o trabajo?), el nicho, el estado real + el link del
   perfil, la bifurcación por carril, el tiempo y los tabúes, **el espejo** (confirmación con la
   lectura real del perfil) y el cierre con **100 créditos de regalo** y los 6 agentes configurados.
   Hoy el camino de creador son 5 pasos de datos; falta la conversación, el espejo y el regalo.
2. **Modo nota de voz**: el documento lo pone como función transversal; el onboarding de hoy es sólo
   texto y archivos.
3. **Material del creador re-etiquetado** en el panel (piezas/comentarios de fans/estilo/rates) —
   el onboarding ya sube archivos, pero la carpeta del panel sigue con las etiquetas de negocio.
4. **Modelo comercial (§14)**: el argumento «un deal paga el plan» y la comisión por deal del Pro no
   están visibles en la vista de Créditos.
5. **Métricas de éxito (§15)** y **fases de construcción (§16, F1–F4)**: son de gestión interna, no del
   panel del creador. Se registran acá: F1 piel (config, sin código) → F2 piloto con 3–5 creadores →
   F3 publicación con Postiz → F4 cazador pleno.
6. **⚠️ Aviso legal del documento**: el motor de publicación del carril audiencia (Postiz, AGPL)
   **necesita resolver la licencia antes de ofrecerse como servicio pago**. El carril trabajo no
   depende de Postiz y puede lanzarse antes.
