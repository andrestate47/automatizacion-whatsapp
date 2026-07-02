import fs from 'fs';

const data = JSON.parse(fs.readFileSync('d:/proyectos/Robotina-Céntral/restored_workflow.json', 'utf8'));

// 1. Crear nodo Switch (IF Output Channel)
const ifOutputChannelNode = {
  "parameters": {
    "conditions": {
      "string": [
        {
          "value1": "={{ $('Normalize WhatsApp Message').first().json.channel }}",
          "value2": "evolution"
        }
      ]
    }
  },
  "id": "if-output-channel",
  "name": "IF Output Channel",
  "type": "n8n-nodes-base.if",
  "typeVersion": 1,
  "position": [900, -600]
};

// 2. Crear Sales Agent
const valeriaAgent = {
  "parameters": {
    "promptType": "define",
    "text": "=Cliente WhatsApp: {{$('Normalize WhatsApp Message').first().json.from}}\\nNombre cliente: {{$('Normalize WhatsApp Message').first().json.customer_name || ''}}\\nMensaje cliente: {{$('Normalize WhatsApp Message').first().json.text}}\\n",
    "options": {
      "systemMessage": `Eres el Asesor Robotina, el cerrador estrella de Robotina Central. Vendemos un Software como Servicio (SaaS) que crea Asistentes de IA para WhatsApp. Tu objetivo es VENDER nuestro software agendando demostraciones.

REGLAS DE PERSONALIDAD (CRÍTICAS):
- SALUDO INICIAL: Cuando el cliente te salude por primera vez o diga "Hola", tu saludo DEBE incluir exactamente la frase: "¿En qué puedo ayudarte referente a la automatización de tu negocio?".
- Eres humano, empático, carismático y persuasivo. NO hablas como robot.
- NUNCA mandes bloques de texto largos. Tus mensajes deben ser cortos (máximo 2-3 líneas).
- NUNCA repitas la misma frase dos veces. Si el cliente no entiende, cambia la forma de decirlo.
- Usa emojis con naturalidad (1 o 2 por mensaje, no exageres).
- Si el cliente te insulta, despídete cortésmente y deja de hacer preguntas.

REGLAS DEL EMBUDO DE VENTAS:
1. FILTRO: Si el cliente busca "trabajo" o "empleo", dile amablemente que somos una empresa B2B y no tenemos vacantes. Despídete y no ofrezcas el producto.
2. CUALIFICACIÓN: Si es dueño de negocio, pregúntale a qué se dedica y si siente que pierde tiempo o ventas por responder WhatsApp manualmente.
3. TECNOLOGÍA / CÓMO FUNCIONA: Si preguntan "cómo lo hace" o qué tecnología usamos, explícales que combinamos la potencia de la IA con una arquitectura en n8n y entrenamiento personalizado, sumado a un dashboard CRM para centralizar toda su información en un solo lugar de manera ordenada y eficiente.
4. PRECIOS: Si preguntan por precios, NUNCA digas que no sabes. Diles con seguridad que tenemos dos opciones: Plan Básico por $49/mes y Plan Pro (Multi-sucursal) por $99/mes.
5. VALOR (ROI): Si dicen que "es caro", hazles ver que Robotina se paga sola con 2 o 3 ventas recuperadas al mes. Es una inversión, no un gasto.
6. CIERRE (LA DEMO): Tu objetivo final es agendar una demostración de 15 minutos en vivo. Crea interés ("¿Te gustaría ver cómo funcionaría Robotina para tu negocio en una llamada de 15 min?") y solo cuando digan que SÍ, envíales el enlace: https://robotinacentral.com/. JAMÁS ofrezcas enviarles un "video".
7. GESTION DE CITAS: No tienes acceso al calendario para crear o verificar citas. Si piden agendar/cambiar, manda el link https://robotinacentral.com/. Si el cliente avisa que YA AGENDO, felicitalo, dile que se le recordara su reunion una hora antes por este medio y recuerdale tener buena conexion a internet. NUNCA menciones correos electronicos ni confirmaciones.
8. TRANSICIÓN A ASESOR: Si el cliente está muy indeciso o pide "hablar con un asesor" humano, no pidas disculpas ni digas que no puedes. Simplemente asume un tono más consultivo y humano, guiando la conversación para convencerlo sin tener que "transferirlo". Dile algo como: "Entiendo tus dudas, como asesor te aseguro que..." y resuélvelas.`
    }
  },
  "type": "@n8n/n8n-nodes-langchain.agent",
  "typeVersion": 1.7,
  "position": [400, -600],
  "id": "asesor-robotina-agent",
  "name": "Asesor Robotina",
  "onError": "continueErrorOutput"
};

