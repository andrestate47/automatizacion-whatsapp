const url = "https://graph.facebook.com/v25.0/1091076967420278/messages";
const token = "EAAdRNS7bknMBR8T7JBwaFkRp8LRfyZCubiRROG272VcuEHwUI0MaYy4ZBn80CeeABo0Mm7hr3Q2V418DD2VFizCFWx1yQj8ZAFjTioqEKLWVedlUgLu0AGhpFrSlKHRWkRym8kmpVhZAqUZAkReptYWoAf7lmnpae4FZBv5NaKnHLBlNi3RIvS9WCUS2yNK2fCzQZDZD";

const payload = {
  "messaging_product": "whatsapp",
  "to": "51957363566",
  "type": "template",
  "template": {
    "name": "hello_world",
    "language": {
      "code": "en_US"
    }
  }
};

fetch(url, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
})
.then(r => r.json())
.then(data => {
    console.log("Respuesta de Meta:");
    console.log(data);
})
.catch(console.error);
