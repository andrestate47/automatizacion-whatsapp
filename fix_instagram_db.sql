-- ==============================================================================
-- 🚀 ACTUALIZACIÓN DE SEGURIDAD PARA MENSAJES DE INSTAGRAM (MULTI-TENANT)
-- ==============================================================================

-- Eliminamos la versión anterior para evitar conflictos de parámetros
DROP FUNCTION IF EXISTS public.registrar_mensaje(text, text, text, text, text, text);

-- Creamos la nueva versión que acepta p_channel y p_tenant_id
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
    -- 1. Resolver el tenant (Si no viene, tomar el primero activo como fallback)
    IF p_tenant_id IS NOT NULL THEN
        v_tenant_id := p_tenant_id;
    ELSE
        SELECT id INTO v_tenant_id FROM public.tenants WHERE is_active = true LIMIT 1;
    END IF;

    -- 2. Insertar o actualizar el Chat (Upsert) con soporte multi-tenant
    INSERT INTO public.whatsapp_chats (
        phone, 
        customer_name, 
        last_message, 
        last_message_at, 
        channel, 
        tenant_id
    )
    VALUES (
        p_phone, 
        COALESCE(p_customer_name, 'Cliente'), 
        p_message, 
        NOW(), 
        p_channel, 
        v_tenant_id
    )
    ON CONFLICT (phone, tenant_id) DO UPDATE 
    SET 
        last_message = p_message,
        last_message_at = NOW(),
        customer_name = COALESCE(p_customer_name, whatsapp_chats.customer_name),
        channel = EXCLUDED.channel
    RETURNING id INTO v_chat_id;

    -- 3. Insertar el Mensaje
    INSERT INTO public.whatsapp_messages (
        chat_id, 
        message_body, 
        direction, 
        status, 
        media_url, 
        media_type, 
        channel, 
        tenant_id
    )
    VALUES (
        v_chat_id, 
        p_message, 
        p_direction, 
        CASE WHEN p_direction = 'inbound' THEN 'received' ELSE 'sent' END,
        p_media_url, 
        p_media_type, 
        p_channel, 
        v_tenant_id
    )
    RETURNING id INTO v_message_id;

    -- 4. Actualizar contador de mensajes no leídos
    UPDATE public.whatsapp_chats
    SET unread_count = unread_count + (CASE WHEN p_direction = 'inbound' THEN 1 ELSE 0 END)
    WHERE id = v_chat_id;

    -- 5. Retornar los IDs generados
    RETURN jsonb_build_object(
        'chat_id', v_chat_id,
        'message_id', v_message_id
    );
END;
$$;
