/**
 * T054: ShiftTypeForm Component
 * Form for creating/editing shift type configurations
 */

import { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import {
  ShiftType,
  ShiftTypeCreate,
  ShiftTypeUpdate,
  TimeWindow,
} from '../types/shift-types';

interface ShiftTypeFormProps {
  shiftType?: ShiftType; // If provided, form is in edit mode
  onSubmit: (data: ShiftTypeCreate | ShiftTypeUpdate) => Promise<void>;
  onCancel: () => void;
}

export function ShiftTypeForm({
  shiftType,
  onSubmit,
  onCancel,
}: ShiftTypeFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'MAÑANA' | 'NOCHE' | 'CORTADO' | 'CORRIDO'>(
    'MAÑANA',
  );
  const [timeWindows, setTimeWindows] = useState<TimeWindow[]>([
    { start: '10:00', end: '18:00' },
  ]);
  const [expectedHours, setExpectedHours] = useState(8.0);
  const [usesDynamicClose, setUsesDynamicClose] = useState(false);
  const [description, setDescription] = useState('');
  const [totalHours, setTotalHours] = useState(8.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form if editing
  useEffect(() => {
    if (shiftType) {
      setName(shiftType.name);
      setType(shiftType.type);
      setTimeWindows(shiftType.time_windows);
      setExpectedHours(shiftType.expected_hours);
      setUsesDynamicClose(shiftType.uses_dynamic_close);
      setDescription(shiftType.description || '');
      setTotalHours(shiftType.total_hours);
    }
  }, [shiftType]);

  // Calculate total hours when time windows change
  useEffect(() => {
    const total = calculateTotalHours(timeWindows);
    setTotalHours(total);
  }, [timeWindows]);

  function calculateTotalHours(windows: TimeWindow[]): number {
    let totalMinutes = 0;
    for (const window of windows) {
      const [startH, startM] = window.start.split(':').map(Number);
      const [endH, endM] = window.end.split(':').map(Number);

      let startMinutes = startH * 60 + startM;
      let endMinutes = endH * 60 + endM;

      // Handle midnight spans (e.g., 23:00 to 06:00)
      if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
      }

      totalMinutes += endMinutes - startMinutes;
    }
    return Math.round((totalMinutes / 60) * 100) / 100;
  }

  function handleAddWindow() {
    if (timeWindows.length < 3) {
      setTimeWindows([...timeWindows, { start: '12:00', end: '16:00' }]);
    }
  }

  function handleRemoveWindow(index: number) {
    if (timeWindows.length > 1) {
      setTimeWindows(timeWindows.filter((_, i) => i !== index));
    }
  }

  function handleWindowChange(
    index: number,
    field: 'start' | 'end',
    value: string,
  ) {
    const updated = [...timeWindows];
    updated[index][field] = value;
    setTimeWindows(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validation
      if (!name.trim()) {
        setError('El nombre del turno es requerido');
        setLoading(false);
        return;
      }

      if (Math.abs(totalHours - expectedHours) > 0.01) {
        setError(
          `Las horas esperadas (${expectedHours}) no coinciden con el total calculado (${totalHours})`,
        );
        setLoading(false);
        return;
      }

      const data: ShiftTypeCreate | ShiftTypeUpdate = {
        name: name.trim(),
        type,
        time_windows: timeWindows,
        expected_hours: expectedHours,
        uses_dynamic_close: usesDynamicClose,
        description: description.trim() || undefined,
      };

      await onSubmit(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al guardar el tipo de turno',
      );
    } finally {
      setLoading(false);
    }
  }

  const shiftTypeLabels = {
    MAÑANA: 'Mañana',
    NOCHE: 'Noche',
    CORTADO: 'Cortado',
    CORRIDO: 'Corrido',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            {shiftType ? 'Editar tipo de turno' : 'Nuevo tipo de turno'}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Turno *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Mañana, Noche, Cortado"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Turno *
            </label>
            <select
              value={type}
              onChange={(e) =>
                setType(
                  e.target.value as 'MAÑANA' | 'NOCHE' | 'CORTADO' | 'CORRIDO',
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              {Object.entries(shiftTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Time Windows */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Horarios *
              </label>
              <button
                type="button"
                onClick={handleAddWindow}
                disabled={loading || timeWindows.length >= 3}
                className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Agregar horario
              </button>
            </div>

            <div className="space-y-3">
              {timeWindows.map((window, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">
                      Inicio
                    </label>
                    <input
                      type="time"
                      value={window.start}
                      onChange={(e) =>
                        handleWindowChange(index, 'start', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">
                      Fin
                    </label>
                    <input
                      type="time"
                      value={window.end}
                      onChange={(e) =>
                        handleWindowChange(index, 'end', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveWindow(index)}
                    disabled={loading || timeWindows.length <= 1}
                    className="p-2 text-red-600 hover:bg-red-50 rounded disabled:text-gray-400"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Horas Esperadas *
              </label>
              <input
                type="number"
                step="0.25"
                value={expectedHours}
                onChange={(e) => setExpectedHours(parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Calculado
              </label>
              <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 font-semibold">
                {totalHours.toFixed(2)} hrs
              </div>
            </div>
          </div>

          {/* Dynamic Close */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="dynamicClose"
              checked={usesDynamicClose}
              onChange={(e) => setUsesDynamicClose(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <label htmlFor="dynamicClose" className="ml-2 text-sm text-gray-700">
              Cierre dinámico (hasta que se cierre el local)
            </label>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción opcional del turno"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
