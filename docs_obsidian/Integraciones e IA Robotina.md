# Integraciones e IA Robotina

El ecosistema de Robotina-Céntral se basa fuertemente en integraciones de terceros orquestadas desde el backend y webhooks.

## Meta Graph API (WhatsApp & Instagram)
La comunicación con los usuarios ocurre exclusivamente a través de los canales oficiales de Meta. 
- La tabla `tenants` almacena el `whatsapp_token` y `phone_number_id` para identificar desde qué restaurante/bot se despacha el mensaje.
- Recientemente se integró Instagram Messaging bajo el mismo flujo lógico.

## Automatización y flujos (n8n)
Se utiliza n8n (`expanded_workflow.json`) como cerebro intermedio (Middleware) para enrutar los webhooks y construir prompts dinámicos.

## Inteligencia Artificial (OpenAI)
La IA funciona como el motor cognitivo. 
El `system_prompt` de cada tenant, alojado en Supabase, se pasa a OpenAI junto con el inventario activo. La IA usa "Function Calling" (Llamado a Funciones) para retornar un objeto JSON cuando detecta que el usuario quiere comprar algo, el cual el flujo inserta en la BD.

---
**Notas relacionadas:** [[Flujo Operativo Robotina]], [[Endpoints y APIs Robotina]]
#ia #openai #whatsapp #meta #n8n
