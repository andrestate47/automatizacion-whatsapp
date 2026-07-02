-- ============================================================
-- 🚀 ROBOTINA SAAS — MIGRACIÓN MULTI-TENANT
-- Ejecutar en: Supabase → SQL Editor → New Query
-- Orden: ejecutar COMPLETO de una sola vez
-- ============================================================


-- ============================================================
-- PASO 1: TABLA PRINCIPAL DE TENANTS (clientes de Robotina)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tenants (
  id                UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_name     TEXT        NOT NULL,
  business_type     TEXT        DEFAULT 'restaurant',         -- restaurant, store, service, etc.
  phone_number_id   TEXT        UNIQUE NOT NULL,              -- phone_number_id de Meta (identifica al tenant)
  waba_id           TEXT,                                     -- WhatsApp Business Account ID de Meta
  whatsapp_token    TEXT        NOT NULL DEFAULT '',          -- Token permanente del cliente
  whatsapp_phone    TEXT,                                     -- Número de WhatsApp del negocio (ej: +51987654321)
  openai_key        TEXT,                                     -- API Key de OpenAI propia (opcional, si no usa la de Robotina)
  system_prompt     TEXT        NOT NULL DEFAULT 'Eres un asistente virtual amigable. Ayuda con pedidos, reservas y consultas del negocio.',
  plan              TEXT        NOT NULL DEFAULT 'starter',   -- starter, growth, advanced
  is_active         BOOLEAN     DEFAULT true,
  trial_ends_at     TIMESTAMPTZ,
  owner_user_id     UUID        REFERENCES auth.users(id),    -- Usuario dueño en el dashboard
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar que las columnas existan si la tabla fue creada en un intento previo
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'restaurant';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS phone_number_id TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS whatsapp_token TEXT NOT NULL DEFAULT '';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS waba_id TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS openai_key TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS system_prompt TEXT NOT NULL DEFAULT 'Eres un asistente virtual amigable.';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'starter';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id);

