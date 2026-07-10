# Instalación y Entorno Robotina

Esta guía cubre el despliegue de la parte visual (Dashboard React). El backend está alojado Serverless en Supabase.

## Prerrequisitos
- NodeJS 18+ (o Node 20).
- Gestor de paquetes: `npm` o `pnpm` (existe un `pnpm-lock.yaml`).
- Proyecto de Supabase activo (URL y Anon Key).

## Variables de Entorno (`.env.local`)
Se requieren estrictamente las llaves de Supabase:
```env
VITE_SUPABASE_URL=tu-url-de-supabase
VITE_SUPABASE_ANON_KEY=tu-llave-secreta
```

## Pasos de Instalación
1. Clonar el repositorio.
2. Ejecutar `npm install` (o `pnpm install`).
3. Ejecutar `npm run dev` para levantar Vite en `http://localhost:5173`.
4. Para producción, usar `npm run build` para generar la SPA estática (lista para Vercel, Netlify, Cloudflare Pages).

## Despliegue de Base de Datos
El script maestro que hay que correr en el SQL Editor de Supabase es `supabase_multitenant.sql`, el cual crea todas las tablas, funciones RPC e inyecta las políticas de RLS.

---
**Notas relacionadas:** [[Arquitectura y Estructura Robotina]], [[Modelo de Datos Robotina]]
#instalacion #deploy #entorno #supabase
