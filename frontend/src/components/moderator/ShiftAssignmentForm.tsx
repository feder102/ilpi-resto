/**
 * T061: ShiftAssignmentForm - Feature 006 US3 Form Component
 *
 * Form for assigning shifts to employees with validation.
 *
 * Features:
 * - Employee dropdown (department roster)
 * - Date picker with weekend blocking
 * - Shift type selector
 * - Real-time validation
 * - Helpful error messages
 * - Loading and disabled states
 */

import { useState } from 'react';

interface Employee {
  id: string;
  name: string;
}

interface ShiftType {
  id: string;
  name: string;
}

interface ShiftAssignmentFormProps {
  employees: Employee[];
  shiftTypes: ShiftType[];
  isSubmitting: boolean;
  onSubmit: (employeeId: string, date: string, shiftTypeId: string) => Promise<void>;
}

/**
 * Check if date is a weekend
 */
function isWeekend(dateStr: string): boolean {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export default function ShiftAssignmentForm({
  employees,
  shiftTypes,
  isSubmitting,
  onSubmit,
}: ShiftAssignmentFormProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [shiftTypeId, setShiftTypeId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validate form before submission
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!employeeId) {
      newErrors.employeeId = 'Selecciona un empleado';
    }

    if (!date) {
      newErrors.date = 'Selecciona una fecha';
    } else if (isWeekend(date)) {
      newErrors.date = 'No se pueden asignar turnos en fines de semana';
    }

    if (!shiftTypeId) {
      newErrors.shiftTypeId = 'Selecciona un tipo de turno';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Wait for async submission to complete
      await onSubmit(employeeId, date, shiftTypeId);

      // Only reset form after successful submission
      setEmployeeId('');
      setDate('');
      setShiftTypeId('');
      setErrors({});
    } catch {
      // Form NOT reset on error - user can correct and retry
      // Error handling is done by parent component
    }
  };

  const handleDateChange = (value: string) => {
    setDate(value);
    // Clear date error if user is correcting it
    if (errors.date) {
      const newErrors = { ...errors };
      delete newErrors.date;
      setErrors(newErrors);
    }
  };

  const handleEmployeeChange = (value: string) => {
    setEmployeeId(value);
    if (errors.employeeId) {
      const newErrors = { ...errors };
      delete newErrors.employeeId;
      setErrors(newErrors);
    }
  };

  const handleShiftTypeChange = (value: string) => {
    setShiftTypeId(value);
    if (errors.shiftTypeId) {
      const newErrors = { ...errors };
      delete newErrors.shiftTypeId;
      setErrors(newErrors);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Employee Dropdown */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-base-content">Empleado</label>
        <select
          value={employeeId}
          onChange={e => handleEmployeeChange(e.target.value)}
          disabled={isSubmitting || employees.length === 0}
          className={`select select-bordered w-full ${
            errors.employeeId ? 'select-error' : ''
          }`}
        >
          <option value="">
            {employees.length === 0
              ? 'No hay empleados disponibles'
              : 'Selecciona un empleado...'}
          </option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
        {errors.employeeId && (
          <p className="text-error text-xs mt-1">{errors.employeeId}</p>
        )}
      </div>

      {/* Date Picker */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-base-content">Fecha del Turno</label>
        <input
          type="date"
          value={date}
          onChange={e => handleDateChange(e.target.value)}
          disabled={isSubmitting}
          className={`input input-bordered w-full ${
            errors.date ? 'input-error' : ''
          }`}
        />
        {errors.date && (
          <p className="text-error text-xs mt-1">{errors.date}</p>
        )}
        {date && !errors.date && !isWeekend(date) && (
          <p className="text-xs text-base-content/60 mt-1">
            Fecha válida ({new Date(date).toLocaleDateString('es-ES', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
            })})
          </p>
        )}
      </div>

      {/* Shift Type Dropdown */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-base-content">Tipo de Turno</label>
        <select
          value={shiftTypeId}
          onChange={e => handleShiftTypeChange(e.target.value)}
          disabled={isSubmitting || shiftTypes.length === 0}
          className={`select select-bordered w-full ${
            errors.shiftTypeId ? 'select-error' : ''
          }`}
        >
          <option value="">
            {shiftTypes.length === 0
              ? 'No hay turnos disponibles'
              : 'Selecciona un turno...'}
          </option>
          {shiftTypes.map(shift => (
            <option key={shift.id} value={shift.id}>
              {shift.name}
            </option>
          ))}
        </select>
        {errors.shiftTypeId && (
          <p className="text-error text-xs mt-1">{errors.shiftTypeId}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting || employees.length === 0}
          className="btn btn-primary w-full"
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Asignando turno...
            </>
          ) : (
            'Asignar Turno'
          )}
        </button>
      </div>

      {/* Form Help */}
      <div className="mt-6 p-4 bg-base-200 rounded-lg border border-base-300">
        <p className="text-xs font-semibold text-base-content mb-2">NOTA</p>
        <ul className="text-xs text-base-content/60 space-y-1">
          <li>Las fechas de fin de semana no están permitidas</li>
          <li>Se pueden cargar turnos en fechas pasadas (carga excepcional)</li>
          <li>El sistema valida conflictos de vacaciones automáticamente</li>
          <li>No se pueden asignar dos turnos a la misma persona el mismo día</li>
        </ul>
      </div>
    </form>
  );
}
