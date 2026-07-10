# Modelo de Datos Robotina

El sistema emplea un esquema de base de datos relacional estricto alojado en Supabase, adaptado a una arquitectura **Multi-tenant**. 

## Entidades Principales
1. **`tenants`:** Núcleo del sistema SaaS. Almacena negocios (restaurantes). Campos vitales: `phone_number_id` (Identificador Meta), `whatsapp_token`, `openai_key`, `system_prompt`, `plan`.
2. **`tenant_users`:** Tabla pivote. Conecta `auth.users` (empleados) con un `tenant` específico y un `role` (admin/viewer).
3. **`customers`:** CRM. Usuarios finales que chatean con el bot (teléfono, nombre, preferencias alimenticias deducidas).
4. **`orders`:** Pedidos realizados. Contiene `items_json`, monto total, y `status` (Pendiente, Preparando, Listo, Despachado).
5. **`menu_items`:** Productos disponibles. Vinculados a "Palabras Clave PNL".
6. **`whatsapp_chats` & `whatsapp_messages`:** Registro completo de conversaciones para telemetría.
7. **`conversation_logs`:** Bitácora de intenciones de IA.

## Aislamiento de Datos (Multi-tenancy)
Absolutamente todas las tablas operativas (`orders`, `customers`, etc.) tienen un campo `tenant_id`.
La seguridad se refuerza mediante **Row Level Security (RLS)** de Supabase, que intercepta cada query usando `public.get_my_tenant_id()` derivado del UID del empleado en el dashboard.

---
**Notas relacionadas:** [[Seguridad y Autenticación Robotina]], [[Endpoints y APIs Robotina]]
#database #supabase #postgresql #multitenant
