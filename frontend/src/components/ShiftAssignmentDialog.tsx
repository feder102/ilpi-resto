/**
 * Shift Assignment Dialog
 *
 * Modal for creating/editing shift assignments.
 * Allows users to select an employee, shift type (from API), and submit the assignment.
 */

import React, { useState, useEffect } from 'react';
import { shiftService, createRosterShift, updateRosterShift } from '../services/shiftService';
import { getEmployees } from '../services/employeeService';
import { Modal, Button, Spinner } from '../components/ui';
import { extractErrorMessage, getErrorSeverity } from '../utils/errorHandler';
import type { ShiftRecord, ShiftType } from '../types/shift';
import apiClient from '../services/apiClient';

interface ShiftAssignmentDialogProps {
  isOpen: boolean;
  selectedDate: Date | null;
  selectedShift: ShiftRecord | null;
  onClose: () => void;
  onSubmit: () => void;
}

export const ShiftAssignmentDialog: React.FC<ShiftAssignmentDialogProps> = ({
  isOpen,
  selectedDate,
  selectedShift,
  onClose,
  onSubmit,
}) => {
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedShiftTypeId, setSelectedShiftTypeId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasVacation, setHasVacation] = useState(false);

  // If editing, pre-populate fields
  useEffect(() => {
    if (selectedShift) {
      setSelectedEmployeeId(selectedShift.employee_id);
      setSelectedShiftTypeId(selectedShift.shift_type_id);
    } else {
      setSelectedEmployeeId('');
      setSelectedShiftTypeId('');
    }
    setError(null);
    setHasVacation(false);
  }, [selectedShift, isOpen]);

  // Load employees and shift types on dialog open
  useEffect(() => {
    if (isOpen) {
      loadEmployees();
      loadShiftTypes();
    }
  }, [isOpen]);

  const loadEmployees = async () => {
    try {
      const response = await getEmployees({
        include_inactive: false,
        size: 100, // Get up to 100 active employees
      });
      const employeeList = response.items.map((emp) => ({
        id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
      }));
      setEmployees(employeeList);
    } catch (err) {
      console.error('Failed to load employees:', err);
      setEmployees([]);
    }
  };

  const loadShiftTypes = async () => {
    try {
      const { data } = await apiClient.get('/shift-types', {
        params: { is_active: true, size: 100 },
      });
      setShiftTypes(data.items || []);
      // Set default to first active shift type if not editing
      if (!selectedShift && data.items && data.items.length > 0) {
        setSelectedShiftTypeId(data.items[0].id);
      }
    } catch (err) {
      console.error('Failed to load shift types:', err);
      setShiftTypes([]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedEmployeeId || !selectedShiftTypeId) {
      setError('Por favor selecciona un empleado y tipo de turno');
      return;
    }

    if (!selectedDate) {
      setError('No se seleccionó una fecha');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Format date as YYYY-MM-DD in local timezone (not UTC)
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      if (selectedShift) {
        // Update existing shift
        await updateRosterShift(selectedShift.id, {
          shift_type_id: selectedShiftTypeId,
        });
      } else {
        // Create new shift
        const response = await createRosterShift({
          employee_id: selectedEmployeeId,
          date: dateStr,
          shift_type_id: selectedShiftTypeId,
        });

        if (response.warning) {
          setHasVacation(true);
          // Still successful, but show warning
        }
      }

      // Success - close dialog and trigger parent refresh
      onSubmit();
    } catch (err) {
      const errorMessage = extractErrorMessage(
        err,
        selectedShift
          ? 'No se pudo actualizar el turno. Por favor, intenta de nuevo.'
          : 'No se pudo asignar el turno. Por favor, intenta de nuevo.',
      );
      setError(errorMessage);
      console.error('Error assigning shift:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedShift) return;

    if (!confirm('¿Estás seguro de que quieres eliminar este turno?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await shiftService.deleteRosterShift(selectedShift.id);

      // Close and refresh
      onSubmit();
    } catch (err) {
      const errorMessage = extractErrorMessage(err, 'No se pudo eliminar el turno. Por favor, intenta de nuevo.');
      setError(errorMessage);
      console.error('Error deleting shift:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={selectedShift ? 'Editar Turno' : 'Asignar Turno'}>
      <div className="space-y-4">
        {/* Date Display */}
        {selectedDate && (
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600">
              Fecha: <span className="font-bold text-gray-900">{selectedDate.toLocaleDateString('es-ES')}</span>
            </p>
          </div>
        )}

        {/* Vacation Warning */}
        {hasVacation && (
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">
            <p className="text-sm text-yellow-900">
              ⚠️ Este empleado tiene vacaciones aprobadas en esta fecha. Continuando de todas formas.
            </p>
          </div>
        )}

        {/* Employee Selection */}
        <div>
          <label htmlFor="employee" className="block text-sm font-medium text-gray-900">
            Empleado
          </label>
          <select
            id="employee"
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            disabled={loading || employees.length === 0}
            className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-100"
          >
            <option value="">-- Seleccionar un empleado --</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
          {employees.length === 0 && <p className="mt-1 text-xs text-gray-500">Cargando empleados...</p>}
        </div>

        {/* Shift Type Selection */}
        <div>
          <label htmlFor="shift_type" className="block text-sm font-medium text-gray-900">
            Tipo de Turno
          </label>
          <select
            id="shift_type"
            value={selectedShiftTypeId}
            onChange={(e) => setSelectedShiftTypeId(e.target.value)}
            disabled={loading || shiftTypes.length === 0}
            className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-100"
          >
            <option value="">-- Seleccionar tipo de turno --</option>
            {shiftTypes.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.expected_hours}h)
              </option>
            ))}
          </select>
          {shiftTypes.length === 0 && <p className="mt-1 text-xs text-gray-500">Cargando tipos de turno...</p>}
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-900">
            <div className="flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="font-semibold">Error al procesar la solicitud</p>
                <p className="mt-1 text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          {selectedShift && (
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={loading}
              className="flex-1"
            >
              {loading ? <Spinner size="sm" /> : 'Eliminar'}
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || !selectedEmployeeId || !selectedShiftTypeId}
            className="flex-1"
          >
            {loading ? <Spinner size="sm" /> : selectedShift ? 'Actualizar' : 'Asignar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ShiftAssignmentDialog;
