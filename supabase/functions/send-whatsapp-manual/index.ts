import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone, message, mediaUrl, mediaType } = await req.json()

    if (!phone) {
      return new Response(JSON.stringify({ error: 'Phone is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const phoneNumberId = Deno.env.get("PHONE_NUMBER_ID") || "1091076967420278"; // Changed fallback to match webhook's incomingPhoneNumberId fallback
    const metaToken = Deno.env.get("META_API_TOKEN") || "EAAdRNS7bknMBR8T7JBwaFkRp8LRfyZCubiRROG272VcuEHwUI0MaYy4ZBn80CeeABo0Mm7hr3Q2V418DD2VFizCFWx1yQj8ZAFjTioqEKLWVedlUgLu0AGhpFrSlKHRWkRym8kmpVhZAqUZAkReptYWoAf7lmnpae4FZBv5NaKnHLBlNi3RIvS9WCUS2yNK2fCzQZDZD";

    // 2. Prepare payload
    let metaPayload;
    if (mediaUrl && mediaType === 'video') {
      metaPayload = {
        messaging_product: "whatsapp",
        to: phone,
        type: "video",
        video: {
          link: mediaUrl,
          caption: message || ""
        }
      };
    } else if (mediaUrl && mediaType === 'image') {
      metaPayload = {
        messaging_product: "whatsapp",
        to: phone,
        type: "image",
        image: {
          link: mediaUrl,
          caption: message || ""
        }
      };
    } else {
      metaPayload = {
        messaging_product: "whatsapp",
        to: phone,
        text: { body: message || "" }
      };
    }

    // 3. Send to Meta API
    const metaResponse = await fetch(`https://graph.facebook.com/v25.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${metaToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(metaPayload)
    })

    const metaData = await metaResponse.json()

    if (!metaResponse.ok) {
      console.error("Meta API error:", metaData);
      return new Response(JSON.stringify({ error: metaData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: metaResponse.status,
      })
    }

    return new Response(JSON.stringify({ success: true, data: metaData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
