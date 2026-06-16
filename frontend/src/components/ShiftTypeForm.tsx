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
  shiftType?: ShiftType;
  onSubmit: (data: ShiftTypeCreate | ShiftTypeUpdate) => Promise<void>;
  onCancel: () => void;
}

export function ShiftTypeForm({
  shiftType,
  onSubmit,
  onCancel,
}: ShiftTypeFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'MAÑANA' | 'NOCHE' | 'CORTADO' | 'CORRIDO'>('MAÑANA');
  const [timeWindows, setTimeWindows] = useState<TimeWindow[]>([{ start: '10:00', end: '18:00' }]);
  const [expectedHours, setExpectedHours] = useState(8.0);
  const [usesDynamicClose, setUsesDynamicClose] = useState(false);
  const [description, setDescription] = useState('');
  const [totalHours, setTotalHours] = useState(8.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (endMinutes < startMinutes) endMinutes += 24 * 60;
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

  function handleWindowChange(index: number, field: 'start' | 'end', value: string) {
    const updated = [...timeWindows];
    updated[index][field] = value;
    setTimeWindows(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!name.trim()) {
        setError('El nombre del turno es requerido');
        setLoading(false);
        return;
      }
      if (Math.abs(totalHours - expectedHours) > 0.01) {
        setError(`Las horas esperadas (${expectedHours}) no coinciden con el total calculado (${totalHours})`);
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
      setError(err instanceof Error ? err.message : 'Error al guardar el tipo de turno');
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

      <div className="flex flex-col gap-1">
        <label htmlFor="shiftName" className="text-sm font-medium text-base-content">Nombre del Turno *</label>
        <input id="shiftName" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Mañana, Noche, Cortado" className="input input-bordered" disabled={loading} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="shiftType" className="text-sm font-medium text-base-content">Tipo de Turno *</label>
        <select id="shiftType" value={type} onChange={(e) => setType(e.target.value as 'MAÑANA' | 'NOCHE' | 'CORTADO' | 'CORRIDO')} className="select select-bordered" disabled={loading}>
          {Object.entries(shiftTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="label-text font-medium">Horarios *</span>
          <button type="button" onClick={handleAddWindow} disabled={loading || timeWindows.length >= 3} className="btn btn-ghost btn-xs gap-1">
            <Plus className="w-4 h-4" /> Agregar horario
          </button>
        </div>
        <div className="space-y-3">
          {timeWindows.map((window, index) => (
            <div key={index} className="flex gap-2 items-end">
              <div className="form-control flex-1">
                <label htmlFor={`window-start-${index}`} className="label"><span className="label-text-alt">Inicio</span></label>
                <input id={`window-start-${index}`} type="time" value={window.start} onChange={(e) => handleWindowChange(index, 'start', e.target.value)} className="input input-bordered input-sm" disabled={loading} />
              </div>
              <div className="form-control flex-1">
                <label htmlFor={`window-end-${index}`} className="label"><span className="label-text-alt">Fin</span></label>
                <input id={`window-end-${index}`} type="time" value={window.end} onChange={(e) => handleWindowChange(index, 'end', e.target.value)} className="input input-bordered input-sm" disabled={loading} />
              </div>
              <button type="button" onClick={() => handleRemoveWindow(index)} disabled={loading || timeWindows.length <= 1} className="btn btn-ghost btn-sm text-error" aria-label={`Eliminar horario ${index + 1}`}>
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="form-control">
          <label htmlFor="expectedHours" className="label"><span className="label-text">Horas Esperadas *</span></label>
          <input id="expectedHours" type="number" step="0.25" value={expectedHours} onChange={(e) => setExpectedHours(parseFloat(e.target.value))} className="input input-bordered" disabled={loading} />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Total Calculado</span></label>
          <div className="input input-bordered bg-base-200 flex items-center font-semibold">{totalHours.toFixed(2)} hrs</div>
        </div>
      </div>

      <Checkbox id="dynamicClose" label="Cierre dinámico (hasta que se cierre el local)" checked={usesDynamicClose} onChange={(e) => setUsesDynamicClose(e.target.checked)} disabled={loading} />

      <div className="form-control">
        <label htmlFor="description" className="label"><span className="label-text">Descripción</span></label>
        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción opcional del turno" rows={3} className="textarea textarea-bordered" disabled={loading} />
      </div>

      <div className="flex gap-3 pt-6 border-t border-base-300">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading} className="flex-1">Cancelar</Button>
        <Button type="submit" variant="primary" disabled={loading} loading={loading} className="flex-1">{loading ? 'Guardando...' : 'Guardar'}</Button>
      </div>
    </form>
  );

  return (
    <Modal isOpen={true} onClose={onCancel} title={shiftType ? 'Editar tipo de turno' : 'Nuevo tipo de turno'} size="lg">
      {formContent}
    </Modal>
  );
}
