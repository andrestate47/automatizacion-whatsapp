const fs = require('fs');
const file = 'expanded_workflow.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

data.nodes.forEach(n => {
  if (n.name === 'Normalize WhatsApp Message') {
    n.parameters.jsCode = `const webhookData = $('WhatsApp Webhook POST').item.json;
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
  const value = body?.entry?.[0]?.changes?.[0]?.value || {};
  const message = value?.messages?.[0] || body?.entry?.[0]?.messaging?.[0]?.message || null;
  const contact = value?.contacts?.[0] || {};
  const status = value?.statuses?.[0] || null;

  if (body.object === 'instagram') {
    channel = 'instagram';
    const messagingEvent = body.entry[0].messaging?.[0];
    if (messagingEvent && messagingEvent.message) {
      if (messagingEvent.message.is_echo) return [{ json: { is_valid_message: false, reason: 'Instagram echo event ignored' } }];
      
      is_valid_message = true;
      event_type = 'message';
      from = messagingEvent.sender.id;
      customer_name = 'Usuario Instagram';
      message_id = messagingEvent.message.mid;
      type = 'text';
      timestamp = messagingEvent.timestamp;
      business_phone_number_id = body.entry[0].id;
      text = messagingEvent.message.text || '';
    } else {
       return [{ json: { is_valid_message: false, reason: 'Instagram webhook event ignored' } }];
    }
  } else {
    channel = 'meta';
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
  }
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
});

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Fixed Normalize WhatsApp Message code saved!');
