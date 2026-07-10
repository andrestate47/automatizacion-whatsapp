# Flujo Operativo Robotina

El sistema está dirigido por eventos asíncronos originados por los clientes en aplicaciones de mensajería (WhatsApp/Instagram).

## Ciclo de Vida de un Mensaje / Pedido
1. **Ingesta:** El cliente envía un WhatsApp. Meta hace un POST (Webhook) al endpoint del flujo de n8n o Evolution API.
2. **Resolución de Tenant:** El motor de automatización extrae el `phone_number_id` y ejecuta la función RPC `resolver_tenant` en Supabase para saber a qué restaurante pertenece, obteniendo sus credenciales de OpenAI y Tokens.
3. **Procesamiento de IA:** Se envía el mensaje y el contexto del restaurante (menú, prompt del sistema) a OpenAI.
4. **Respuesta y Registro:** OpenAI genera la respuesta. El motor de automatización envía el mensaje de vuelta por WhatsApp. Al mismo tiempo, llama a la función RPC `registrar_mensaje` en Supabase.
5. **Creación de Pedido:** Si la IA determina intención de compra, extrae el JSON del pedido y llama a la función RPC `crear_pedido`.
6. **Emisión de WebSockets:** Al insertarse el pedido o mensaje en Supabase, el `Realtime` dispara un evento.
7. **Reflejo en el Dashboard:** El Dashboard en React del restaurante, que está suscrito al canal del `tenant`, recibe el WebSocket y actualiza el Kanban o el Chat instantáneamente.

---
**Notas relacionadas:** [[Integraciones e IA Robotina]], [[Endpoints y APIs Robotina]]
#flujo #operativa #n8n #webhook
