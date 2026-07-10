# Endpoints y APIs Robotina

Al ser una arquitectura basada en **Supabase** y **n8n**, el concepto tradicional de "Endpoints" se delega en Funciones RPC y llamadas directas (PostgREST).

## Funciones RPC Críticas (Supabase)
El backend expone estas funciones a las cuales se llama remotamente:
- `resolver_tenant(phone_number_id)`: Retorna las llaves y contexto de un tenant. Vital para enrutar el tráfico multi-tenant desde n8n.
- `registrar_mensaje(...)`: Realiza un upsert del cliente, upsert del chat y añade el mensaje al historial.
- `crear_pedido(...)`: Genera el código único `#WA-XXXX` y añade el JSON del carrito.

## Webhooks Externos
- Endpoint de Ingesta (n8n/Evolution API): Recibe los POST de Meta Graph API cuando hay nuevos mensajes de WhatsApp o Instagram.
- Graph API (Meta): Endpoints para responder los mensajes de vuelta (`/messages`).

---
**Notas relacionadas:** [[Flujo Operativo Robotina]], [[Modelo de Datos Robotina]]
#api #rpc #supabase #endpoints
