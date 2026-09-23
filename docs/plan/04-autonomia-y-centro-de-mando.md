# Sinkroo — El Dial de Autonomía y el Centro de Mando

**Versión:** 1.0 · **Fecha:** 2026-09-23
**Dos ideas:** (1) el usuario decide cuánto decide la IA. (2) El dashboard principal es el centro de
mando del modelo completo, no un tablero de métricas.
**Se complementa con:** `03-motor-a-la-vista.md` — el dial es lo que le da sentido al vidrio.

---

## PARTE 1 — El Dial de Autonomía

### 1.1 Por qué esto es más grande que un switch

Un switch "automático / manual" tiene dos problemas:

1. **No todos los trabajos son iguales.** Nadie quiere aprobar "revisé tus campañas y están
   normales". Y nadie quiere que la IA gaste plata sola sin techo.
2. **"100% automático" sin frenos es un pasivo.** Si la IA publica, pausa campañas y toca
   presupuestos sola, y no hay un techo, un bug cuesta dinero real del usuario.

Así que el dial no es un switch: es **un nivel, por tipo de acción, con frenos duros.**

### 1.2 Los tres modos

| Modo | Qué hace la IA | Qué hace el usuario | En el vidrio se ve |
|---|---|---|---|
| **Automático** | Decide, ejecuta y te reporta | Se entera después | `hace 12 min: hizo X → ver` |
| **Compartido** | Decide, prepara, **pide OK** | Aprueba o rechaza | `espera tu OK: quiere X → aprobar` |
| **Manual** | Solo informa y sugiere | Decide y ejecuta | `sugiere X · 3 sugerencias sin usar` |

**Compartido es el modo por defecto.** Un producto cuyo defecto es `manual` es un producto que no
hace nada; uno cuyo defecto es `automático` total asusta. `Compartido` es el punto donde el usuario
ve valor sin perder el control — y es la mejor demostración de que el motor trabaja.

### 1.3 No es un dial global: es un dial con excepciones

**Global, con tres estados. Y una lista corta de acciones sensibles donde se puede sobreescribir.**

No una matriz de 40 casillas: eso es exactamente la complejidad que estamos sacando.

```
¿Cómo querés que trabaje Sinkroo?
  ○  Automático    Decide y ejecuta. Te enterás después.
  ●  Compartido    Decide y te pide OK antes de hacer.      ← por defecto
  ○  Manual        Te sugiere y vos decidís.

Excepciones (solo las que importan):
  Vigilancia y análisis                    [ Automático ]   (no se puede bajar — es gratis)
  Escribir copys e imágenes                [ Automático ]
  Responder a clientes en WhatsApp         [ Compartido ]
  Publicar y gastar presupuesto            [ Compartido ]
  Pausar una campaña que se quema          [ Automático ]   ← ver nota
  Cambiar presupuesto más de un 20%        [ Compartido ]
  Enviar links de pago                     [ Manual      ]
```

> **Nota sobre "pausar una campaña que se quema":** acá `Automático` es lo correcto y es
> contraintuitivo. Que la IA **no pueda** frenar una campaña que está perdiendo plata mientras el
> usuario duerme es un problema más grande que el riesgo de que frene de más. Frena primero,
> pregunta después — y la acción es **reversible con un clic** (§1.6).

### 1.4 Los frenos duros (aplican incluso en 100% automático)

Estos **no se pueden desactivar**. Los fija el usuario una vez y la IA nunca los cruza. Sin esto,
el modo automático no debería existir.

| Freno | Qué evita |
|---|---|
| **Techo de gasto diario y mensual** | Que una campaña se desboque de madrugada |
| **Cambio máximo de presupuesto por acción (ej. ±20%)** | Que un ajuste pase de 0 a 10x |
| **Máximo de acciones por hora (ej. 10)** | Bucles infinitos de la IA corrigiéndose a sí misma |
| **No publicar sin KYC aprobado** | Riesgo legal y de cumplimiento |
| **No enviar pagos por encima de $X sin OK explícito** | Fraude o error de un dígito |
| **Ventana horaria: no molestar clientes de 22 a 8 h** | Que un cliente reciba un WhatsApp a las 3 AM |
| **Un solo nivel de escalado a la vez** | Cambios en cascada que nadie pidió |

