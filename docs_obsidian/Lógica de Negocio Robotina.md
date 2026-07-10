# Lógica de Negocio Robotina

La lógica principal del restaurante recae en el desacoplamiento de inventario, perfiles de clientes y la delegación de intenciones a la IA.

## Módulo de Menú y PNL
Los ítems del menú no solo tienen precio, tienen **Keywords** (Palabras clave). Si un usuario dice *"quiero algo dulce"*, la IA usa las keywords para encontrar productos coincidentes en lugar de buscar por nombre exacto.
El *Kill-Switch* permite que al deshabilitar un producto, este desaparezca del contexto de la IA instantáneamente.

## Clasificación de Clientes (CRM)
El sistema perfila automáticamente (VIP, En Riesgo, Frecuente). Además, la IA extrae e inyecta "Restricciones Dietéticas" (ej. "Es alérgico al maní") al cliente, para que en futuros pedidos la IA rechace automáticamente pedidos peligrosos sin que el humano intervenga.

## Takeover Humano
Si un cliente pide hablar con un humano o la probabilidad de éxito (Confianza NLP) de la IA es baja, el sistema permite a un administrador en el Dashboard presionar "Tomar Control Humano". Esto marca el chat en la base de datos pausando la respuesta automática hasta que se suelte el control.

---
**Notas relacionadas:** [[Arquitectura y Estructura Robotina]], [[Modelo de Datos Robotina]]
#logica #negocio #crm #menu