// 3. Insert to whatsapp_queue
const insertQueueNode = {
  "parameters": {
    "method": "POST",
    "url": "https://vijzjcpkypsmkhywndus.supabase.co/rest/v1/whatsapp_queue",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "apikey",
          "value": "={{ $('HTTP Request').first().json.supabase_anon_key || 'REEMPLAZAR_CON_SERVICE_ROLE_KEY' }}"
        },
        {
          "name": "Authorization",
          "value": "=Bearer {{ $('HTTP Request').first().json.supabase_anon_key || 'REEMPLAZAR_CON_SERVICE_ROLE_KEY' }}"
        },
        {
          "name": "Content-Type",
          "value": "application/json"
        },
        {
          "name": "Prefer",
          "value": "return=representation"
        }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"phone_number\": \"{{ $json.from }}\",\n  \"message\": \"{{ $json.reply }}\",\n  \"status\": \"pending\",\n  \"tenant_id\": \"{{ $('HTTP Request').first().json.id }}\"\n}",
    "options": {}
  },
  "id": "insert-whatsapp-queue",
  "name": "Insert to WhatsApp Queue (Anti-Ban)",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4,
  "position": [950, -600]
};

const normalizeNode = data.nodes.find(n => n.name === 'Normalize WhatsApp Message');
if (normalizeNode) {
  normalizeNode.parameters.jsCode = `const webhookData = $('WhatsApp Webhook POST').item.json;
const body = webhookData.body || webhookData;

let is_valid_message = false;
let event_type = 'unknown';
let from = '';
let customer_name = null;
let message_id = null;
let type = 'unknown';
let text = '';
let media_id = null;
let timestamp = null;
let business_phone_number_id = null;
let display_phone_number = null;
let channel = 'unknown';

if (body.event && body.event.includes('messages')) {
  channel = 'evolution';
  const dataPayload = body.data || body;
  const msgObj = dataPayload.message || {};
  
  if (dataPayload.key && dataPayload.key.fromMe) return [{ json: { is_valid_message: false, reason: 'fromMe=true' } }];
  
  is_valid_message = true;
  event_type = 'message';
  from = (dataPayload.key?.remoteJid || '').split('@')[0]; 
  customer_name = dataPayload.pushName || null;
  message_id = dataPayload.key?.id || null;
  type = dataPayload.messageType === 'conversation' ? 'text' : dataPayload.messageType;
  
  if (msgObj.conversation) text = msgObj.conversation;
  else if (msgObj.extendedTextMessage?.text) text = msgObj.extendedTextMessage.text;
  
  timestamp = dataPayload.messageTimestamp || Math.floor(Date.now() / 1000);
  business_phone_number_id = webhookData.query?.meta_id || body.instance || 'evolution';
  
} else if (body.entry) {
  channel = 'meta';
  const value = body?.entry?.[0]?.changes?.[0]?.value || {};
  const message = value?.messages?.[0] || null;
  const contact = value?.contacts?.[0] || {};
  const status = value?.statuses?.[0] || null;

  if (status && !message) return [{ json: { is_valid_message: false, reason: 'WhatsApp status event ignored' } }];
  if (!message) return [{ json: { is_valid_message: false, reason: 'No message object found' } }];

  is_valid_message = true;
  event_type = 'message';
  from = message.from;
  customer_name = contact?.profile?.name || null;
  message_id = message.id;
  type = message.type;
  timestamp = message.timestamp;
  business_phone_number_id = value?.metadata?.phone_number_id || null;
  display_phone_number = value?.metadata?.display_phone_number || null;

  if (type === 'text') text = message?.text?.body || '';
  if (type === 'audio') media_id = message?.audio?.id || null;
  if (type === 'image') { text = message?.image?.caption || ''; media_id = message?.image?.id || null; }
  if (type === 'document') { text = message?.document?.caption || ''; media_id = message?.document?.id || null; }
} else {
  return [{ json: { is_valid_message: false, reason: 'Unknown payload format' } }];
}

return [{
  json: {
    is_valid_message, event_type, channel, from, customer_name, message_id,
    message_type: type, text, media_id, timestamp, session_id: from,
    business_phone_number_id, display_phone_number, raw_message: body
  }
}];`;
}

