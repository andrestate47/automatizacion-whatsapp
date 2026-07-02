-- 1. Agregar columnas para URLs de medios y tipo de medio
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS media_type TEXT;

-- 2. Actualizar función RPC registrar_mensaje con argumentos por defecto
CREATE OR REPLACE FUNCTION public.registrar_mensaje(
    p_phone TEXT,
    p_message TEXT,
    p_direction TEXT,
    p_customer_name TEXT DEFAULT 'Cliente WhatsApp',
    p_media_url TEXT DEFAULT NULL,
    p_media_type TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_customer_id UUID;
    v_chat_id UUID;
    v_result JSONB;
BEGIN
    -- 1. Upsert del cliente
    INSERT INTO public.customers (phone_number, name)
    VALUES (p_phone, p_customer_name)
    ON CONFLICT (phone_number) DO UPDATE 
    SET name = EXCLUDED.name
    RETURNING id INTO v_customer_id;

    -- 2. Upsert del chat
    INSERT INTO public.whatsapp_chats (customer_id, phone_number, contact_name, last_message, last_message_at)
    VALUES (v_customer_id, p_phone, p_customer_name, COALESCE(p_message, 'Mensaje multimedia'), NOW())
    ON CONFLICT (phone_number) DO UPDATE 
    SET last_message = EXCLUDED.last_message, 
        last_message_at = EXCLUDED.last_message_at
    RETURNING id INTO v_chat_id;

    -- 3. Insertar el mensaje con columnas multimedia
    INSERT INTO public.whatsapp_messages (chat_id, direction, message_body, media_url, media_type)
    VALUES (v_chat_id, p_direction, p_message, p_media_url, p_media_type);

    SELECT jsonb_build_object('chat_id', v_chat_id, 'customer_id', v_customer_id) INTO v_result;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear políticas RLS en storage.objects para el bucket chat_media
DROP POLICY IF EXISTS "Permitir subidas públicas a chat_media" ON storage.objects;
DROP POLICY IF EXISTS "Permitir lectura pública en chat_media" ON storage.objects;

CREATE POLICY "Permitir subidas públicas a chat_media" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'chat_media');

CREATE POLICY "Permitir lectura pública en chat_media" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'chat_media');
