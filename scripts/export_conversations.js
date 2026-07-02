import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse .env.local manually
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vijzjcpkypsmkhywndus.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpanpqY3BreXBzbWtoeXduZHVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY3MTM4MywiZXhwIjoyMDkwMjQ3MzgzfQ.PyYU30n4yp2z_wtIJHnzunMtc_hX8rD7xWdPNxSYTHw';

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan credenciales de Supabase en .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportConversations() {
  console.log("Obteniendo chats...");
  
  // 1. Obtener todos los chats
  const { data: chats, error: chatsError } = await supabase
    .from('whatsapp_chats')
    .select('*');

  if (chatsError) {
    console.error("Error obteniendo chats:", chatsError);
    process.exit(1);
  }

  // 2. Filtrar los chats no deseados (Andrés Figueroa, Eduardo Chapellín, Tests)
  const excludedNames = ['andres figueroa', 'andrés figueroa', 'eduardo chapellin', 'eduardo chapellín', 'test', 'prueba'];
  
  const validChats = chats.filter(chat => {
    const name = (chat.contact_name || '').toLowerCase();
    const phone = (chat.phone_number || '').toLowerCase();
    
    // Si el nombre incluye alguno de los nombres excluidos, descartar
    const isExcluded = excludedNames.some(ex => name.includes(ex));
    // Si el nombre parece de prueba o no tiene nombre, a veces es test
    const isTest = name.includes('test') || name.includes('prueba');
    
    return !isExcluded && !isTest;
  });

  console.log(`Encontrados ${validChats.length} chats válidos de un total de ${chats.length}.`);

  let markdownContent = `# Historial de Conversaciones de Robotina\n\n`;
  markdownContent += `> *Este documento contiene todas las conversaciones registradas, excluyendo números de prueba, Andrés Figueroa y Eduardo Chapellín.*\n\n---\n\n`;

  // 3. Obtener mensajes para cada chat
  for (const chat of validChats) {
    const { data: messages, error: msgsError } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: true });

    if (msgsError) {
      console.error(`Error obteniendo mensajes para el chat ${chat.id}:`, msgsError);
      continue;
    }

    if (!messages || messages.length === 0) continue;

    markdownContent += `## 👤 Cliente: ${chat.contact_name || 'Desconocido'} (+${chat.phone_number})\n`;
    const startDate = new Date(messages[0].created_at).toLocaleString('es-ES', { timeZone: 'America/Lima' });
    markdownContent += `**Fecha de inicio:** ${startDate}\n\n`;

    for (const msg of messages) {
      const time = new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' });
      
      const sender = msg.direction === 'inbound' ? (chat.contact_name || 'Cliente') : '🤖 Robotina';
      const body = msg.message_body || '[Multimedia/Vacio]';
      
      markdownContent += `**[${time}] ${sender}:** ${body.replace(/\n/g, ' ')}\n\n`;
    }

    markdownContent += `---\n\n`;
  }

  const outPath = path.join(__dirname, '../conversaciones_robotina.md');
  fs.writeFileSync(outPath, markdownContent, 'utf8');
  console.log(`¡Exportación completa! Archivo guardado en: ${outPath}`);
}

exportConversations();
