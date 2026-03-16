// T072: Attendance view — Clock-in/out with shift history
import { useState, useEffect, useCallback } from 'react';
import { Clock, MapPin, User } from 'lucide-react';
import { Button, Card, Alert } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../types/models';
import type { ShiftRecord, Employee } from '../types/models';
import type { PaginatedResponse } from '../types/api';
import { getShifts, clockIn, clockOut } from '../services/shiftService';
import { getEmployees } from '../services/employeeService';

export default function AttendanceView() {
  const { user, hasRole } = useAuth();
  const isAdminOrMod = hasRole(Role.ADMIN, Role.MODERADOR);

  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Clock-in form
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [taskLabel, setTaskLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data: PaginatedResponse<ShiftRecord> = await getShifts({ page, size: 20 });
      setShifts(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      setError('Error al cargar turnos');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchShifts(); }, [fetchShifts]);

  useEffect(() => {
    if (isAdminOrMod) {
      getEmployees({ size: 100 }).then((d) => setEmployees(d.items)).catch(() => {});
    }
  }, [isAdminOrMod]);

  const handleClockIn = async () => {
    const empId = isAdminOrMod ? selectedEmployee : user?.employee_id;
    if (!empId) { setError('Seleccione un empleado'); return; }
    setSubmitting(true);
    setError('');
    try {
      await clockIn({
        employee_id: empId,
        task_label: taskLabel || null,
      });
      setTaskLabel('');
      setSelectedEmployee('');
      fetchShifts();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message || 'Error al fichar entrada');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClockOut = async (shiftId: string) => {
    try {
      await clockOut(shiftId);
      fetchShifts();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message || 'Error al fichar salida');
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-base-content">Control Horario</h1>

      {/* Clock-in Card */}
      <Card variant="elevated" className="mb-8 bg-primary text-primary-content border-0 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Clock size={28} />
          <h2 className="m-0 text-2xl font-bold">Fichaje</h2>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          {isAdminOrMod && (
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block text-sm font-medium">Empleado</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="select select-bordered w-full bg-primary-content/10 text-primary-content"
              >
                <option value="">Seleccionar empleado...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id} className="text-base-content">{emp.first_name} {emp.last_name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="min-w-[160px]">
            <label className="mb-1 block text-sm font-medium">Tarea (opcional)</label>
            <input
              value={taskLabel}
              onChange={(e) => setTaskLabel(e.target.value)}
              placeholder="Ej: Parrilla"
              className="input input-bordered w-full bg-primary-content/10 text-primary-content placeholder-primary-content/50"
            />
          </div>
          <Button
            onClick={handleClockIn}
            disabled={submitting}
            loading={submitting}
            className="btn btn-outline border-primary-content text-primary-content hover:bg-primary-content/20"
          >
            {submitting ? 'Fichando...' : 'Confirmar Fichaje'}
          </Button>
        </div>
      </Card>

      {error && <Alert variant="error" message={error} className="mb-6" />}

      {/* Shift History */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-base-content">
          Historial de Turnos ({total})
        </h2>

        {loading ? (
          <p className="text-center text-base-content/60 mt-10">Cargando...</p>
        ) : shifts.length === 0 ? (
          <p className="text-center text-base-content/60 mt-10">No hay registros de turnos</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Fecha</th>
                    <th>Entrada</th>
                    <th>Salida</th>
                    <th>Tarea</th>
                    <th>GPS</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((s) => (
                    <tr key={s.id} className="hover">
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-base-200 flex items-center justify-center">
                            {s.employee_image
                              ? <img src={s.employee_image} alt="" className="h-full w-full object-cover" />
                              : <User size={16} className="text-base-content/40" />}
                          </div>
                          {s.employee_name || 'N/A'}
                        </div>
                      </td>
                      <td>{s.date}</td>
                      <td>
                        {s.entry_time ? (
                          <span className="badge badge-success">
                            {formatTime(s.entry_time)}
                          </span>
                        ) : (
                          <span className="text-base-content/60 text-xs">-</span>
                        )}
                      </td>
                      <td>
                        {s.exit_time ? (
                          <span className="badge badge-warning">
                            {formatTime(s.exit_time)}
                          </span>
                        ) : (
                          <span className="text-base-content/60 italic text-xs">En turno...</span>
                        )}
                      </td>
                      <td className="text-base-content/60">{s.task_label || '-'}</td>
                      <td>
                        {s.location_lat && s.location_lng ? (
                          <a href={`https://maps.google.com/?q=${s.location_lat},${s.location_lng}`} target="_blank" rel="noopener noreferrer" className="link link-primary text-sm flex items-center gap-1">
                            <MapPin size={14} /> Ver GPS
                          </a>
                        ) : '-'}
                      </td>
                      <td>
                        {!s.exit_time && (
                          <Button
                            onClick={() => handleClockOut(s.id)}
                            variant="secondary"
                            size="sm"
                          >
                            Fichar salida
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <Button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  variant="secondary"
                  size="sm"
                >
                  Anterior
                </Button>
                <span className="text-sm text-base-content/60">Página {page} de {pages}</span>
                <Button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page >= pages}
                  variant="secondary"
                  size="sm"
                >
                  Siguiente
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
