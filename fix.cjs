const fs = require('fs');
const file = 'expanded_workflow.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

data.nodes.forEach(n => {
  if (n.name === 'Consultar Modo Humano') {
    n.parameters.url = "https://vijzjcpkypsmkhywndus.supabase.co/rest/v1/whatsapp_chats?phone=eq.{{$node['Normalize WhatsApp Message'].json.from}}&select=is_bot_active";
  }
});

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Fixed Consultar Modo Humano saved!');
