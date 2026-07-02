import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
)

serve(async (req) => {
  const { method } = req
  if (method === "GET") {
    const url = new URL(req.url)
    const mode = url.searchParams.get("hub.mode")
    const token = url.searchParams.get("hub.verify_token")
    const challenge = url.searchParams.get("hub.challenge")
    if (mode === "subscribe" && token === "robotina_token_2024") {
      return new Response(challenge, { status: 200 })
    }
    return new Response("Forbidden", { status: 403 })
  }

  try {
    const body = await req.json()
    console.log("Webhook received:", JSON.stringify(body, null, 2))

    if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const msg = body.entry[0].changes[0].value.messages[0]
      const from = msg.from
      const customerName = body.entry[0].changes[0].value.contacts?.[0]?.profile?.name || "Cliente WhatsApp"
      const incomingPhoneNumberId = body.entry[0].changes[0].value.metadata?.phone_number_id || "1091076967420278";
      
      // Obtener token de Meta
      const { data: tenantInfo } = await supabase
        .from('tenants')
        .select('whatsapp_token')
        .eq('phone_number_id', incomingPhoneNumberId)
        .single();

      const metaToken = tenantInfo?.whatsapp_token || Deno.env.get("META_API_TOKEN") || "";

      let messageBody = msg.text?.body || "";
      let mediaUrl = null;
      let mediaType = null;

      // Procesamiento de multimedia (video o imagen)
      if (msg.type === 'video' && msg.video?.id) {
        mediaType = 'video';
        messageBody = msg.video.caption || "Video";
        try {
          const getMediaResponse = await fetch(`https://graph.facebook.com/v25.0/${msg.video.id}`, {
            headers: { "Authorization": `Bearer ${metaToken}` }
          });
          const mediaMetadata = await getMediaResponse.json();
          if (mediaMetadata.url) {
            const downloadResponse = await fetch(mediaMetadata.url, {
              headers: { "Authorization": `Bearer ${metaToken}` }
            });
            const fileBlob = await downloadResponse.blob();
            const filePath = `${msg.video.id}.mp4`;
            
            const { error: uploadError } = await supabase.storage
              .from('chat_media')
              .upload(filePath, fileBlob, {
                contentType: mediaMetadata.mime_type || 'video/mp4',
                upsert: true
              });
              
            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('chat_media')
                .getPublicUrl(filePath);
              mediaUrl = publicUrl;
            } else {
              console.error("Storage upload error:", uploadError);
            }
          }
        } catch (mediaErr) {
          console.error("Error downloading video from Meta:", mediaErr);
        }
      } else if (msg.type === 'image' && msg.image?.id) {
        mediaType = 'image';
        messageBody = msg.image.caption || "Imagen";
        try {
          const getMediaResponse = await fetch(`https://graph.facebook.com/v25.0/${msg.image.id}`, {
            headers: { "Authorization": `Bearer ${metaToken}` }
          });
          const mediaMetadata = await getMediaResponse.json();
          if (mediaMetadata.url) {
            const downloadResponse = await fetch(mediaMetadata.url, {
              headers: { "Authorization": `Bearer ${metaToken}` }
            });
            const fileBlob = await downloadResponse.blob();
            const filePath = `${msg.image.id}.jpg`;
            
            const { error: uploadError } = await supabase.storage
              .from('chat_media')
              .upload(filePath, fileBlob, {
                contentType: mediaMetadata.mime_type || 'image/jpeg',
                upsert: true
              });
              
            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('chat_media')
                .getPublicUrl(filePath);
              mediaUrl = publicUrl;
            }
          }
        } catch (mediaErr) {
          console.error("Error downloading image from Meta:", mediaErr);
        }
      } else if (!messageBody) {
        messageBody = "Mensaje multimedia";
      }

      // 1. Find or Create Customer
      let customer;
      const { data: existingCustomer } = await supabase.from('customers').select('*').eq('phone_number', from).maybeSingle();
      if (existingCustomer) {
        customer = existingCustomer;
        await supabase.from('customers').update({ name: customerName, last_order_date: new Date().toISOString() }).eq('id', customer.id);
      } else {
        const { data: newCust, error: custError } = await supabase.from('customers').insert({ phone_number: from, name: customerName, last_order_date: new Date().toISOString() }).select().single();
        if (custError) throw custError;
        customer = newCust;
      }

      // 2. Find or Create Chat
      let chat;
      const { data: existingChat } = await supabase.from('whatsapp_chats').select('*').eq('customer_id', customer.id).maybeSingle();
      if (existingChat) {
        chat = existingChat;
        await supabase.from('whatsapp_chats').update({ last_message: messageBody, contact_name: customerName, last_message_at: new Date().toISOString() }).eq('id', chat.id);
      } else {
        const { data: newChat, error: chatError } = await supabase.from('whatsapp_chats').insert({ customer_id: customer.id, last_message: messageBody, contact_name: customerName, last_message_at: new Date().toISOString() }).select().single();
        if (chatError) throw chatError;
        chat = newChat;
      }

      // 3. Guardar Mensaje Entrante
      await supabase.from('whatsapp_messages').insert({
        chat_id: chat.id,
        direction: 'inbound',
        message_body: messageBody,
        media_url: mediaUrl,
        media_type: mediaType
      })

      // Si el bot ya está inactivo (modo humano), salir de inmediato y no responder
      if (chat.is_bot_active === false) {
        console.log(`Human mode is active for chat ${chat.id}. Skipping auto-response.`);
        return new Response("OK", { status: 200 });
      }

      // -------------------------------------------------------
      // FLUJO DE VENTA SECUENCIAL DE ROBOTINA
      // Etapas basadas en cuántos mensajes SALIENTES ha enviado el bot:
      //   0 → Saludo + pregunta a qué se dedica
      //   1 → Reconocer negocio + preguntar volumen de mensajes
      //   2 → Reconocer volumen + mostrar menú de opciones
      //   3+ → Manejar selección del menú
      // -------------------------------------------------------
      const msg_lower = messageBody.toLowerCase().trim();

      // Contar mensajes SALIENTES del bot en este chat
      const { count: outboundCount } = await supabase
        .from('whatsapp_messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chat.id)
        .eq('direction', 'outbound');

      const botStep = outboundCount ?? 0;

      let botReply = "";
      let sendVideo = false;
      let triggerHumanMode = false;

      // ── Etapa 0: Primer contacto ──
      if (botStep === 0) {
        botReply = `¡Hola, ${customerName}! 👋 Soy *Robotina*, asistente de automatización de WhatsApp. 🤖

Ayudo a negocios como el tuyo a responder clientes automáticamente, 24/7, sin perder ninguna venta.

¿A qué se dedica tu negocio o empresa? 🏢`;

      // ── Etapa 1: Conocer el volumen de mensajes ──
      } else if (botStep === 1) {
        botReply = `¡Qué interesante, ${customerName}! 🙌 Ese tipo de negocios suelen perder muchas ventas por no responder a tiempo.

Una pregunta clave: ¿cuántos mensajes de WhatsApp reciben *al día* aproximadamente? 📩

(Por ejemplo: "unos 10", "entre 20 y 30", "más de 50")`;

      // ── Etapa 2: Mostrar menú de opciones ──
      } else if (botStep === 2) {
        // Identificar si el volumen es bajo (≤5) para personalizar
        const isLowVolume = /\b[0-5]\b/.test(msg_lower) || ["1", "2", "3", "4", "5", "uno", "dos", "tres", "cuatro", "cinco", "pocos", "poco"].some(w => msg_lower.includes(w));

        if (isLowVolume) {
          botReply = `Entendido. Aunque sea poco volumen hoy, Robotina puede ayudarte a escalar tu negocio y no perder ninguna oportunidad cuando crezca. 📈

¿Cómo querés continuar?

*1️⃣ Ver video corto* — Te muestro cómo funciona en 60 segundos.
*2️⃣ Hablar con un asesor* — Te explico cómo puede funcionar para tu negocio.
*3️⃣ Agendar una demo* — Mostrá interés haciendo click en 👉 *"Quiero Automatizar Mi WhatsApp"* en nuestra web.

Respondé con 1, 2 o 3. 😊`;
        } else {
          botReply = `¡Perfecto! Con ese volumen de mensajes, Robotina puede ahorrarte horas de trabajo y recuperar ventas que hoy se pierden por no responder a tiempo. ⚡

¿Cómo querés continuar?

*1️⃣ Ver video corto* — Te muestro cómo funciona en 60 segundos.
*2️⃣ Hablar con un asesor* — Un humano te atiende ahora mismo.
*3️⃣ Agendar una demo gratuita* — Entrá a la web y tocá 👉 *"Quiero Automatizar Mi WhatsApp"*.

Respondé con 1, 2 o 3. 😊`;
        }

      // ── Etapa 3+: Manejar respuesta del menú ──
      } else {
        const isOption1 = /^1$/.test(msg_lower) || ["video", "ver video", "ver el video", "manda el video", "muéstrame", "muestrame", "quiero ver"].some(w => msg_lower.includes(w));
        const isOption2 = /^2$/.test(msg_lower) || ["humano", "persona", "asesor", "agente", "hablar", "quiero hablar", "soporte"].some(w => msg_lower.includes(w));
        const isOption3 = /^3$/.test(msg_lower) || ["demo", "agendar", "quiero automatizar", "reunion", "reunión", "cita", "meeting", "automatizar"].some(w => msg_lower.includes(w));

        if (isOption1) {
          botReply = `¡Genial! 🎬 Mirá este video de 60 segundos y vas a entender exactamente cómo Robotina puede transformar la atención de tu negocio en WhatsApp. 👇`;
          sendVideo = true;
        } else if (isOption2) {
          botReply = `¡Perfecto, ${customerName}! 👤 Ya notifiqué a uno de nuestros asesores. Se va a comunicar contigo en breve para mostrarte cómo Robotina puede funcionar para tu negocio específicamente. ¡Gracias por tu paciencia! 🙏`;
          triggerHumanMode = true;
        } else if (isOption3) {
          botReply = `¡Excelente decisión, ${customerName}! 🚀

Para agendar tu demo gratuita (15-20 min, sin compromiso), entrá a nuestra web y hacé click en el botón naranja:

👉 *"Quiero Automatizar Mi WhatsApp"*

🔗 https://robotinacentral.com/

Ahí vas a poder elegir el día y horario que mejor te quede. ¡Te esperamos! 📅`;
        } else {
          // No reconocido: re-mostrar opciones
          botReply = `No entendí bien, ¡pero tranquilo! 😊 Respondé simplemente con el número:

*1* → Ver video corto
*2* → Hablar con un asesor
*3* → Agendar demo (entrá a la web y tocá *"Quiero Automatizar Mi WhatsApp"*)`;
        }
      }

      // Aplicar handoff humano si fue solicitado
      if (triggerHumanMode) {
        await supabase
          .from('whatsapp_chats')
          .update({ is_bot_active: false })
          .eq('id', chat.id);
      }

      // Construir payload de Meta
      let metaPayload;
      if (sendVideo) {
        metaPayload = {
          messaging_product: "whatsapp",
          to: from,
          type: "video",
          video: {
            link: "https://robotinacentral.com/videoCorto.mp4",
            caption: botReply
          }
        };
      } else {
        metaPayload = {
          messaging_product: "whatsapp",
          to: from,
          text: { body: botReply }
        };
      }

      const metaResponse = await fetch(`https://graph.facebook.com/v25.0/${incomingPhoneNumberId}/messages`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${metaToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(metaPayload)
      })

      const metaData = await metaResponse.json()
      console.log("Meta Response:", metaData)

      // 5. Guardar Respuesta del Bot
      await supabase.from('whatsapp_messages').insert({
        chat_id: chat.id,
        direction: 'outbound',
        message_body: botReply,
        media_url: sendVideo ? "https://robotinacentral.com/videoCorto.mp4" : null,
        media_type: sendVideo ? "video" : null
      })
    }

    return new Response("OK", { status: 200 })
  } catch (err) {
    console.error("Critical Webhook Error:", err)
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
