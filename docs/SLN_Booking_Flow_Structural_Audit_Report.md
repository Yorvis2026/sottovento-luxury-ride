
# SLN Booking Flow Structural Audit Report (v1.0)

**Fecha:** 28 de marzo de 2026
**Autor:** Manus AI

## Resumen Ejecutivo

Esta auditoría técnica extendida del motor de reservas de Sottovento Luxury Network (SLN) confirma que la infraestructura existente es robusta y está bien posicionada para la integración del **SLN Instant Booking Selector Landing**. Sin embargo, se ha identificado un **problema crítico de validación geográfica** que permite a los usuarios reservar viajes con una tarifa incorrecta al introducir una dirección de destino que no corresponde con la zona de precios seleccionada. Este informe detalla los hallazenos en 8 áreas clave y recomienda acciones inmediatas para mitigar el riesgo de inconsistencia de precios antes de implementar nuevas funcionalidades.

## SECCIÓN 1 — ESTRUCTURA DE ENTRADA DE RESERVAS

| Ruta de Entrada | Conexión a Backend de Precios Único | Estado |
| :--- | :--- | :--- |
| `/` (página principal) | ✅ Sí, a través del componente `<BookingSection />` | **Activo** |
| `/book` | ❌ No existe | **Inactivo** |
| `/reservation` | ❌ No existe | **Inactivo** |
| `/checkout` | ❌ No existe | **Inactivo** |
| `/confirmation` | ✅ Sí, a través de `GET /api/booking/verify` | **Activo** |

**Conclusión:** El flujo de reservas está centralizado en el componente `booking-section.tsx`, que se renderiza en la página principal. Todas las rutas de reserva funcionalmente convergen en este único componente, que a su vez consume un único motor de precios (`lib/pricing.ts`). No hay rutas de reserva duplicadas o heredadas.

## SECCIÓN 2 — SOPORTE DE PARÁMETROS DE CONSULTA (QUERY PARAMS)

| Parámetro | Soporte Actual | Implementación | Ejemplo de Uso |
| :--- | :--- | :--- | :--- |
| `service` | ✅ **Soportado** | `booking-section.tsx` lee `service=hourly` | `/?service=hourly` |
| `pickup` | ❌ **No Soportado** | N/A | N/A |
| `dropoff` | ❌ **No Soportado** | N/A | N/A |
| `vehicle` | ❌ **No Soportado** | N/A | N/A |
| `date` | ❌ **No Soportado** | N/A | N/A |
| `time` | ❌ **No Soportado** | N/A | N/A |
| `ref` | ✅ **Soportado** | `booking-section.tsx` lee `ref` para atribución | `/?ref=DRIVERCODE123` |
| `promo` | ❌ **No Soportado** | N/A | N/A |
| `source` | ❌ **No Soportado** | N/A | N/A |
| `package` | ✅ **Soportado** | `booking-section.tsx` lee `package` para pre-seleccionar zona | `/?package=mco` |

**Conclusión:** El sistema soporta parámetros de consulta básicos para pre-configurar el tipo de servicio, la zona de recogida y la atribución. La estructura para ampliar el soporte a otros parámetros como vehículo, fecha y hora ya existe y puede ser implementada con bajo riesgo.

## SECCIÓN 3 — SOPORTE DEL MOTOR DE ATRIBUCIÓN

| Campo de Atribución | Almacenamiento en DB | Implementación | Estado |
| :--- | :--- | :--- | :--- |
| `ref_code` | ✅ `source_code` en `bookings` | `create-checkout-session` lee `ref` o `driver` | **Activo** |
| `driver_id` | ✅ `source_driver_id` en `bookings` | `create-checkout-session` resuelve `ref_code` a `driver_id` | **Activo** |
| `tablet_id` | ✅ `tablet_code` en `bookings` | `create-checkout-session` usa `captured_by` | **Activo** |
| `partner_operator_id` | ✅ `partner_id` en `bookings` | `create-checkout-session` (a través de `source_code`) | **Activo** |
| `source_type` | ✅ `booking_origin` en `bookings` | `create-checkout-session` setea `website` o `tablet` | **Activo** |

