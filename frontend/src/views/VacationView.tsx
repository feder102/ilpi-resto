// T058: Vacation view with request cards and balance
import { useState, useEffect, useCallback } from 'react';
import { Plus, Check, X, Ban, User } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import FormField from '../components/FormField';
import { useAuth } from '../hooks/useAuth';
import { Role, VacationStatus } from '../types/models';
import type { VacationRequest, VacationBalance } from '../types/models';
import type { PaginatedResponse } from '../types/api';
import {
  getVacations,
  createVacation,
  approveVacation,
  rejectVacation,
  cancelVacation,
  getBalance,
} from '../services/vacationService';
import { getEmployees } from '../services/employeeService';
import type { Employee } from '../types/models';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid #e2e8f0', fontSize: '0.9rem',
};

export default function VacationView() {
  const { user, hasRole } = useAuth();
  const isAdminOrMod = hasRole(Role.ADMIN, Role.MODERADOR);

  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [balance, setBalance] = useState<VacationBalance | null>(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const computedDays = startDate && endDate
    ? Math.max(0, Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
    : 0;

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data: PaginatedResponse<VacationRequest> = await getVacations({
        status: statusFilter || undefined,
        page,
        size: 20,
      });
      setRequests(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      setError('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Load employees for create form
  useEffect(() => {
    if (showCreate && isAdminOrMod) {
      getEmployees({ size: 100 }).then((d) => setEmployees(d.items)).catch(() => {});
    }
  }, [showCreate, isAdminOrMod]);

  // Load balance when employee selected
  useEffect(() => {
    if (selectedEmployee) {
      getBalance(selectedEmployee).then(setBalance).catch(() => setBalance(null));
    }
  }, [selectedEmployee]);

  const openCreate = () => {
    setShowCreate(true);
    setFormError('');
    setStartDate('');
    setEndDate('');
    setBalance(null);
    // For Empleado, auto-select own employee_id
    if (user?.employee_id) {
      setSelectedEmployee(user.employee_id);
    } else {
      setSelectedEmployee('');
    }
  };

  const handleCreate = async () => {
    if (!selectedEmployee || !startDate || !endDate) {
      setFormError('Complete todos los campos');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await createVacation({
        employee_id: selectedEmployee,
        start_date: startDate,
        end_date: endDate,
      });
      setShowCreate(false);
      fetchRequests();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setFormError(axiosErr.response?.data?.error?.message || 'Error al crear solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (req: VacationRequest) => {
    try {
      await approveVacation(req.id, req.version);
      fetchRequests();
    } catch { setError('Error al aprobar'); }
  };

  const handleReject = async (req: VacationRequest) => {
    try {
      await rejectVacation(req.id, req.version);
      fetchRequests();
    } catch { setError('Error al rechazar'); }
  };

  const handleCancel = async (req: VacationRequest) => {
    try {
      await cancelVacation(req.id, req.version);
      fetchRequests();
    } catch { setError('Error al cancelar'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Vacaciones</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>{total} solicitudes</p>
        </div>
        <button
          onClick={openCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            borderRadius: 8, border: 'none', background: '#2563eb', color: 'white',
            fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
          }}
        >
          <Plus size={18} /> Nueva Solicitud
        </button>
      </div>

      {/* Status filter */}
      <div style={{ marginBottom: 16 }}>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.9rem' }}
        >
          <option value="">Todos los estados</option>
          {Object.values(VacationStatus).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}

      {loading ? (
        <p style={{ textAlign: 'center', color: '#64748b', marginTop: 40 }}>Cargando...</p>
      ) : requests.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#64748b', marginTop: 40 }}>No hay solicitudes</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {requests.map((req) => (
              <div key={req.id} style={{
                background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', background: '#e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
                  }}>
                    {req.employee_image
                      ? <img src={req.employee_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <User size={20} color="#94a3b8" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{req.employee_name || 'Empleado'}</h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{req.employee_department}</p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>

                <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: 12 }}>
                  <p style={{ margin: '4px 0' }}>
                    {req.start_date} → {req.end_date}
                  </p>
                  <p style={{ margin: '4px 0', fontWeight: 600 }}>{req.requested_days} días solicitados</p>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  {isAdminOrMod && req.status === 'Pendiente' && (
                    <>
                      <button
                        onClick={() => handleApprove(req)}
                        style={{
                          padding: '6px 12px', borderRadius: 6, border: 'none',
                          background: '#dcfce7', color: '#16a34a', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 600,
                        }}
                      >
                        <Check size={14} /> Aprobar
                      </button>
                      <button
                        onClick={() => handleReject(req)}
                        style={{
                          padding: '6px 12px', borderRadius: 6, border: 'none',
                          background: '#fecaca', color: '#dc2626', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 600,
                        }}
                      >
                        <X size={14} /> Rechazar
                      </button>
                    </>
                  )}
                  {req.status === 'Pendiente' && req.employee_id === user?.employee_id && (
                    <button
                      onClick={() => handleCancel(req)}
                      style={{
                        padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0',
                        background: 'white', color: '#64748b', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem',
                      }}
                    >
                      <Ban size={14} /> Cancelar
                    </button>
                  )}
                </div>
              </div>
            ))}
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

      {/* Create Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 32, maxWidth: 480, width: '95%' }}>
            <h2 style={{ margin: '0 0 24px' }}>Nueva Solicitud de Vacaciones</h2>

            {formError && <p style={{ color: '#dc2626', marginBottom: 16 }}>{formError}</p>}

            {isAdminOrMod && (
              <FormField label="Empleado" required>
                <select style={inputStyle} value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
                  <option value="">Seleccionar empleado...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                  ))}
                </select>
              </FormField>
            )}

            <FormField label="Fecha inicio" required>
              <input style={inputStyle} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </FormField>
            <FormField label="Fecha fin" required>
              <input style={inputStyle} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </FormField>

            {computedDays > 0 && (
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: '0.9rem' }}>
                <p style={{ margin: '0 0 4px', fontWeight: 600 }}>Días solicitados: {computedDays}</p>
                {balance && (
                  <p style={{ margin: 0, color: '#64748b' }}>
                    Saldo disponible: {balance.remaining_days} de {balance.total_days} días
                  </p>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
              <button onClick={() => setShowCreate(false)}
                style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleCreate} disabled={submitting}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: submitting ? '#93c5fd' : '#2563eb', color: 'white',
                  fontWeight: 600, cursor: submitting ? 'default' : 'pointer',
                }}>
                {submitting ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
