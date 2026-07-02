-- ================================================================
-- Migración: Human Handoff Support
-- Fecha: 2026-06-24
-- Descripción: Agrega la columna is_bot_active a whatsapp_chats
-- para soportar el modo humano (handoff) desde el dashboard y webhook.
-- ================================================================

-- 1. Agregar columna is_bot_active (default true = Robotina controla el chat)
ALTER TABLE public.whatsapp_chats
  ADD COLUMN IF NOT EXISTS is_bot_active BOOLEAN NOT NULL DEFAULT true;

-- 2. Comentario descriptivo en la columna
COMMENT ON COLUMN public.whatsapp_chats.is_bot_active IS
  'true = el bot responde automáticamente; false = modo humano, el bot se silencia.';