**Conclusión:** El motor de atribución es robusto y está completamente integrado en el flujo de creación de la sesión de Stripe. Todos los campos requeridos para el seguimiento de la fuente del lead (QR, tablet, driver, partner) ya se están capturando y persistiendo correctamente en la base de datos.

## SECCIÓN 4 — ESTRUCTURA DEL FLUJO DE STRIPE

| Característica de Stripe | Implementación | Estado |
| :--- | :--- | :--- |
| **Tipo de Integración** | **Stripe Checkout Session** | ✅ **Activo** |
| **Endpoint** | `POST /api/create-checkout-session` | ✅ **Activo** |
| **Flujo de Pago** | **Pago Completo (Full Payment)** | ✅ **Activo** |
| **Manejo de Webhook** | ❌ **No encontrado** | **Inactivo/Faltante** |
| **Pre-creación de Booking** | ✅ Sí, antes de crear la sesión de Stripe | ✅ **Activo** |
| **Verificación Post-Pago** | `GET /api/booking/verify` en página de confirmación | ✅ **Activo** |

**Conclusión:** El sistema utiliza un flujo de **Stripe Checkout Session** para pago completo, lo cual es seguro y estándar. Se pre-crea un registro de `booking` en la base de datos con estado `pending_payment` antes de redirigir al cliente a Stripe, y luego se verifica el pago en la página de confirmación. **Gap Crítico:** No se encontró un endpoint de webhook para `checkout.session.completed`, lo que significa que el sistema depende de que el cliente visite la página de confirmación para finalizar la reserva. Si el cliente cierra el navegador después de pagar pero antes de ser redirigido, la reserva podría quedar en un estado inconsistente.

## SECCIÓN 5 — ESTRUCTURA DE PÁGINAS DE RUTA

| Página de Ruta Específica | Conexión a Backend de Precios Único | Estado |
| :--- | :--- | :--- |
| `MCO to Disney` | ✅ Sí, a través de `/?package=mco` | **Activo** |
| `MCO to Port Canaveral` | ✅ Sí, a través de `/?package=port` | **Activo** |
| `Airport Transfers Orlando` | ✅ Sí, a través de `/?package=mco` | **Activo** |

**Conclusión:** Las páginas de ruta específicas (landing pages) funcionan como alias que simplemente pre-configuran el componente `BookingSection` a través del parámetro de consulta `package`. Todas las rutas convergen en el mismo motor de precios, garantizando consistencia.

## SECCIÓN 6 — SEGUIMIENTO DE ANALÍTICAS (ANALYTICS TRACKING)

| Evento de Seguimiento | Implementación | Estado |
| :--- | :--- | :--- |
| `page_view` | ✅ **Implementado** | `@vercel/analytics` en `layout.tsx` | **Activo** |
| `booking_start` | ❌ **No Implementado** | N/A | **Faltante** |
| `booking_submit` | ❌ **No Implementado** | N/A | **Faltante** |
| `payment_success` | ❌ **No Implementado** | N/A | **Faltante** |

**Conclusión:** El seguimiento de analíticas es mínimo y se limita a las vistas de página a través de Vercel Analytics. No se están rastreando eventos clave del embudo de conversión, lo que dificulta la optimización y el análisis del comportamiento del usuario. 

## SECCIÓN 7 — PROBLEMA CRÍTICO DE VALIDACIÓN GEOGRÁFICA

| Característica de Validación | Soporte Actual | Estado |
| :--- | :--- | :--- |
| **Validación Dirección vs. Zona** | ❌ **No Implementado** | **Gap Crítico** |
| **Detección de Zona por Coordenadas** | ❌ **No Implementado** | **Gap Crítico** |
| **Recálculo Automático de Precio** | ❌ **No Implementado** | **Gap Crítico** |

**Análisis del Problema:**
La auditoría confirma la existencia del problema de inconsistencia geográfica. El motor de precios (`lib/pricing.ts`) se basa exclusivamente en los `ZoneId` seleccionados en los menús desplegables (`pickupZone`, `dropoffZone`). Los campos de texto libre para la dirección (`pickupLocation`, `dropoffLocation`) se utilizan únicamente para la logística del conductor y **no se validan** contra la zona seleccionada.

