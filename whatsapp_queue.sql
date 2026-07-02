CREATE TABLE IF NOT EXISTS public.whatsapp_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, sent, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    tenant_id UUID,
    
    -- Para permitir acceso a usuarios autenticados o service role
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'sent', 'failed'))
);

-- Habilitar RLS
ALTER TABLE public.whatsapp_queue ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Allow service role full access to whatsapp_queue"
ON public.whatsapp_queue
USING (true)
WITH CHECK (true);

-- (Opcional) Trigger para notificar en tiempo real cuando se agregue algo a la cola
-- o para procesarlo, pero el worker hará polling o usará webhooks.