-- Índice para búsqueda rápida por phone_number_id (se usa en cada mensaje)
CREATE INDEX IF NOT EXISTS idx_tenants_phone_number_id ON public.tenants(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON public.tenants(owner_user_id);


-- ============================================================
-- PASO 2: TABLA DE USUARIOS POR TENANT
-- (para cuando un tenant tenga múltiples empleados en el dashboard)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tenant_users (
  id          UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id   UUID    NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT    NOT NULL DEFAULT 'admin',  -- admin, viewer
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);


-- ============================================================
-- PASO 3: AGREGAR tenant_id A TODAS LAS TABLAS EXISTENTES
-- ============================================================

-- menu_items
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- reservations
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- branches
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- whatsapp_chats
ALTER TABLE public.whatsapp_chats
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- whatsapp_messages
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- conversation_logs
ALTER TABLE public.conversation_logs
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- processed_messages
ALTER TABLE public.processed_messages
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Índices para performance en queries por tenant
CREATE INDEX IF NOT EXISTS idx_menu_items_tenant    ON public.menu_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant        ON public.orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_tenant  ON public.reservations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant     ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chats_tenant         ON public.whatsapp_chats(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conv_logs_tenant     ON public.conversation_logs(tenant_id);


-- ============================================================
-- PASO 4: FUNCIÓN RPC — resolver_tenant
-- Usada por n8n en cada mensaje entrante de WhatsApp
-- ============================================================

CREATE OR REPLACE FUNCTION public.resolver_tenant(p_phone_number_id TEXT)
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'id',             id,
    'business_name',  business_name,
    'business_type',  business_type,
    'whatsapp_token', whatsapp_token,
    'openai_key',     openai_key,
    'system_prompt',  system_prompt,
    'plan',           plan,
    'is_active',      is_active
  )
  FROM public.tenants
  WHERE phone_number_id = p_phone_number_id
    AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;


-- ============================================================
-- PASO 5: ACTUALIZAR FUNCIONES RPC EXISTENTES CON tenant_id
-- ============================================================

-- RPC: registrar_mensaje (actualizada con tenant_id)
CREATE OR REPLACE FUNCTION public.registrar_mensaje(
  p_phone         TEXT,
  p_message       TEXT,
  p_direction     TEXT,
  p_customer_name TEXT    DEFAULT 'Cliente WhatsApp',
  p_tenant_id     UUID    DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_customer_id UUID;
  v_chat_id     UUID;
  v_result      JSONB;
BEGIN
  -- Upsert del cliente
  INSERT INTO public.customers (phone_number, name, tenant_id)
  VALUES (p_phone, p_customer_name, p_tenant_id)
  ON CONFLICT (phone_number, tenant_id) DO UPDATE
    SET name = EXCLUDED.name
  RETURNING id INTO v_customer_id;

  -- Upsert del chat
  INSERT INTO public.whatsapp_chats
    (customer_id, phone, contact_name, last_message, last_message_at, tenant_id)
  VALUES
    (v_customer_id, p_phone, p_customer_name, p_message, NOW(), p_tenant_id)
  ON CONFLICT (customer_id) DO UPDATE
    SET last_message    = EXCLUDED.last_message,
        last_message_at = EXCLUDED.last_message_at
  RETURNING id INTO v_chat_id;

  -- Insertar mensaje
  INSERT INTO public.whatsapp_messages (chat_id, direction, message_body, tenant_id)
  VALUES (v_chat_id, p_direction, p_message, p_tenant_id);

  SELECT jsonb_build_object(
    'chat_id',     v_chat_id,
    'customer_id', v_customer_id
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC: crear_pedido (actualizada con tenant_id)
CREATE OR REPLACE FUNCTION public.crear_pedido(
  p_phone         TEXT,
  p_customer_name TEXT,
  p_items         JSONB,
  p_total         NUMERIC,
  p_source        TEXT  DEFAULT 'whatsapp',
  p_tenant_id     UUID  DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_customer_id UUID;
  v_order_code  TEXT;
  v_new_id      UUID;
BEGIN
  -- Obtener o crear cliente
  INSERT INTO public.customers (phone_number, name, tenant_id)
  VALUES (p_phone, p_customer_name, p_tenant_id)
  ON CONFLICT (phone_number, tenant_id) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_customer_id;

  -- Generar código de pedido
  v_order_code := '#WA-' || floor(random() * (9999-1000+1) + 1000)::text;

  -- Insertar pedido
  INSERT INTO public.orders
    (order_code, customer_id, items_json, total_amount, source, status, tenant_id)
  VALUES
    (v_order_code, v_customer_id, p_items, p_total, p_source, 'Pendiente', p_tenant_id)
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('id', v_new_id, 'order_code', v_order_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- PASO 6: ROW LEVEL SECURITY (RLS) para el dashboard
-- El bot usa service_role (bypasea RLS). El dashboard usa anon/user.
-- ============================================================

-- Activar RLS
ALTER TABLE public.menu_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_chats    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_logs ENABLE ROW LEVEL SECURITY;

-- Helper: obtener tenant_id del usuario logueado
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.tenant_users
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Políticas RLS (solo ven sus propios datos)
CREATE POLICY "tenant_menu_items"     ON public.menu_items
  USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "tenant_orders"         ON public.orders
  USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "tenant_reservations"   ON public.reservations
  USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "tenant_customers"      ON public.customers
  USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "tenant_branches"       ON public.branches
  USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "tenant_chats"          ON public.whatsapp_chats
  USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "tenant_conv_logs"      ON public.conversation_logs
  USING (tenant_id = public.get_my_tenant_id());


-- ============================================================
-- PASO 7: INSERTAR TU PRIMER TENANT (cliente de prueba)
-- ⚠️ Reemplaza los valores entre < > con los datos reales
-- ============================================================

INSERT INTO public.tenants (
  business_name,
  business_type,
  phone_number_id,
  whatsapp_token,
  whatsapp_phone,
  system_prompt,
  plan,
  is_active
) VALUES (
  -- ✏️  CAMBIO 1: nombre del negocio
  'Robotina Principal',

  'software',

  -- ✏️  CAMBIO 2: phone_number_id de Meta
  '1091076967420278',

  -- ✏️  CAMBIO 3: token permanente de WhatsApp
  'EAAdRNS7bknMBR8T7JBwaFkRp8LRfyZCubiRROG272VcuEHwUI0MaYy4ZBn80CeeABo0Mm7hr3Q2V418DD2VFizCFWx1yQj8ZAFjTioqEKLWVedlUgLu0AGhpFrSlKHRWkRym8kmpVhZAqUZAkReptYWoAf7lmnpae4FZBv5NaKnHLBlNi3RIvS9WCUS2yNK2fCzQZDZD',

  -- ✏️  CAMBIO 4: tu número de WhatsApp con código de país
  '+1234567890', -- Reemplaza esto con tu número real si lo deseas

  'Eres Robotina, la asistente virtual principal. Responde siempre en español. Ayuda con consultas y procesos de manera profesional, amigable y concisa.',
  'advanced',
  true
);

-- Actualizar registros existentes para asignarlos al primer tenant
-- (para que los datos históricos no queden huérfanos)
UPDATE public.menu_items     SET tenant_id = (SELECT id FROM public.tenants LIMIT 1) WHERE tenant_id IS NULL;
UPDATE public.orders         SET tenant_id = (SELECT id FROM public.tenants LIMIT 1) WHERE tenant_id IS NULL;
UPDATE public.reservations   SET tenant_id = (SELECT id FROM public.tenants LIMIT 1) WHERE tenant_id IS NULL;
UPDATE public.customers      SET tenant_id = (SELECT id FROM public.tenants LIMIT 1) WHERE tenant_id IS NULL;
UPDATE public.branches       SET tenant_id = (SELECT id FROM public.tenants LIMIT 1) WHERE tenant_id IS NULL;
UPDATE public.whatsapp_chats SET tenant_id = (SELECT id FROM public.tenants LIMIT 1) WHERE tenant_id IS NULL;
UPDATE public.conversation_logs SET tenant_id = (SELECT id FROM public.tenants LIMIT 1) WHERE tenant_id IS NULL;
UPDATE public.processed_messages SET tenant_id = (SELECT id FROM public.tenants LIMIT 1) WHERE tenant_id IS NULL;


-- ============================================================
-- PASO 8: VERIFICACIÓN — ejecuta estas queries para confirmar
-- ============================================================

-- ¿Se creó el tenant?
-- SELECT * FROM public.tenants;

-- ¿Funciona el resolver?
-- SELECT public.resolver_tenant('1111633475368085');

-- ¿Tienen tenant_id los registros existentes?
-- SELECT COUNT(*) FROM public.orders WHERE tenant_id IS NOT NULL;
-- SELECT COUNT(*) FROM public.menu_items WHERE tenant_id IS NOT NULL;

-- ============================================================
-- ✅ FIN DEL SCRIPT
-- Siguiente paso: agregar nodo "Resolver Tenant" en n8n
-- ============================================================
