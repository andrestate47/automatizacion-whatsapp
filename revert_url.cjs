const fs = require('fs');
const file = 'expanded_workflow.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

data.nodes.forEach(n => {
  if (n.name === 'Send WhatsApp Message') {
    n.parameters.url = "=https://graph.facebook.com/v21.0/{{$node['Normalize WhatsApp Message'].json.business_phone_number_id}}/messages";
  }
});

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Reverted Send WhatsApp Message URL!');
