const fs = require('fs');

const filePath = 'd:/proyectos/Robotina-Céntral/expanded_workflow.json';
let workflow = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// 1. Modify "Normalize WhatsApp Message" node
const normalizeNode = workflow.nodes.find(n => n.name === 'Normalize WhatsApp Message');
if (normalizeNode) {
  let jsCode = normalizeNode.parameters.jsCode;
  
  // Replace the Meta webhook parsing logic to support Instagram
  // We'll look for `} else if (body.entry) {` block
  
  const instagramLogic = `
} else if (body.entry) {
  const value = body?.entry?.[0]?.changes?.[0]?.value || {};
  const message = value?.messages?.[0] || body?.entry?.[0]?.messaging?.[0]?.message || null;
  const contact = value?.contacts?.[0] || {};
  const status = value?.statuses?.[0] || null;

  if (body.object === 'instagram') {
    channel = 'instagram';
    const messagingEvent = body.entry[0].messaging[0];
    if (messagingEvent.message) {
      is_valid_message = true;
      event_type = 'message';
      from = messagingEvent.sender.id;
      customer_name = 'Usuario Instagram';
      message_id = messagingEvent.message.mid;
      type = 'text';
      timestamp = messagingEvent.timestamp;
      business_phone_number_id = body.entry[0].id; // Instagram Page ID
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
} else {`;
  
  // Regex to replace the block
  jsCode = jsCode.replace(/} else if \(body\.entry\) \{[\s\S]*?\} else \{/, instagramLogic);
  normalizeNode.parameters.jsCode = jsCode;
}

// 2. Modify HTTP Request to resolver_tenant
const resolverNode = workflow.nodes.find(n => n.name === 'HTTP Request' && n.parameters.url?.includes('resolver_tenant'));
if (resolverNode) {
  // Update payload parameter to use the new generic identifier instead of just phone_number_id
  resolverNode.parameters.jsonBody = resolverNode.parameters.jsonBody.replace(
    /\"p_phone_number_id\": \".*?\"/, 
    `"p_identifier": "{{ $('Normalize WhatsApp Message').first().json.business_phone_number_id }}"`
  );
}

// 3. Modify "Send WhatsApp Message" node
const sendNode = workflow.nodes.find(n => n.name === 'Send WhatsApp Message');
if (sendNode) {
  // Change URL dynamically based on channel
  sendNode.parameters.url = `=https://graph.facebook.com/v21.0/{{$node['Normalize WhatsApp Message'].json.business_phone_number_id}}/messages`;
  
  // Use generic Authorization token based on channel
  sendNode.parameters.headerParameters.parameters[0].value = `=Bearer {{$node['Normalize WhatsApp Message'].json.channel === 'instagram' ? $node['HTTP Request'].json.instagram_token : $node['HTTP Request'].json.whatsapp_token}}`;
  
  // Change JSON Body dynamically based on channel
  const newBody = `={
  "messaging_product": "{{ $node['Normalize WhatsApp Message'].json.channel === 'instagram' ? '' : 'whatsapp' }}",
  "recipient": "{{ $node['Normalize WhatsApp Message'].json.channel === 'instagram' ? { id: $json.from } : undefined }}",
  "to": "{{ $node['Normalize WhatsApp Message'].json.channel === 'instagram' ? undefined : $json.from }}",
  "type": "text",
  "message": { "text": {{ $node['Normalize WhatsApp Message'].json.channel === 'instagram' ? JSON.stringify($json.reply) : undefined }} },
  "text": { "body": {{ $node['Normalize WhatsApp Message'].json.channel === 'instagram' ? undefined : JSON.stringify($json.reply) }} }
}`;
  
  // We need to parse and reconstruct the json string correctly. N8n evaluates expressions.
  // We will build a unified body
  sendNode.parameters.jsonBody = `={{
  $node['Normalize WhatsApp Message'].json.channel === 'instagram' 
  ? { recipient: { id: $json.from }, message: { text: $json.reply } } 
  : { messaging_product: "whatsapp", to: $json.from, type: "text", text: { body: $json.reply } }
}}`;
}

// 4. Update the "Fallback to User" node as well
const fallbackNode = workflow.nodes.find(n => n.name === 'Fallback to User');
if (fallbackNode) {
  fallbackNode.parameters.headerParameters.parameters[0].value = `=Bearer {{$node['Normalize WhatsApp Message'].json.channel === 'instagram' ? $node['HTTP Request'].json.instagram_token : $node['HTTP Request'].json.whatsapp_token}}`;
  
  fallbackNode.parameters.jsonBody = `={{
  $node['Normalize WhatsApp Message'].json.channel === 'instagram' 
  ? { recipient: { id: $node['Normalize WhatsApp Message'].json.from }, message: { text: "⚠️ Disculpa, en este momento estoy experimentando intermitencias técnicas y mi cerebro está reiniciándose. En breve un agente humano tomará tu caso." } } 
  : { messaging_product: "whatsapp", to: $node['Normalize WhatsApp Message'].json.from, type: "text", text: { body: "⚠️ Disculpa, en este momento estoy experimentando intermitencias técnicas y mi cerebro está reiniciándose. En breve un agente humano tomará tu caso." } }
}}`;
}

fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2));
console.log('Workflow successfully patched for Instagram support.');
