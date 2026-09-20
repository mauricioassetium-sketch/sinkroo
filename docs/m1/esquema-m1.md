# M1 — Ingestión de negocio (diseño en español)

## Entidades
1. **Business** (negocio/cliente)
2. **Product** (producto; uno "principal" y varios secundarios)
3. **Creative** (ya existe → se enlaza con productId)

## Business
- name (texto)
- industry (enum amplio, "otro" de red)
- description (texto largo — crítico)
- audience (texto)
- tone (enum)
- channels (array)
- logo (URL)

## Product
- name, businessId (FK), category (enum granular), price+priceUnit (OPCIONAL)
- offer, usp (crítico), cta, imageUrl, isPrimary (bool)

## Listas
- industry: inmobiliario, estetica, salud, ecommerce, saas, educacion, food,
  servicios_locales, fintech, turismo, automotriz, fitness, legal, construccion,
  transporte, energia, entretenimiento, retail, hosteleria, bienes_raices_comercial, otro
- category: propiedad, sesion_estetica, producto_fisico, plan_suscripcion, curso,
  paquete, consulta, reserva, evento, servicio_profesional, software, promocion,
  membresia, ticket, otro

## Reglas
- Precio opcional (off-plan sin precio entra igual).
- isPrimary=true => GAIA prioriza ese producto para generar creativos.
- Imagen por URL en M1; subida real de archivo en M4.
