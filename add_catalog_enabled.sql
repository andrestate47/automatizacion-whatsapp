-- =====================================================
-- MIGRACIÓN: Agregar control "Catálogo IA ON/OFF"
-- Ejecutar en: Supabase → SQL Editor
-- =====================================================

-- 1. Agregar columna a business_config
ALTER TABLE business_config
ADD COLUMN IF NOT EXISTS catalog_enabled BOOLEAN DEFAULT true;

-- 2. Asegurarse de que el registro existente tenga el valor por defecto
UPDATE business_config SET catalog_enabled = true WHERE catalog_enabled IS NULL;

-- =====================================================
-- PASO 2: Actualizar la URL del nodo "Consultar Catálogo" en n8n
--
-- URL ACTUAL (muestra todo):
-- https://vijzjcpkypsmkhywndus.supabase.co/rest/v1/menu_items
--   ?select=...&is_available=eq.true
--
-- URL NUEVA (respeta el toggle del dashboard):
-- Reemplaza el nodo "Consultar Catálogo" (httpRequestTool) con un
-- nodo "Code Tool" que primero verifique business_config.catalog_enabled:
--
-- Si catalog_enabled = false → devuelve: "El catálogo no está disponible en este momento."
-- Si catalog_enabled = true  → consulta menu_items normalmente
--
-- Código para el nodo Code Tool en n8n:
-- =====================================================
/*
const configRes = await this.helpers.httpRequest({
  method: 'GET',
  url: 'https://vijzjcpkypsmkhywndus.supabase.co/rest/v1/business_config?select=catalog_enabled&limit=1',
  headers: {
    'apikey': '<TU_ANON_KEY>',
    'Authorization': 'Bearer <TU_ANON_KEY>',
  },
  json: true
});

const catalogEnabled = configRes?.[0]?.catalog_enabled;

if (catalogEnabled === false) {
  return 'El catálogo de productos no está disponible en este momento. Por favor consulta directamente con nosotros.';
}

const items = await this.helpers.httpRequest({
  method: 'GET',
  url: 'https://vijzjcpkypsmkhywndus.supabase.co/rest/v1/menu_items?select=item_code,name,description,price,category,img_url,stock_status,is_available,sales_30d,keywords&is_available=eq.true',
  headers: {
    'apikey': '<TU_ANON_KEY>',
    'Authorization': 'Bearer <TU_ANON_KEY>',
  },
  json: true
});

return JSON.stringify(items);
*/