const formatNode = data.nodes.find(n => n.name === 'Format WhatsApp Response');
if (formatNode && formatNode.parameters && formatNode.parameters.jsCode) {
  formatNode.parameters.jsCode = formatNode.parameters.jsCode.replace(
    "'Gracias por escribirnos. ¿En qué puedo ayudarte?'",
    "'Gracias por escribirnos. ¿En qué puedo ayudarte referente a la automatización de tu negocio?'"
  );
}

// Filtrar herramientas antiguas para eliminarlas completamente del JSON
data.nodes = data.nodes.filter(n => n.name !== 'registrar_reserva' && n.name !== 'consultar_catalogo');

// SOLO AGREGAMOS: IF Output Channel, Asesor Robotina, y Insert Queue
data.nodes.push(ifOutputChannelNode, valeriaAgent, insertQueueNode);

// Actualizar Conexiones
if (data.connections["Bot Activo?"] && data.connections["Bot Activo?"]["main"] && data.connections["Bot Activo?"]["main"][0]) {
  // Cambiar destino de Bot Activo? al nuevo agente (Asesor Robotina)
  data.connections["Bot Activo?"]["main"][0] = [
    { "node": "Asesor Robotina", "type": "main", "index": 0 }
  ];
}

// Conectar Asesor Robotina -> Format WhatsApp Response original
data.connections["Asesor Robotina"] = {
  "main": [
    [ { "node": "Format WhatsApp Response", "type": "main", "index": 0 } ]
  ]
};

// Conectar Memory y LLM a Asesor Robotina
if (data.connections["Memory by WhatsApp Number"] && data.connections["Memory by WhatsApp Number"]["ai_memory"]) {
  data.connections["Memory by WhatsApp Number"]["ai_memory"][0].push({
    "node": "Asesor Robotina", "type": "ai_memory", "index": 0
  });
}

if (data.connections["OpenAI Chat Model"] && data.connections["OpenAI Chat Model"]["ai_languageModel"]) {
  data.connections["OpenAI Chat Model"]["ai_languageModel"][0].push({
    "node": "Asesor Robotina", "type": "ai_languageModel", "index": 0
  });
}

// Ya no conectamos las herramientas de restaurante (registrar_reserva, consultar_catalogo) al Asesor Robotina porque este es un flujo SaaS.

// Conectar Format WhatsApp Response -> IF Output Channel
data.connections["Format WhatsApp Response"] = {
  "main": [
    [ { "node": "IF Output Channel", "type": "main", "index": 0 } ]
  ]
};

// Conectar IF Output Channel
data.connections["IF Output Channel"] = {
  "main": [
    // True: Evolution
    [ { "node": "Insert to WhatsApp Queue (Anti-Ban)", "type": "main", "index": 0 } ],
    // False: Meta
    [ { "node": "Send WhatsApp Message", "type": "main", "index": 0 } ]
  ]
};

// Nos aseguramos de eliminar la conexión directa vieja del Send WhatsApp Message (opcional, ya lo sobreescribimos arriba)
// Y listo, se preserva que Guardar Respuesta Bot y Log Conversation sigan funcionando porque Format WhatsApp Response sí se ejecuta!

fs.writeFileSync('d:/proyectos/Robotina-Céntral/expanded_workflow.json', JSON.stringify(data, null, 2));
console.log("expanded_workflow.json created.");
