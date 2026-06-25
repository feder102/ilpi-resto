import { useEffect, useState } from 'react';
import { getAuditLog, getVacationSettings, updateVacationSettings } from '../services/settingsService';
import type { AuditLogEntry } from '../types/models';

export default function VacationConfigSection() {
  const [inputValue, setInputValue] = useState<string>('30');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    getVacationSettings()
      .then((s) => {
        setInputValue(String(s.default_vacation_days));
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    const val = parseInt(inputValue, 10);
    if (!inputValue || isNaN(val) || val < 1 || val > 365) {
      setError('Introduce un número entre 1 y 365');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await updateVacationSettings(val);
      setInputValue(String(updated.default_vacation_days));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Error al guardar la configuración. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleHistory = async () => {
    if (!showHistory && auditLog.length === 0) {
      setLoadingHistory(true);
      try {
        const data = await getAuditLog({ entity_type: 'tenant_vacation_config' });
        setAuditLog(data.items);
      } catch {
        setAuditLog([]);
      } finally {
        setLoadingHistory(false);
      }
    }
    setShowHistory((prev) => !prev);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="card bg-base-100 shadow-sm border border-base-200">
      <div className="card-body gap-4">
        <h2 className="card-title text-base">Configuración de Vacaciones</h2>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-base-content">
            Días de vacaciones por defecto al año
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={1}
              max={365}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setError(null);
              }}
              className="input input-bordered w-28"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary btn-sm"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
          <p className="text-xs text-base-content/60 mt-1">
            Días naturales por defecto al año. Solo aplica a nuevos balances.
          </p>
          {error && <p className="text-error text-xs mt-1">{error}</p>}
          {success && <p className="text-success text-xs mt-1">Configuración guardada correctamente.</p>}
        </div>

        <div>
          <button
            onClick={handleToggleHistory}
            className="btn btn-ghost btn-xs gap-1"
          >
            {showHistory ? '▲' : '▼'} Historial de cambios
          </button>

          {showHistory && (
            <div className="mt-2">
              {loadingHistory ? (
                <p className="text-xs text-base-content/60">Cargando…</p>
              ) : auditLog.length === 0 ? (
                <p className="text-xs text-base-content/60">Sin cambios registrados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-xs w-full">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Cambiado por</th>
                        <th>Valor anterior</th>
                        <th>Valor nuevo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLog.map((entry) => (
                        <tr key={entry.id}>
                          <td>{formatDate(entry.created_at)}</td>
                          <td>{entry.changed_by_email ?? entry.changed_by}</td>
                          <td>{entry.old_value ?? '—'}</td>
                          <td>{entry.new_value ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
