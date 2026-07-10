# Arquitectura y Estructura Robotina

La arquitectura de **Robotina-Céntral** está diseñada como una Single Page Application (SPA) para el cliente, soportada por una infraestructura backend Serverless y dirigida por eventos.

## Capas del Sistema
1. **Frontend (Dashboard Cliente):** Construido en React 19. Gestiona 10 módulos principales: Dashboard, Kanban Logístico, Terminal Cocina KDS, CRM Clientes, Menú Bidireccional, BI (Analíticas), Telemetría del Bot, Marketing, Configuración y Auditoría.
2. **Backend (Database & Auth):** Supabase aloja PostgreSQL, maneja la autenticación y despacha eventos en tiempo real usando Supabase Realtime (Sockets).
3. **Capa de Automatización e IA:** Motor externo (típicamente n8n) que intercepta webhooks de Meta (WhatsApp), resuelve a qué inquilino pertenece vía llamadas RPC, y consulta a OpenAI antes de despachar respuestas.

## Estructura de Carpetas Clave
- `src/`: Contiene el código base de React (componentes, hooks, vistas).
- `supabase/`: Scripts SQL, migraciones y configuraciones del backend (`supabase_multitenant.sql`).
- `public/`: Recursos estáticos de la interfaz web.
- `scripts/`: Utilidades en NodeJS (ej. `simular-webhook.js`, scripts de reparación de BBDD).
- `landing/`: Archivos para la página de marketing o aterrizaje (fuera del dashboard).
- `.agents/`: Configuraciones de agentes y habilidades (ej. prompts).

---
**Notas relacionadas:** [[Stack Tecnológico Robotina]], [[Flujo Operativo Robotina]]
#arquitectura #frontend #backend #estructura
