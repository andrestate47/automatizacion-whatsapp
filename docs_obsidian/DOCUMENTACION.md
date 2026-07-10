# 🤖 Documentación Central - Robotina SaaS (Restaurant ERP)

**Robotina-Céntral** es un panel administrativo de nivel corporativo (Enterprise SaaS) multi-tenant, diseñado específicamente para controlar la logística, ventas y marketing de restaurantes o cadenas alimenticias. Opera con pedidos 100% automatizados por un Bot de Inteligencia Artificial a través de WhatsApp/Meta Cloud.

## Índice de Conocimiento
- [[Arquitectura y Estructura Robotina]]
- [[Stack Tecnológico Robotina]]
- [[Modelo de Datos Robotina]]
- [[Flujo Operativo Robotina]]
- [[Endpoints y APIs Robotina]]
- [[Lógica de Negocio Robotina]]
- [[Seguridad y Autenticación Robotina]]
- [[Integraciones e IA Robotina]]
- [[Instalación y Entorno Robotina]]
- [[Mantenimiento y Tareas Robotina]]

---

## 🧠 Resumen para IA
**Proyecto:** Robotina-Céntral. **Tipo:** ERP SaaS Multi-tenant para Restaurantes con IA. **Stack:** Frontend SPA en React 19 con TypeScript, Vite, React Router DOM v6 y Recharts para BI; Backend Serverless usando Supabase (PostgreSQL) con Realtime Channels (Sockets) para actualizaciones en vivo; IA mediante OpenAI conectada a flujos de automatización en n8n y Meta Graph API (WhatsApp Business y Evolution API). **Arquitectura de Base de Datos:** Base de datos PostgreSQL alojada en Supabase que utiliza un modelo Multi-tenant donde la tabla `tenants` (con campos `phone_number_id`, `waba_id`, `whatsapp_token`) rige sobre `orders`, `customers`, `menu_items`, `whatsapp_chats` y `reservations`. La separación de datos se logra estrictamente mediante Row Level Security (RLS) en Supabase filtrando por `tenant_id` y funciones RPC (`resolver_tenant`, `registrar_mensaje`, `crear_pedido`). **Características Clave:** Dashboard en tiempo real, Kanban logístico para despachadores, Terminal KDS (Kitchen Display System) modo oscuro puro para cocineros, CRM automático que perfila clientes basándose en PNL, gestor de inventario con Kill-Switch bidireccional y módulo de campañas de marketing masivo. **Seguridad:** Autenticación de Supabase Auth para usuarios de dashboard (conectado a `tenant_users` con roles `admin`/`viewer`), bots bypassean RLS vía roles de servicio (Service Role). 

---
**Notas relacionadas:**
#dashboard #erp #saas #ia #whatsapp
