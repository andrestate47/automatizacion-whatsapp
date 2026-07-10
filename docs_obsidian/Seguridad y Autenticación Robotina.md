# Seguridad y Autenticación Robotina

El sistema gestiona dos frentes de seguridad: el acceso al dashboard administrativo y la seguridad de los datos (Multi-tenancy).

## Autenticación Administrativa
Utiliza **Supabase Auth** (Email/Password). 
Los usuarios se registran en `auth.users` y se vinculan a un negocio a través de la tabla `tenant_users`.

## Row Level Security (RLS)
La base de datos bloquea el acceso a todas las tablas operacionales. Un usuario desde el navegador solo puede solicitar datos que pasen esta política:
`USING (tenant_id = public.get_my_tenant_id())`
Donde `get_my_tenant_id()` es una función estable que extrae a qué tenant pertenece el usuario logueado en la sesión JWT.

## Privilegios del Bot
El flujo de n8n / IA no se autentica como usuario. Utiliza la clave **Service Role Key** (oculta y segura en el servidor/n8n) que bypassea el RLS. Es por eso que al insertar un mensaje desde n8n, se usa `resolver_tenant` para inyectar explícitamente el `tenant_id` correcto en cada inserción.

---
**Notas relacionadas:** [[Modelo de Datos Robotina]], [[Arquitectura y Estructura Robotina]]
#seguridad #rls #auth #supabase