### 1.5 El principio que ordena todo

> **El nivel de autonomía es un TECHO, no un piso.**
>
> El agente puede **escalar hacia abajo** (pedir más control del que tiene permitido) y **nunca
> hacia arriba**.

Y escala solo, automáticamente, cuando:

| Disparador | Ejemplo |
|---|---|
| **Confianza baja** | El veredicto del panel salió `review`, no `go` → no publica, pregunta |
| **Supera un umbral** | El cambio de presupuesto pedido es del 35% y el techo es 20% |
| **Ya falló dos veces** | Intentó publicar y Meta rechazó dos veces → te lo pasa |
| **La acción no es reversible** | Todo lo que no se puede deshacer sube un nivel |
| **Impacto en dinero inusual** | El costo estimado está 3 desvíos sobre el promedio del proyecto |

Esto es lo que hace que "automático" sea serio: **la IA sabe cuándo no sabe.**

### 1.6 Deshacer — la pieza que vuelve seguro el modo automático

Toda acción reversible queda **deshacible durante 24 horas**, desde la bitácora:

```
hace 12 min   Kai pausó "Lanzamiento D2C" — el CPA subió a $28
              → deshacer        → ver por qué        → silenciar este aviso
```

**Por qué esto es lo que hace posible el automático:** con un botón de deshacer, el costo de un
error de la IA baja a *"un clic"*. Sin él, el usuario tiene que confiar en que la IA nunca se
equivoca — que es una confianza que nadie da.

### 1.7 El resumen "mientras no estabas"

La contracara del modo automático: si la IA trabajó sola, hay que contarlo bien.

```
Mientras no estabas (desde ayer 18:00)

  3 acciones autónomas
  · Pausó "Lanzamiento D2C" — el CPA subió 40%
  · Escribió 6 variantes nuevas a partir del ángulo "resultado"
  · Marcó 2 leads como fríos y reprogramó el seguimiento

  1 decisión espera tu OK
  · Publicar la campaña de retargeting ($30/día)        [aprobar] [ajustar]

  $340 de gasto, $1.180 de ventas atribuidas
```

Es lo primero que ve el usuario al entrar. Es, literalmente, **el motor a la vista contado por
resultados** — y es la mejor pieza de retención del producto.

### 1.8 Dónde se elige

- **En el onboarding, una sola pregunta** al final del paso 3 (§ simplificación: 1 pregunta, no
  rompe los 3 pasos). Es la configuración más importante del producto y se elige cuando el usuario
  entiende para qué sirve.
- **En Cuenta → Autonomía**, para cambiarlo cuando quiera.
- **Inline, en el momento**: cuando el motor pide un OK, hay un enlace *"dejá que lo haga solo
  siempre"* que sube esa acción a automático. **Aprender del cansancio de aprobar.**

---

## PARTE 2 — El Centro de Mando

### 2.1 El cambio de fondo

El dashboard actual responde **"¿cómo está todo?"**. Un centro de mando responde **"¿qué hago
ahora?"** — y recién después, cómo está todo.

**Orden de jerarquía (y es el orden en que se construye la pantalla):**

```
1. 🔴 ALARMAS          Lo que se está rompiendo o perdiendo plata AHORA
2. ⏳ TU DECISIÓN      Lo que el motor espera de vos (con el dial en Compartido)
3. ⚙️ EL MOTOR         Los 6 agentes trabajando (el taller)
4. 📊 LOS NÚMEROS      KPIs del modelo completo
5. 🌅 MIENTRAS NO ESTABAS   Acciones autónomas + resultado
6. 📜 LA BITÁCORA      Todo lo que se hizo, scrolleable
```

