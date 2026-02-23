// T072: Attendance view — Clock-in/out with shift history
import { useState, useEffect, useCallback } from 'react';
import { Clock, MapPin, User } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import FormField from '../components/FormField';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../types/models';
import type { ShiftRecord, Employee } from '../types/models';
import type { PaginatedResponse } from '../types/api';
import { getShifts, clockIn, clockOut } from '../services/shiftService';
import { getEmployees } from '../services/employeeService';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid #e2e8f0', fontSize: '0.9rem',
};

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
      <h1 style={{ margin: '0 0 24px', fontSize: '1.5rem', fontWeight: 700 }}>Control Horario</h1>

      {/* Clock-in Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
        borderRadius: 16, padding: 32, color: 'white', marginBottom: 32,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <Clock size={28} />
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Fichaje</h2>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'end' }}>
          {isAdminOrMod && (
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 4 }}>Empleado</label>
              <select
                style={{ ...inputStyle, color: '#1e293b' }}
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
              >
                <option value="">Seleccionar empleado...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                ))}
              </select>
            </div>
          )}
          <div style={{ minWidth: 160 }}>
            <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 4 }}>Tarea (opcional)</label>
            <input
              style={{ ...inputStyle, color: '#1e293b' }}
              value={taskLabel}
              onChange={(e) => setTaskLabel(e.target.value)}
              placeholder="Ej: Parrilla"
            />
          </div>
          <button
            onClick={handleClockIn}
            disabled={submitting}
            style={{
              padding: '10px 24px', borderRadius: 8, border: '2px solid white',
              background: 'rgba(255,255,255,0.15)', color: 'white',
              fontWeight: 700, cursor: submitting ? 'default' : 'pointer', fontSize: '1rem',
            }}
          >
            {submitting ? 'Fichando...' : 'Confirmar Fichaje'}
          </button>
        </div>
      </div>

      {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}

      {/* Shift History Table */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>
        Historial de Turnos ({total})
      </h2>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#64748b' }}>Cargando...</p>
      ) : shifts.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#64748b' }}>No hay registros de turnos</p>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 8px', fontWeight: 600, color: '#475569' }}>Empleado</th>
                  <th style={{ padding: '12px 8px', fontWeight: 600, color: '#475569' }}>Fecha</th>
                  <th style={{ padding: '12px 8px', fontWeight: 600, color: '#475569' }}>Entrada</th>
                  <th style={{ padding: '12px 8px', fontWeight: 600, color: '#475569' }}>Salida</th>
                  <th style={{ padding: '12px 8px', fontWeight: 600, color: '#475569' }}>Tarea</th>
                  <th style={{ padding: '12px 8px', fontWeight: 600, color: '#475569' }}>GPS</th>
                  <th style={{ padding: '12px 8px' }}></th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', background: '#e2e8f0',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                        }}>
                          {s.employee_image
                            ? <img src={s.employee_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <User size={16} color="#94a3b8" />}
                        </div>
                        {s.employee_name || 'N/A'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px' }}>{s.date}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600 }}>
                        {formatTime(s.entry_time)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      {s.exit_time ? (
                        <span style={{ background: '#ffedd5', color: '#ea580c', padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600 }}>
                          {formatTime(s.exit_time)}
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.85rem' }}>En turno...</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 8px', color: '#64748b' }}>{s.task_label || '-'}</td>
                    <td style={{ padding: '12px 8px' }}>
                      {s.location_lat && s.location_lng ? (
                        <span style={{ color: '#2563eb', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={14} /> Ver GPS
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      {!s.exit_time && (
                        <button
                          onClick={() => handleClockOut(s.id)}
                          style={{
                            padding: '4px 12px', borderRadius: 6, border: '1px solid #e2e8f0',
                            background: 'white', cursor: 'pointer', fontSize: '0.8rem', color: '#ea580c',
                          }}
                        >
                          Fichar salida
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: page > 1 ? 'pointer' : 'default' }}>
                Anterior
              </button>
              <span style={{ padding: '8px 16px', fontSize: '0.9rem', color: '#64748b' }}>Página {page} de {pages}</span>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: page < pages ? 'pointer' : 'default' }}>
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
