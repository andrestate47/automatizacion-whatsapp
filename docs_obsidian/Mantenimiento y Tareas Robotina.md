# Mantenimiento y Tareas Robotina

Esta sección agrupa las mejoras continuas, deuda técnica y el roadmap futuro (`ROADMAP_FUTURO.md`, `FALTA_POR_HACER.md`).

## Problemas Conocidos (Deuda Técnica)
- Enrutamiento de URLs a veces conflictivo con webhooks de Instagram (scripts como `fix_url.cjs`, `fix_url_me.cjs` indican reparaciones en curso).
- Sincronización multi-tenant estricta: Al agregar una tabla nueva, siempre hay que asegurar que exista la política RLS respectiva o los datos serán invisibles.

## Tareas Pendientes / Roadmap
- Estabilizar completamente el canal de Instagram Direct Messages en paralelo con WhatsApp para la misma cuenta de tenant.
- Generador de Difusión Masiva (Marketing Bot): Mejoras en la UI para campañas segmentadas asíncronas.
- KDS (Kitchen Display System): Implementación en hardware real y mejoras de sockets ante pérdidas de red del cocinero.

## Scripts de Reparación (`scripts/`, `*.sql`)
El proyecto contiene scripts de emergencia (ej. `reparacion_final_v6.sql`, `fix_instagram_db.sql`) que se utilizan para parchar la base de datos sin interrumpir el servicio. Se recomienda consolidar estos scripts en migraciones estándar.

---
**Notas relacionadas:** [[Arquitectura y Estructura Robotina]], [[Integraciones e IA Robotina]]
#mantenimiento #roadmap #tareas #deudatecnica
