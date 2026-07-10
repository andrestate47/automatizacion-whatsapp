-- ============================================================
-- 🚀 INTEGRACIÓN INSTAGRAM — ACTUALIZACIÓN MULTI-TENANT
-- ============================================================

-- 1. Agregar columnas para Instagram en la tabla tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS instagram_page_id TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS instagram_token TEXT;

-- Índice para búsqueda rápida por instagram_page_id
CREATE INDEX IF NOT EXISTS idx_tenants_instagram_page_id ON public.tenants(instagram_page_id);

-- 2. Modificar la función resolver_tenant para soportar Instagram
DROP FUNCTION IF EXISTS public.resolver_tenant(text);

CREATE OR REPLACE FUNCTION public.resolver_tenant(
  p_identifier TEXT -- Puede ser phone_number_id (WhatsApp) o page_id (Instagram)
)
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'id',             id,
    'business_name',  business_name,
    'business_type',  business_type,
    'whatsapp_token', whatsapp_token,
    'instagram_token', instagram_token,
    'openai_key',     openai_key,
    'system_prompt',  system_prompt,
    'plan',           plan,
    'is_active',      is_active
  )
  FROM public.tenants
  WHERE (phone_number_id = p_identifier OR instagram_page_id = p_identifier)
    AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- ✅ FIN DEL SCRIPT
-- ============================================================
