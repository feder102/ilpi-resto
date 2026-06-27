/**
 * Bulk Shift Load Dialog (Feature 011: Carga masiva de turnos)
 *
 * Modal that lets Admin/Moderador assign a shift type to several employees over a
 * date range, choosing whether to load every day (including weekends) or only
 * working days (Mon-Fri). Days with conflicts are skipped and reported.
 */

import React, { useState, useEffect } from 'react';
import { bulkCreateRosterShifts } from '../services/shiftService';
import { getEmployees } from '../services/employeeService';
import { Modal, Button, Spinner } from '../components/ui';
import { extractErrorMessage } from '../utils/errorHandler';
import type { ShiftType, BulkShiftResult } from '../types/shift';
import apiClient from '../services/apiClient';

interface BulkShiftLoadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

interface EmployeeOption {
  id: string;
  name: string;
}

export const BulkShiftLoadDialog: React.FC<BulkShiftLoadDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [selectedShiftTypeId, setSelectedShiftTypeId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [includeWeekends, setIncludeWeekends] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkShiftResult | null>(null);

  // Reset state and load options on open
  useEffect(() => {
    if (!isOpen) return;
    setSelectedEmployeeIds([]);
    setSelectedShiftTypeId('');
    setStartDate('');
    setEndDate('');
    setIncludeWeekends(true);
    setError(null);
    setResult(null);
    loadEmployees();
    loadShiftTypes();
  }, [isOpen]);

  const loadEmployees = async () => {
    try {
      const response = await getEmployees({ include_inactive: false, size: 100 });
      setEmployees(
        response.items.map((emp) => ({
          id: emp.id,
          name: `${emp.first_name} ${emp.last_name}`,
        })),
      );
    } catch (err) {
      console.error('Failed to load employees:', err);
      setEmployees([]);
    }
  };

  const loadShiftTypes = async () => {
    try {
      const { data } = await apiClient.get('/shift-types', {
        params: { active_only: true, size: 100 },
      });
      const items: ShiftType[] = data.items || [];
      setShiftTypes(items);
      if (items.length > 0) {
        setSelectedShiftTypeId(items[0].id);
      }
    } catch (err) {
      console.error('Failed to load shift types:', err);
      setShiftTypes([]);
    }
  };

  const toggleEmployee = (id: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );
  };

  const allSelected = employees.length > 0 && selectedEmployeeIds.length === employees.length;

  const toggleSelectAll = () => {
    setSelectedEmployeeIds(allSelected ? [] : employees.map((e) => e.id));
  };

  const handleSubmit = async () => {
    if (selectedEmployeeIds.length === 0) {
      setError('Selecciona al menos un empleado');
      return;
    }
    if (!selectedShiftTypeId) {
      setError('Selecciona un tipo de turno');
      return;
    }
    if (!startDate || !endDate) {
      setError('Selecciona la fecha de inicio y de fin');
      return;
    }
    if (startDate > endDate) {
      setError('La fecha de inicio no puede ser posterior a la fecha de fin');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await bulkCreateRosterShifts({
        employee_ids: selectedEmployeeIds,
        shift_type_id: selectedShiftTypeId,
        start_date: startDate,
        end_date: endDate,
        include_weekends: includeWeekends,
      });
      setResult(res);
    } catch (err) {
      setError(
        extractErrorMessage(err, 'No se pudo realizar la carga masiva. Por favor, intenta de nuevo.'),
      );
      console.error('Error in bulk shift load:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    onSubmit();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Carga masiva de turnos" size="lg">
      {result ? (
        /* Result summary */
        <div className="space-y-4">
          <div role="alert" className="alert alert-success">
            <span>
              Se crearon <span className="font-bold">{result.created_count}</span> turnos.
            </span>
          </div>

          {result.skipped_count > 0 && (
            <div className="space-y-2">
              <div role="alert" className="alert alert-warning">
                <span>
                  Se omitieron <span className="font-bold">{result.skipped_count}</span> días por
                  conflictos.
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-base-300">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Fecha</th>
                      <th>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.skipped.map((s, idx) => (
                      <tr key={`${s.employee_id}-${s.date}-${idx}`}>
                        <td>{s.employee_name || s.employee_id}</td>
                        <td>{s.date}</td>
                        <td>{s.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={handleFinish}>
              Cerrar
            </Button>
          </div>
        </div>
      ) : (
        /* Form */
        <div className="space-y-4">
          {/* Employees */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-base-content">Empleados</label>
              {employees.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs text-primary hover:underline"
                >
                  {allSelected ? 'Quitar todos' : 'Seleccionar todos'}
                </button>
              )}
            </div>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-base-300 p-2">
              {employees.length === 0 ? (
                <p className="text-xs text-base-content/60">Cargando empleados...</p>
              ) : (
                employees.map((emp) => (
                  <label
                    key={emp.id}
                    className="flex cursor-pointer items-center gap-2 py-1 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={selectedEmployeeIds.includes(emp.id)}
                      onChange={() => toggleEmployee(emp.id)}
                      disabled={loading}
                    />
                    <span>{emp.name}</span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-base-content/60">
              {selectedEmployeeIds.length} empleado(s) seleccionado(s)
            </p>
          </div>

          {/* Shift type */}
          <div className="flex flex-col gap-1">
            <label htmlFor="bulk_shift_type" className="text-sm font-medium text-base-content">
              Tipo de turno
            </label>
            <select
              id="bulk_shift_type"
              value={selectedShiftTypeId}
              onChange={(e) => setSelectedShiftTypeId(e.target.value)}
              disabled={loading || shiftTypes.length === 0}
              className="select select-bordered w-full"
            >
              <option value="">-- Seleccionar tipo de turno --</option>
              {shiftTypes.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.expected_hours}h)
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="bulk_start_date" className="text-sm font-medium text-base-content">
                Fecha de inicio
              </label>
              <input
                id="bulk_start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={loading}
                className="input input-bordered w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="bulk_end_date" className="text-sm font-medium text-base-content">
                Fecha de fin
              </label>
              <input
                id="bulk_end_date"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={loading}
                className="input input-bordered w-full"
              />
            </div>
          </div>

          {/* Days to load */}
          <div className="flex flex-col gap-1">
            <label htmlFor="bulk_days_mode" className="text-sm font-medium text-base-content">
              Días a cargar
            </label>
            <select
              id="bulk_days_mode"
              value={includeWeekends ? 'all' : 'weekdays'}
              onChange={(e) => setIncludeWeekends(e.target.value === 'all')}
              disabled={loading}
              className="select select-bordered w-full"
            >
              <option value="all">Todos los días (incluye fines de semana)</option>
              <option value="weekdays">Solo días laborales (Lun-Vie)</option>
            </select>
          </div>

          {/* Error */}
          {error && (
            <div role="alert" className="alert alert-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={onClose} disabled={loading} className="flex-1">
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={loading || selectedEmployeeIds.length === 0 || !selectedShiftTypeId}
              className="flex-1"
            >
              {loading ? <Spinner size="sm" /> : 'Cargar turnos'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default BulkShiftLoadDialog;
