import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "YOUR_GLOBAL_API_KEY";
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || "robotina-1";

// Lista de números amigos para calentar el chip
// ¡IMPORTANTE! Agrega aquí números tuyos, de amigos o familiares que te tengan agendado.
const SAFE_NUMBERS = [
    // "5215555555555",
    // "5491112345678"
];

const WARMUP_MESSAGES = [
    "Hola, ¿cómo estás?",
    "¡Buenas! ¿Todo bien?",
    "¿Qué tal tu día?",
    "Te escribo para probar que me funciona bien este número",
    "Acabo de cambiar de número, agendame porfa.",
    "Hola hola, probando...",
    "¿Me confirmas si te llega este mensaje?",
    "Saludos, ¿cómo andamos?",
    "¡Ey! ¿Qué cuentas?",
    "Excelente día, estamos en contacto"
];

function getRandomDelay(minSeconds, maxSeconds) {
    return Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) * 1000;
}

async function sendWarmupMessage(phoneNumber) {
    const randomMessage = WARMUP_MESSAGES[Math.floor(Math.random() * WARMUP_MESSAGES.length)];
    console.log(`[Warmup] Enviando mensaje a ${phoneNumber}: "${randomMessage}"`);

    try {
        const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': EVOLUTION_API_KEY
            },
            body: JSON.stringify({
                number: phoneNumber,
                options: { delay: 1500 },
                textMessage: { text: randomMessage }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Error Evolution API: ${response.status} ${errText}`);
        }
        console.log(`[Warmup] Éxito enviando a ${phoneNumber}`);
    } catch (error) {
        console.error(`[Warmup] Fallo enviando a ${phoneNumber}:`, error.message);
    }
}

async function startWarmup() {
    console.log("Iniciando secuencia de Warmup (Calentamiento)...");
    
    if (SAFE_NUMBERS.length === 0) {
        console.error("No hay números seguros en SAFE_NUMBERS. Añade números en el script para calentar.");
        return;
    }

    // Barajar la lista de números seguros
    const shuffledNumbers = SAFE_NUMBERS.sort(() => 0.5 - Math.random());

    for (let i = 0; i < shuffledNumbers.length; i++) {
        await sendWarmupMessage(shuffledNumbers[i]);
        
        // Retraso entre mensajes de 1 a 3 minutos
        const delay = getRandomDelay(60, 180);
        console.log(`Esperando ${delay / 1000} segundos antes del siguiente...`);
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    console.log("Ciclo de calentamiento finalizado.");
}

startWarmup();
