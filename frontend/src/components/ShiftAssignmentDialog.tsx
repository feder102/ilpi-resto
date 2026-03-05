/**
 * Shift Assignment Dialog
 *
 * Modal for creating/editing shift assignments.
 * Allows users to select an employee, shift type, and submit the assignment.
 */

import React, { useState, useEffect } from 'react';
import { shiftService, createRosterShift, updateRosterShift } from '../services/shiftService';
import { Modal, Button, Spinner } from '../components/ui';
import type { ShiftRecord } from '../types/shift';

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
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedShiftType, setSelectedShiftType] = useState<'morning' | 'afternoon' | 'night'>('morning');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasVacation, setHasVacation] = useState(false);

  // If editing, pre-populate fields
  useEffect(() => {
    if (selectedShift) {
      setSelectedEmployeeId(selectedShift.employee_id);
      setSelectedShiftType(selectedShift.shift_type);
    } else {
      setSelectedEmployeeId('');
      setSelectedShiftType('morning');
    }
    setError(null);
    setHasVacation(false);
  }, [selectedShift, isOpen]);

  // Load employees on dialog open
  useEffect(() => {
    if (isOpen) {
      loadEmployees();
    }
  }, [isOpen]);

  const loadEmployees = async () => {
    try {
      // TODO: Call employee API to get list of active employees
      // For now, use placeholder - implement when employee service ready
      setEmployees([]);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  const handleSubmit = async () => {
    if (!selectedEmployeeId || !selectedShiftType) {
      setError('Please select an employee and shift type');
      return;
    }

    if (!selectedDate) {
      setError('No date selected');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const dateStr = selectedDate.toISOString().split('T')[0];

      if (selectedShift) {
        // Update existing shift
        await updateRosterShift(selectedShift.id, {
          shift_type: selectedShiftType,
        });
      } else {
        // Create new shift
        const response = await createRosterShift({
          employee_id: selectedEmployeeId,
          date: dateStr,
          shift_type: selectedShiftType,
        });

        if (response.warning) {
          setHasVacation(true);
          // Still successful, but show warning
        }
      }

      // Success - close dialog and trigger parent refresh
      onSubmit();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign shift';
      if (errorMessage.includes('already has')) {
        setError('This employee already has a shift on that date');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedShift) return;

    if (!confirm('Are you sure you want to delete this shift?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await shiftService.deleteRosterShift(selectedShift.id);

      // Close and refresh
      onSubmit();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete shift';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={selectedShift ? 'Edit Shift' : 'Assign Shift'}>
      <div className="space-y-4">
        {/* Date Display */}
        {selectedDate && (
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600">
              Date: <span className="font-bold text-gray-900">{selectedDate.toLocaleDateString('es-ES')}</span>
            </p>
          </div>
        )}

        {/* Vacation Warning */}
        {hasVacation && (
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">
            <p className="text-sm text-yellow-900">
              ⚠️ This employee has approved vacation on this date. Proceeding anyway.
            </p>
          </div>
        )}

        {/* Employee Selection */}
        <div>
          <label htmlFor="employee" className="block text-sm font-medium text-gray-900">
            Employee
          </label>
          <select
            id="employee"
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            disabled={loading || employees.length === 0}
            className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-100"
          >
            <option value="">-- Select an employee --</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
          {employees.length === 0 && <p className="mt-1 text-xs text-gray-500">Loading employees...</p>}
        </div>

        {/* Shift Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-900">Shift Type</label>
          <div className="mt-2 space-y-2">
            {(['morning', 'afternoon', 'night'] as const).map((type) => (
              <label key={type} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="shift_type"
                  value={type}
                  checked={selectedShiftType === type}
                  onChange={() => setSelectedShiftType(type)}
                  disabled={loading}
                  className="rounded-full"
                />
                <span className="text-gray-900 capitalize">
                  {type === 'morning' ? 'Mañana' : type === 'afternoon' ? 'Tarde' : 'Noche'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">{error}</div>}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          {selectedShift && (
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={loading}
              className="flex-1"
            >
              {loading ? <Spinner size="sm" /> : 'Delete'}
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || !selectedEmployeeId}
            className="flex-1"
          >
            {loading ? <Spinner size="sm" /> : selectedShift ? 'Update' : 'Assign'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ShiftAssignmentDialog;
