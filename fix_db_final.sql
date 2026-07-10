-- ==============================================================================
-- 🚀 CORRECCIÓN DEFINITIVA: AGREGAR COLUMNAS FALTANTES Y LIMPIAR FUNCIONES
-- ==============================================================================

-- 0. Asegurarnos de que las columnas existen en AMBAS tablas
ALTER TABLE public.whatsapp_chats ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'whatsapp';
ALTER TABLE public.whatsapp_chats ADD COLUMN IF NOT EXISTS tenant_id UUID;

ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'whatsapp';
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 1. Eliminar TODAS las versiones anteriores de registrar_mensaje automáticamente
DO $$ 
DECLARE 
    func_record record;
BEGIN
    FOR func_record IN 
        SELECT oid::regprocedure AS func_signature 
        FROM pg_proc 
        WHERE proname = 'registrar_mensaje' AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION ' || func_record.func_signature || ' CASCADE';
    END LOOP;
END $$;

-- 2. Crear la única versión correcta
CREATE OR REPLACE FUNCTION public.registrar_mensaje(
    p_phone text,
    p_message text,
    p_direction text,
    p_customer_name text DEFAULT NULL::text,
    p_media_url text DEFAULT NULL::text,
    p_media_type text DEFAULT NULL::text,
    p_channel text DEFAULT 'whatsapp'::text,
    p_tenant_id uuid DEFAULT NULL::uuid
) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
AS $$
DECLARE
    v_chat_id uuid;
    v_message_id uuid;
    v_tenant_id uuid;
BEGIN
    -- Resolver el tenant
    IF p_tenant_id IS NOT NULL THEN
        v_tenant_id := p_tenant_id;
    ELSE
        SELECT id INTO v_tenant_id FROM public.tenants WHERE is_active = true LIMIT 1;
    END IF;

    -- Upsert del Chat (usando contact_name en vez de customer_name)
    INSERT INTO public.whatsapp_chats (
        phone, contact_name, last_message, last_message_at, channel, tenant_id
    )
    VALUES (
        p_phone, COALESCE(p_customer_name, 'Cliente'), p_message, NOW(), p_channel, v_tenant_id
    )
    ON CONFLICT (phone, tenant_id) DO UPDATE 
    SET 
        last_message = p_message,
        last_message_at = NOW(),
        contact_name = COALESCE(p_customer_name, whatsapp_chats.contact_name),
        channel = EXCLUDED.channel
    RETURNING id INTO v_chat_id;

    -- Insertar el Mensaje
    INSERT INTO public.whatsapp_messages (
        chat_id, message_body, direction, status, media_url, media_type, channel, tenant_id
    )
    VALUES (
        v_chat_id, p_message, p_direction, 
        CASE WHEN p_direction = 'inbound' THEN 'received' ELSE 'sent' END,
        p_media_url, p_media_type, p_channel, v_tenant_id
    )
    RETURNING id INTO v_message_id;

    -- Actualizar contador
    UPDATE public.whatsapp_chats
    SET unread_count = unread_count + (CASE WHEN p_direction = 'inbound' THEN 1 ELSE 0 END)
    WHERE id = v_chat_id;

    -- Retornar IDs
    RETURN jsonb_build_object('chat_id', v_chat_id, 'message_id', v_message_id);
END;
$$;

-- 3. Recargar el caché de PostgREST
NOTIFY pgrst, 'reload schema';