Un centro de mando que **solo informa es un reporte, no una cabina.** Por eso alarmas y decisiones
van arriba: son las únicas dos cosas que le piden algo al usuario.

### 2.2 Alarmas — con taxonomía, con impacto en dinero, y silenciables

**Toda alarma tiene cuatro partes obligatorias:**

| Parte | Ejemplo |
|---|---|
| **Qué pasó** | "El CPA de «Lanzamiento D2C» subió de $20 a $28" |
| **Por qué importa (en $)** | "Estás pagando $8 más por venta. A este ritmo: **$240 esta semana**" |
| **Qué sugiere la IA** | "Pausar el conjunto «lookalike frío» y mover el presupuesto al que convierte" |
| **Qué podés hacer** | `[aplicar sugerencia]` `[ver campaña]` `[silenciar 7 días]` |

**Sin el "por qué importa en $", una alarma es ruido.** Esa línea es la que la vuelve real.

**Taxonomía:**

| Nivel | Qué es | Ejemplos | Default |
|---|---|---|---|
| 🔴 **Crítico** | Pérdida activa o riesgo legal | CPA desbocado · campaña rechazada por Meta · cliente enojado sin responder hace 4 h · token de integración vencido (la integración está caída) | **Notifica** (push) |
| 🟠 **Atención** | Se está desviando | CPA +15% · frecuencia de anuncio saturando · créditos bajo el umbral · pocas piezas aprobadas para seguir | Solo en el panel |
| 🟡 **Oportunidad** | Algo bueno para aprovechar | Ángulo nuevo detectado · competidor bajó precios · demanda +32% en tu zona | Solo en el panel |
| 🔵 **Informativo** | Solo enterate | Agente terminó una tarea · informe semanal listo | Solo en bitácora |

**Anti-fatiga de alarmas — la regla que decide si esto sirve o se ignora:**
- Máximo **3 alarmas visibles**; el resto colapsado en "ver 4 más".
- **Silenciar por tipo y por tiempo** ("silenciar este aviso 7 días"). Una alarma que no se puede
  silenciar se termina ignorando entera.
- **Push solo para 🔴 crítico.** Si todo notifica, nada notifica.
- Una alarma que se resuelve sola **se cierra sola**, y eso también se cuenta: *"Se resolvió solo:
  Kai pausó el conjunto que se estaba quemando."*

### 2.3 Tu decisión — resolver en el lugar, no navegando

Los pendientes del motor (con el dial en Compartido) se resuelven **inline**, con todo el contexto
en la tarjeta. Que el usuario tenga que navegar a otra vista para aprobar es la diferencia entre
una cabina y un reporte.

```
⏳ ESPERA TU OK (3)

  Publicar "Retargeting Carrito" · $30/día
  Kai preparó la campaña. El panel le dio 84 (aprobado).
  Vendedores: 1 dudó, 4 aprobaron.
  → el más duro dijo: "el público es muy amplio, acotá a 30 días"
     [aprobar]  [ajustar]  [descartar]
```

**Y el detalle que cierra el ciclo:** cada aprobación es una oportunidad de enseñar
*"dejá que lo haga solo siempre"*. El dial se ajusta **usándolo**, no solo configurándolo.

### 2.4 Los números — del modelo completo, no solo de las campañas

El dashboard hoy muestra 4 KPIs de publicidad. El modelo completo tiene más dimensiones. La fila de
números debe cubrir **las cinco áreas del producto**, en una sola línea, con el número grande y la
variación:

| Área | Números |
|---|---|
| **Dinero** | Ventas · ROAS · inversión · costo por venta |
| **Alcance** | Personas alcanzadas · CTR |
| **Calidad** | Score promedio de tus piezas · piezas aprobadas |
| **Conversaciones** | Mensajes hoy · % resuelto por IA · esperando humano |
| **Recursos** | Créditos disponibles · días de autonomía restantes |

