/**
 * T054: ShiftTypeForm Component
 * Form for creating/editing shift type configurations
 */

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Button from './ui/Button';
import Checkbox from './ui/Checkbox';
import Modal from './ui/Modal';
import Alert from './ui/Alert';
import type {
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

      const startMinutes = startH * 60 + startM;
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

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}

      {/* Name */}
      <div>
        <label htmlFor="shiftName" className="block text-sm font-medium text-slate-700 mb-2">
          Nombre del Turno *
        </label>
        <input
          id="shiftName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Mañana, Noche, Cortado"
          className="w-full px-3 py-2 border border-slate-200 rounded-md text-base text-slate-700 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 disabled:bg-slate-100 disabled:cursor-not-allowed"
          disabled={loading}
        />
      </div>

      {/* Type */}
      <div>
        <label htmlFor="shiftType" className="block text-sm font-medium text-slate-700 mb-2">
          Tipo de Turno *
        </label>
        <select
          id="shiftType"
          value={type}
          onChange={(e) =>
            setType(
              e.target.value as 'MAÑANA' | 'NOCHE' | 'CORTADO' | 'CORRIDO',
            )
          }
          className="w-full px-3 py-2 border border-slate-200 rounded-md text-base text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 disabled:bg-slate-100 disabled:cursor-not-allowed"
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
          <label className="block text-sm font-medium text-slate-700">
            Horarios *
          </label>
          <button
            type="button"
            onClick={handleAddWindow}
            disabled={loading || timeWindows.length >= 3}
            className="text-sm text-indigo-600 hover:text-indigo-700 disabled:text-slate-400 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Agregar horario
          </button>
        </div>

        <div className="space-y-3">
          {timeWindows.map((window, index) => (
            <div key={index} className="flex gap-2 items-end">
              <div className="flex-1">
                <label htmlFor={`window-start-${index}`} className="block text-xs text-slate-600 mb-1">
                  Inicio
                </label>
                <input
                  id={`window-start-${index}`}
                  type="time"
                  value={window.start}
                  onChange={(e) =>
                    handleWindowChange(index, 'start', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-base text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  disabled={loading}
                />
              </div>
              <div className="flex-1">
                <label htmlFor={`window-end-${index}`} className="block text-xs text-slate-600 mb-1">
                  Fin
                </label>
                <input
                  id={`window-end-${index}`}
                  type="time"
                  value={window.end}
                  onChange={(e) =>
                    handleWindowChange(index, 'end', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-base text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  disabled={loading}
                />
              </div>
              <button
                type="button"
                onClick={() => handleRemoveWindow(index)}
                disabled={loading || timeWindows.length <= 1}
                className="p-2 text-red-600 hover:bg-red-50 rounded disabled:text-slate-400"
                aria-label={`Eliminar horario ${index + 1}`}
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
          <label htmlFor="expectedHours" className="block text-sm font-medium text-slate-700 mb-2">
            Horas Esperadas *
          </label>
          <input
            id="expectedHours"
            type="number"
            step="0.25"
            value={expectedHours}
            onChange={(e) => setExpectedHours(parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-base text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 disabled:bg-slate-100 disabled:cursor-not-allowed"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Total Calculado
          </label>
          <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md text-slate-700 font-semibold">
            {totalHours.toFixed(2)} hrs
          </div>
        </div>
      </div>

      {/* Dynamic Close */}
      <Checkbox
        id="dynamicClose"
        label="Cierre dinámico (hasta que se cierre el local)"
        checked={usesDynamicClose}
        onChange={(e) => setUsesDynamicClose(e.target.checked)}
        disabled={loading}
      />

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
          Descripción
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción opcional del turno"
          rows={3}
          className="w-full px-3 py-2 border border-slate-200 rounded-md text-base text-slate-700 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 disabled:bg-slate-100 disabled:cursor-not-allowed"
          disabled={loading}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-6 border-t">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          loading={loading}
          className="flex-1"
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={shiftType ? 'Editar tipo de turno' : 'Nuevo tipo de turno'}
      size="lg"
    >
      {formContent}
    </Modal>
  );
}
