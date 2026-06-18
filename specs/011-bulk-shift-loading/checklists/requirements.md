# Requirements Checklist: Carga masiva de turnos

## Funcionalidad

- [x] Admin/Moderador puede asignar un tipo de turno a varios empleados en un rango.
- [x] Opción "Todos los días" vs "Solo días laborales (Lun-Vie)".
- [x] Disponible desde la vista de calendario de turnos.
- [x] Validación de rango (inicio ≤ fin) y rango no íntegramente pasado.
- [x] Requiere ≥1 empleado y un tipo de turno activo.
- [x] Días en conflicto se omiten y reportan (turno existente, vacaciones, pasado,
      empleado inválido).
- [x] Reutiliza reglas de conflicto de `create_shift`.
- [x] Respuesta con `created`, `skipped`, `created_count`, `skipped_count`.
- [x] El calendario se refresca tras la carga exitosa.

## Seguridad

- [x] RBAC en capa de servicio + `require_role("Admin","Moderador")` en el endpoint.
- [x] Empleado no ve el botón ni puede llamar al endpoint (403).
- [x] Aislamiento por `tenant_id` del JWT.
- [x] Evento de auditoría `SHIFT_BULK_CREATE`.

## Calidad

- [x] DTOs Pydantic v2 (tipado estricto).
- [x] TypeScript strict (build sin errores en archivos nuevos).
- [x] ruff sin errores en archivos backend modificados.
- [x] Tests unitarios del servicio (fines de semana, conflictos, validaciones).
- [x] Tests de integración del endpoint (201, solo laborales, 403, 401).
- [x] DaisyUI v5 (sin `form-control`; `flex flex-col gap-1`).

## Arquitectura

- [x] Router HTTP-only → servicio → modelos (Clean Architecture).
- [x] Sin cambios de esquema / sin migración Alembic.
- [x] UI y mensajes en español.
