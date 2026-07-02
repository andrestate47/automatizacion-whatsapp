import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Evolution API Config (Placeholder)
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "YOUR_GLOBAL_API_KEY";
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || "robotina-1";

// Spintax logic copied for the worker
function processSpintax(text) {
  if (!text) return '';
  const regex = /\{([^{}]+)\}/g;
  return text.replace(regex, (match, contents) => {
    const options = contents.split('|');
    const randomIndex = Math.floor(Math.random() * options.length);
    return options[randomIndex];
  });
}

function getRandomDelay(minSeconds = 8, maxSeconds = 15) {
  return Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) * 1000;
}

async function sendToEvolution(phoneNumber, message) {
  console.log(`[Evolution API] Enviando mensaje a ${phoneNumber}...`);
  try {
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: phoneNumber,
        options: { delay: 1200 },
        textMessage: { text: message }
      })
    });
    
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Fallo al enviar a Evolution: ${response.status} ${errText}`);
    }
    console.log(`[Evolution API] Mensaje enviado a ${phoneNumber} con éxito.`);
    return true;
  } catch (error) {
    console.error("[Evolution API] Error de conexión:", error.message);
    throw error;
  }
}

async function processQueue() {
  console.log("Revisando la cola de mensajes...");
  
  try {
    // 1. Obtener 1 mensaje pendiente
    const { data: messages, error: fetchError } = await supabase
      .from('whatsapp_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (fetchError) throw fetchError;

    if (!messages || messages.length === 0) {
      // No hay mensajes, esperar 10 segundos antes de checar de nuevo
      setTimeout(processQueue, 10000);
      return;
    }

    const task = messages[0];
    console.log(`Procesando tarea ID: ${task.id} para número: ${task.phone_number}`);

    // 2. Marcar como procesando
    await supabase
      .from('whatsapp_queue')
      .update({ status: 'processing' })
      .eq('id', task.id);

    // 3. Aplicar Spintax
    const finalMessage = processSpintax(task.message);
    console.log(`Mensaje original: ${task.message}`);
    console.log(`Mensaje con Spintax: ${finalMessage}`);

    // 4. Enviar a Evolution API
    await sendToEvolution(task.phone_number, finalMessage);

    // 5. Marcar como enviado
    await supabase
      .from('whatsapp_queue')
      .update({ status: 'sent', processed_at: new Date().toISOString() })
      .eq('id', task.id);

    // 6. Esperar un tiempo aleatorio humano (ej. 1 a 3 minutos para mayor seguridad anti-ban)
    const delay = getRandomDelay(60, 180);
    console.log(`Éxito. Esperando ${delay / 1000} segundos (comportamiento humano avanzado) antes del siguiente mensaje...`);
    
    setTimeout(processQueue, delay);

  } catch (error) {
    console.error("Error en processQueue:", error);
    // Podríamos marcar la tarea como fallida si tenemos el ID en el scope
    setTimeout(processQueue, 15000); // Reintentar loop con más tiempo en caso de error
  }
}

console.log("Iniciando WhatsApp Worker Anti-Ban...");
processQueue();