> **"Días de autonomía restantes"** es nuevo y es importante: con el dial en automático, el usuario
> necesita saber cuántos días puede trabajar el motor sin que se le acaben los créditos. Es el
> equivalente al combustible — y en el vidrio del motor, encaja perfecto.

### 2.5 El motor y la bitácora
Según `03-motor-a-la-vista.md`: los 6 agentes con trabajo anclado, y la bitácora scrolleable abajo
de todo. El centro de mando **es** la vista `Hoy`.

---

## PARTE 3 — Cómo se combinan

El dial no es una pantalla aparte: **cambia el significado de lo que se ve en el centro de mando.**

| Dial | Lo que domina el centro de mando |
|---|---|
| **Automático** | 🌅 "Mientras no estabas" arriba de todo. El usuario viene a **enterarse** |
| **Compartido** | ⏳ "Tu decisión" arriba de todo. El usuario viene a **resolver** ← default |
| **Manual** | 💡 Sugerencias acumuladas. El usuario viene a **trabajar** |

Los tres modos usan la misma pantalla, con distinto énfasis. Eso es simple de construir y simple
de entender.

---

## PARTE 4 — Implicaciones técnicas

### 4.1 Tablas nuevas

```
autonomy_settings      nivel por scope: global | agente | acción
action_catalog         catálogo de acciones: key, default_level, risk,
                       reversible, cost_impact, umbral_de_confirmacion
guardrails             los frenos duros por scope (gasto, %, frecuencia, horario)
decisions              pendientes de OK: payload, rationale, impact_estimate,
                       status, expires_at, resolved_by
actions_log            auditoría de TODA acción: agente, nivel aplicado,
                       payload, resultado, undo_payload, reversible_until
alarms                 tipo, severidad, impacto en $, sugerencia, estado,
                       silenciada_hasta, auto_resuelta_por
notifications          entrega y leída/pendiente
```

### 4.2 Cambios en lo que ya existe

- **`agent_runs`** gana `autonomy_level_applied` y `decision_id` (para saber si la acción fue
  autónoma o aprobada).
- **Toda acción del sistema pasa por un único punto** que consulta el dial y los frenos antes de
  ejecutar. **Nunca un agente actúa por su cuenta saltándose ese punto** — misma lógica que la capa
  de integraciones: un solo lugar decide.

```typescript
await actions.execute({
  tenantId, agentId, action: 'pause_campaign',
  payload: { campaignId, reason: 'CPA +40%' },
  impact: { moneyPerWeek: 240 },
})
// → { status: 'auto_executed' | 'awaiting_approval' | 'blocked_by_guardrail' | 'suggested' }
```

**Un solo guardián.** Si la autonomía se implementa en cada agente, hay 6 lugares donde está mal.

### 4.3 Lo que hay que poder responder siempre
Cada acción ejecutada tiene que poder contestar: **quién la tomó (agente), con qué nivel de
autonomía, por qué (rationale), qué produjo, y se puede deshacer hasta cuándo.** Sin eso no hay
modo automático: hay fe.

---

## PARTE 5 — Decisiones

1. **¿El modo por defecto es `Compartido`?** *Recomiendo sí.* Automático total asusta al principio;
   manual por defecto hace que el producto parezca no hacer nada.
2. **¿Los frenos duros pueden desactivarse?** *Recomiendo que no — techo de gasto y máximo de
   acciones por hora se fijan, no se apagan.*
3. **¿La ventana de "no molestar clientes" es configurable?** *Recomiendo sí, con 22-8 h por
   defecto según la zona horaria del negocio.*
4. **¿Cuánto dura la ventana de deshacer?** *Recomiendo 24 h para acciones operativas y 7 días
   para las que tocan dinero.*
5. **¿El dial también afecta las respuestas de WhatsApp?** *Recomiendo sí: es donde más se nota el
   valor del automático — pero con escalado obligatorio cuando el cliente se enoja o pide
   cancelar.*
6. **¿La pregunta del dial va en el onboarding o después?** *Recomiendo en el onboarding, como
   única pregunta del paso 3 — es la configuración más importante del producto.*
