// T072: Attendance view — Clock-in/out with shift history
import { useState, useEffect, useCallback } from 'react';
import { Clock, MapPin, User } from 'lucide-react';
import { Button, Card, Alert, Badge } from '../components/ui';
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
      <h1 className="mb-6 text-3xl font-bold text-slate-900">Control Horario</h1>

      {/* Clock-in Card */}
      <Card variant="elevated" className="mb-8 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-0 p-6">
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
                className="w-full rounded-md border border-indigo-300 bg-indigo-50 px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600"
              >
                <option value="">Seleccionar empleado...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
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
              className="w-full rounded-md border border-indigo-300 bg-indigo-50 px-3 py-2 text-slate-900 text-sm placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600"
            />
          </div>
          <Button
            onClick={handleClockIn}
            disabled={submitting}
            loading={submitting}
            className="border-2 border-white bg-transparent text-white hover:bg-white/20"
          >
            {submitting ? 'Fichando...' : 'Confirmar Fichaje'}
          </Button>
        </div>
      </Card>

      {error && <Alert variant="error" message={error} className="mb-6" />}

      {/* Shift History */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Historial de Turnos ({total})
        </h2>

        {loading ? (
          <p className="text-center text-slate-600 mt-10">Cargando...</p>
        ) : shifts.length === 0 ? (
          <p className="text-center text-slate-600 mt-10">No hay registros de turnos</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-left">
                    <th className="px-2 py-3 font-semibold text-slate-700">Empleado</th>
                    <th className="px-2 py-3 font-semibold text-slate-700">Fecha</th>
                    <th className="px-2 py-3 font-semibold text-slate-700">Entrada</th>
                    <th className="px-2 py-3 font-semibold text-slate-700">Salida</th>
                    <th className="px-2 py-3 font-semibold text-slate-700">Tarea</th>
                    <th className="px-2 py-3 font-semibold text-slate-700">GPS</th>
                    <th className="px-2 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-slate-200 flex items-center justify-center">
                            {s.employee_image
                              ? <img src={s.employee_image} alt="" className="h-full w-full object-cover" />
                              : <User size={16} className="text-slate-400" />}
                          </div>
                          {s.employee_name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-2 py-3">{s.date}</td>
                      <td className="px-2 py-3">
                        {s.entry_time ? (
                          <Badge variant="success" className="bg-green-100 text-green-700">
                            {formatTime(s.entry_time)}
                          </Badge>
                        ) : (
                          <span className="text-slate-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        {s.exit_time ? (
                          <Badge variant="warning" className="bg-orange-100 text-orange-700">
                            {formatTime(s.exit_time)}
                          </Badge>
                        ) : (
                          <span className="text-slate-600 italic text-xs">En turno...</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-slate-600">{s.task_label || '-'}</td>
                      <td className="px-2 py-3">
                        {s.location_lat && s.location_lng ? (
                          <a href={`https://maps.google.com/?q=${s.location_lat},${s.location_lng}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 text-sm flex items-center gap-1">
                            <MapPin size={14} /> Ver GPS
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-2 py-3">
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
                <span className="text-sm text-slate-600">Página {page} de {pages}</span>
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
