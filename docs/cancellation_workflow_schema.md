# Esquema de Datos: Flujo de Cancelación y No-Show

Este documento define la estructura de datos para implementar el workflow de cancelaciones justificadas, no-show del pasajero y el registro de incidentes.

## 1. Motivos de Cancelación (`cancel_reason`)

Se presenta al conductor en un modal obligatorio al momento de cancelar un viaje. El `cancel_reason` se almacena en la tabla `bookings`.

**Opciones:**

```typescript
export const CANCEL_REASONS = {
  PASSENGER_NO_SHOW: "Passenger no-show",
  PASSENGER_CANCELLED: "Passenger cancelled directly",
  PASSENGER_UNREACHABLE: "Passenger unreachable",
  PASSENGER_FLIGHT_DELAY: "Passenger delayed/missed flight",
  PASSENGER_TOOK_DIFFERENT_VEHICLE: "Passenger took different vehicle",
  WRONG_PICKUP_LOCATION: "Wrong pickup location provided",
  SAFETY_CONCERN: "Safety concern",
  VEHICLE_ISSUE: "Vehicle issue",
  DRIVER_EMERGENCY: "Driver emergency",
  DISPATCH_REQUEST: "Dispatch requested cancellation",
  OTHER: "Other (text input required)",
} as const;

export type CancelReason = keyof typeof CANCEL_REASONS;
```

## 2. Clasificación de Responsabilidad (`cancel_responsibility`)

Cada `cancel_reason` se mapea automáticamente a una `cancel_responsibility` para determinar el impacto financiero. Se almacena en la tabla `bookings`.

**Valores posibles:**

- `passenger`
- `driver`
- `dispatch`
- `system`

**Mapeo:**

| `cancel_reason`                       | `cancel_responsibility` |
| --------------------------------------- | ----------------------- |
| `PASSENGER_NO_SHOW`                     | `passenger`             |
| `PASSENGER_CANCELLED`                   | `passenger`             |
| `PASSENGER_UNREACHABLE`                 | `passenger`             |
| `PASSENGER_FLIGHT_DELAY`                | `passenger`             |
| `PASSENGER_TOOK_DIFFERENT_VEHICLE`      | `passenger`             |
| `WRONG_PICKUP_LOCATION`                 | `passenger`             |
| `SAFETY_CONCERN`                        | `driver`                |
| `VEHICLE_ISSUE`                         | `driver`                |
| `DRIVER_EMERGENCY`                      | `driver`                |
| `DISPATCH_REQUEST`                      | `dispatch`              |
| `OTHER`                                 | `system` (needs review) |

## 3. Nuevos Campos en la Tabla `bookings`

Se añadirán los siguientes campos a la tabla `bookings` para registrar el estado de la cancelación.

| Campo                   | Tipo      | Descripción                                                                 |
| ----------------------- | --------- | --------------------------------------------------------------------------- |
| `cancel_reason`         | `TEXT`    | El motivo de la cancelación seleccionado por el conductor.                  |
| `cancel_responsibility` | `TEXT`    | La parte responsable de la cancelación, determinada por el `cancel_reason`. |
| `cancellation_notes`    | `TEXT`    | Notas adicionales si el motivo es `OTHER`.                                  |
| `passenger_no_show`     | `BOOLEAN` | `true` si el conductor reportó un no-show del pasajero.                     |
| `early_cancel`          | `BOOLEAN` | `true` si la cancelación ocurrió antes de la hora de recogida.              |
| `late_cancel`           | `BOOLEAN` | `true` si la cancelación ocurrió después de la hora de recogida.             |

## 4. Impacto Financiero (`payout_status`)

La `cancel_responsibility` determinará si el conductor es elegible para el pago.

| `cancel_responsibility` | `driver_eligible_payout` | `payout_status` (sugerido) |
| ----------------------- | ------------------------ | -------------------------- |
| `passenger`             | `TRUE`                   | `pending`                  |
| `driver`                | `FALSE`                  | `cancelled`                |
| `dispatch`              | `manual_review`          | `needs_review`             |
| `system`                | `manual_review`          | `needs_review`             |

## 5. Registro de Auditoría (`audit_logs`)

Se creará un nuevo registro en `audit_logs` para cada cancelación con la siguiente información en el campo `new_data` (JSONB).

```json
{
  "cancel_reason": "PASSENGER_NO_SHOW",
  "cancel_responsibility": "passenger",
  "cancellation_notes": "El pasajero no se presentó en el punto de recogida.",
  "pickup_time_delta_minutes": -15,
  "driver_location": {
    "lat": 28.4294,
    "lng": -81.3090
  },
  "optional_evidence_url": "https://s3.amazonaws.com/sln-evidence/booking-123/no-show.jpg"
}
```

## 6. Badges en el Admin Dashboard

Se añadirán los siguientes badges al dashboard de administración para una rápida identificación.

- `Passenger No-Show`
- `Driver Cancelled`
- `Dispatch Cancelled`
- `Late Cancel`
- `Early Cancel`
- `Needs Review`
