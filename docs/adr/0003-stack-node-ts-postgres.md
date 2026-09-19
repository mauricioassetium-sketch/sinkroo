# ADR-0003: Stack Node/TypeScript + PostgreSQL en servidor propio

**Estado:** Aceptado
**Fecha:** 2026-09-20
**Decidido por:** Mauricio + GAIA

## Contexto

El spec v1.2 original proponía Next.js + Supabase + Vercel.

## Decisión

- **Backend:** Node/TypeScript (Fastify).
- **DB:** PostgreSQL.
- **Despliegue:** servidor propio (VPS + Docker Compose), no Vercel/Supabase.

## Consecuencias

- Control total del runtime y de los datos (no lock-in de proveedor).
- GAIA orquesta; el Engine es un paquete local, no un servicio externo.