> **Riesgo:** Este gap permite un escenario de fraude o error donde un usuario puede seleccionar una ruta de bajo costo (ej. Disney → Universal) pero introducir direcciones para una ruta mucho más cara (ej. Disney → Puerto Cañaveral), obteniendo y pagando la tarifa incorrecta. Esto impacta negativamente los ingresos y la compensación al conductor.

**Acción Requerida:**
Es **mandatorio** implementar una capa de validación geográfica antes de lanzar el SLN Instant Booking Selector. La solución recomendada es utilizar la API de **Google Places Autocomplete** junto con polígonos de geocercas (geofencing) para cada zona de precios.

**Comportamiento Esperado Post-Implementación:**
1.  Usuario selecciona una zona (ej. "Disney").
2.  Usuario empieza a escribir la dirección en el campo de texto (`pickupLocation`).
3.  Google Places Autocomplete sugiere direcciones.
4.  Al seleccionar una dirección, el sistema obtiene sus coordenadas geográficas.
5.  El sistema verifica si las coordenadas caen dentro del polígono de la zona "Disney".
6.  **Si no coinciden:** El sistema debe notificar al usuario ("La dirección está fuera de la zona seleccionada. Se ha actualizado la zona y el precio.") y recalcular automáticamente la tarifa basándose en la zona correcta.

## SECCIÓN 8 — SOPORTE DE AUTOCOMPLETADO DE DIRECCIONES

| Característica de Autocompletado | Soporte Actual | Estado |
| :--- | :--- | :--- |
| **Google Places Autocomplete** | ❌ **No Implementado** | **Faltante** |
| **Mapbox Autocomplete** | ❌ **No Implementado** | **Faltante** |
| **Entrada Manual de Dirección** | ✅ **Implementado** | Campos de texto libre | **Activo** |

**Conclusión:** El sistema depende exclusivamente de la entrada manual de direcciones. La ausencia de un sistema de autocompletado contribuye directamente al problema de validación geográfica y además degrada la experiencia de usuario, aumenta la probabilidad de errores de tipeo y dificulta la estandarización de direcciones para la logística.

**Recomendación:** Implementar **Google Places Autocomplete** es un requisito funcional para solucionar el gap de la Sección 7 y mejorar la calidad general del flujo de reservas.

## Conclusión Final y Recomendaciones

El motor de reservas de SLN es funcional y está bien estructurado en su núcleo, con un sólido sistema de atribución y un flujo de pago estándar. Sin embargo, la auditoría ha revelado dos deficiencias críticas interconectadas que deben ser resueltas con alta prioridad:

1.  **Ausencia de Validación Geográfica:** El sistema no valida que la dirección física introducida por el usuario corresponda a la zona de precios seleccionada.
2.  **Ausencia de Autocompletado de Direcciones:** La entrada manual de direcciones impide una validación automática y precisa.

**Plan de Acción Recomendado:**

1.  **Prioridad Alta (Bloqueante):**
    *   **Implementar Google Places Autocomplete:** Integrar la API en los campos de `pickupLocation` y `dropoffLocation`.
    *   **Definir Polígonos de Zona:** Crear mapeos de `ZoneId` a polígonos geográficos (coordenadas).
    *   **Implementar Lógica de Validación y Recálculo:** Al seleccionar una dirección autocompletada, validar su pertenencia a la zona y recalcular el precio si es necesario, notificando al usuario de forma transparente.

2.  **Prioridad Media:**
    *   **Implementar Webhook de Stripe:** Crear un endpoint para `checkout.session.completed` para asegurar la finalización de la reserva incluso si el cliente no llega a la página de confirmación.
    *   **Mejorar Seguimiento de Analíticas:** Implementar el seguimiento de eventos clave del embudo (`booking_start`, `booking_submit`, `payment_success`) para permitir la optimización de la conversión.

La resolución del problema de validación geográfica es un **prerrequisito no negociable** para la implementación segura del **SLN Instant Booking Selector Landing**, ya que este último dependerá de la integridad del motor de precios para funcionar correctamente.
