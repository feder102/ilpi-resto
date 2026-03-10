# Error Messages - Shift Roster Calendar (Feature 004)

## Overview

This document describes all error messages that can be displayed in the Shift Roster Calendar view. Error messages are extracted from the backend API and presented to users in clear, actionable Spanish.

**Implementation**: `frontend/src/utils/errorHandler.ts`

---

## Error Categories & Messages

### 1. Shift Assignment Conflicts

#### Vacation Conflict (MOST COMMON)
**When**: User tries to assign a shift to an employee who has approved vacation on that date.

**Backend Error**:
```
El empleado tiene vacaciones aprobadas del 2026-03-10 al 2026-03-20.
No se puede asignar un turno para 2026-03-15.
```

**Frontend Display**:
```
⚠️ Error al procesar la solicitud
El empleado tiene vacaciones aprobadas en esta fecha. No se puede asignar un turno.
```

**Action for User**: Choose a different date outside the vacation period or remove the vacation.

---

#### Duplicate Shift Conflict
**When**: User tries to assign a shift to an employee who already has a shift on that date.

**Backend Error**:
```
No se puede asignar el turno: Juan García ya tiene un turno asignado el 2026-03-15.
Por favor, elige otro día o modifica el turno existente.
```

**Frontend Display**:
```
⚠️ Error al procesar la solicitud
No se puede asignar el turno: Juan García ya tiene un turno asignado el 2026-03-15.
Por favor, elige otro día o modifica el turno existente.
```

**Action for User**: Choose a different date or edit the existing shift instead of creating a new one.

---

### 2. Validation Errors

#### Missing Required Fields
**When**: User submits form without selecting an employee or shift type.

**Frontend Error**:
```
Por favor selecciona un empleado y tipo de turno
```

**Frontend Display**:
```
⚠️ Error al procesar la solicitud
Por favor selecciona un empleado y tipo de turno
```

**Action for User**: Fill in all required fields before submitting.

---

#### Invalid Date
**When**: User tries to assign shift in the past.

**Backend Error**:
```
No se pueden asignar turnos en el pasado
```

**Frontend Display**:
```
⚠️ Error al procesar la solicitud
No se pueden asignar turnos en el pasado
```

**Action for User**: Select a future date.

---

### 3. Resource Errors

#### Employee Not Found
**When**: Selected employee doesn't exist or is inactive.

**Backend Error**:
```
Employee not found or inactive
```

**Frontend Display**:
```
⚠️ Error al procesar la solicitud
Empleado no encontrado o inactivo
```

**Action for User**: Select a different, active employee.

---

#### Shift Type Not Found
**When**: Selected shift type doesn't exist or is inactive.

**Backend Error**:
```
Shift type not found or inactive
```

**Frontend Display**:
```
⚠️ Error al procesar la solicitud
El tipo de turno no fue encontrado o está inactivo
```

**Action for User**: Select a different, active shift type. Contact admin if shift type is missing.

---

### 4. Permission Errors

#### Unauthorized
**When**: User's JWT token has expired.

**Backend Status**: 401

**Frontend Display**:
```
⚠️ Error al procesar la solicitud
Tu sesión ha expirado. Por favor, inicia sesión nuevamente.
```

**Action for User**: Login again.

---

#### Forbidden
**When**: Employee (non-Admin/Moderador) tries to create/edit/delete shifts.

**Backend Status**: 403

**Frontend Display**:
```
⚠️ Error al procesar la solicitud
No tienes permiso para realizar esta acción.
```

**Action for User**: Contact admin if this is incorrect.

---

### 5. Generic Errors

#### Network/Server Error
**When**: Server returns 5xx error or network is unreachable.

**Frontend Display**:
```
⚠️ Error al procesar la solicitud
Ocurrió un error inesperado. Por favor, intenta de nuevo.
```

**Action for User**: Try again. Contact support if problem persists.

---

## Implementation Details

### Error Extraction Logic (errorHandler.ts)

1. **Try API Response Structure**: Extract from `response.data.error.message`
2. **Keyword Matching**: Map keywords to user-friendly messages
3. **Fallback**: Return raw error message or generic default

### Error Message Mapping

Error codes and keywords are mapped to Spanish messages in `ERROR_MESSAGE_MAP`:

```typescript
const ERROR_MESSAGE_MAP: Record<string, string> = {
  SHIFT_CONFLICT_001: 'El empleado ya tiene un turno asignado en esa fecha',
  'vacaciones aprobadas': 'El empleado tiene vacaciones aprobadas...',
  BALANCE_EXCEEDED: 'Saldo insuficiente...',
  // ... more mappings
};
```

### Error Display Components

**Modal/Dialog Error Display**:
- Red border on left (left-4 border-red-500)
- Warning icon (⚠️)
- Bold title: "Error al procesar la solicitud"
- Detailed message below

**Example**:
```tsx
{error && (
  <div className="rounded-lg border-l-4 border-red-500 bg-red-50 p-4">
    <div className="flex items-start gap-3">
      <span className="text-lg">⚠️</span>
      <div>
        <p className="font-semibold">Error al procesar la solicitud</p>
        <p className="mt-1">{error}</p>
      </div>
    </div>
  </div>
)}
```

---

## Testing Error Messages

To test different error scenarios:

### 1. Vacation Conflict
1. Create employee and approve vacation (2026-03-10 to 2026-03-20)
2. Try to assign shift on 2026-03-15
3. Should see vacation conflict message

### 2. Duplicate Shift
1. Create shift for employee on 2026-03-15
2. Try to create another shift for same employee on same date
3. Should see duplicate shift message

### 3. Invalid Employee
1. Create shift with non-existent employee ID
2. Should see "Employee not found or inactive"

### 4. Expired Token
1. Wait for JWT token to expire (30 minutes)
2. Try to create a shift
3. Should redirect to login with 401 message

---

## Future Enhancements

- [ ] Toast notifications for success/warning (separate from modal)
- [ ] Retry button for network errors
- [ ] Detailed error log accessible to admins
- [ ] Error code mapping to help documentation
- [ ] Multi-language support (currently Spanish only)

---

## Related Files

- Backend: `backend/app/services/shift_service.py` (error messages)
- Backend: `backend/app/common/exceptions.py` (exception definitions)
- Backend: `backend/app/main.py` (exception handler)
- Frontend: `frontend/src/utils/errorHandler.ts` (error extraction)
- Frontend: `frontend/src/types/error.ts` (error types)
- Frontend: `frontend/src/components/ShiftAssignmentDialog.tsx` (error display)
