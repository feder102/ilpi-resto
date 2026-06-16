// T036: Vacation view with request cards and balance - refactored to use UI components
import { useState, useEffect, useCallback } from 'react';
import { Plus, Check, X, Ban, User } from 'lucide-react';
import { Button, Card, Modal, Alert, Badge } from '../components/ui';
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

// Status to Badge variant mapping
function getVacationStatusVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  switch (status) {
    case 'Aprobado':
      return 'success';
    case 'Pendiente':
      return 'warning';
    case 'Rechazado':
      return 'error';
    case 'Cancelado':
      return 'neutral';
    default:
      return 'neutral';
  }
}

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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-base-content m-0">Vacaciones</h1>
          <p className="text-sm text-base-content/60 mt-1">{total} solicitudes</p>
        </div>
        <Button
          onClick={openCreate}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus size={18} />
          Nueva Solicitud
        </Button>
      </div>

      {/* Status filter */}
      <div className="mb-6">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="select select-bordered"
        >
          <option value="">Todos los estados</option>
          {Object.values(VacationStatus).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {error && <Alert variant="error" message={error} className="mb-4" />}

      {loading ? (
        <p className="text-center text-base-content/60 mt-10">Cargando...</p>
      ) : requests.length === 0 ? (
        <p className="text-center text-base-content/60 mt-10">No hay solicitudes</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests.map((req) => (
              <Card key={req.id} className="flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-base-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {req.employee_image
                      ? <img src={req.employee_image} alt={req.employee_name} className="w-full h-full object-cover" />
                      : <User size={20} className="text-base-content/40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base-content">{req.employee_name || 'Empleado'}</h3>
                    <p className="text-xs text-base-content/60">{req.employee_department}</p>
                  </div>
                  <Badge variant={getVacationStatusVariant(req.status)}>{req.status}</Badge>
                </div>

                <div className="text-sm text-base-content/80 space-y-1 mb-3">
                  <p>
                    {req.start_date} → {req.end_date}
                  </p>
                  <p className="font-semibold">{req.requested_days} días solicitados</p>
                </div>

                <div className="flex gap-2 mt-auto pt-3 border-t border-base-300">
                  {isAdminOrMod && req.status === 'Pendiente' && (
                    <>
                      <Button
                        onClick={() => handleApprove(req)}
                        variant="primary"
                        size="sm"
                        className="flex-1 flex items-center justify-center gap-1"
                      >
                        <Check size={14} /> Aprobar
                      </Button>
                      <Button
                        onClick={() => handleReject(req)}
                        variant="danger"
                        size="sm"
                        className="flex-1 flex items-center justify-center gap-1"
                      >
                        <X size={14} /> Rechazar
                      </Button>
                    </>
                  )}
                  {req.status === 'Pendiente' && req.employee_id === user?.employee_id && (
                    <Button
                      onClick={() => handleCancel(req)}
                      variant="secondary"
                      size="sm"
                      className="flex-1 flex items-center justify-center gap-1"
                    >
                      <Ban size={14} /> Cancelar
                    </Button>
                  )}
                </div>
              </Card>
            ))}
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

      {/* Create Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nueva Solicitud de Vacaciones"
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowCreate(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              loading={submitting}
              onClick={handleCreate}
            >
              {submitting ? 'Enviando...' : 'Enviar solicitud'}
            </Button>
          </div>
        }
      >
        {formError && <Alert variant="error" message={formError} className="mb-4" />}

        <div className="space-y-4">
          {isAdminOrMod && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-base-content">Empleado *</label>
              <select className="select select-bordered w-full" value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
                <option value="">Seleccionar empleado...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-base-content">Fecha inicio *</label>
            <input className="input input-bordered w-full" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-base-content">Fecha fin *</label>
            <input className="input input-bordered w-full" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          {computedDays > 0 && (
            <Card className="bg-base-200 border-base-300 text-sm">
              <p className="font-semibold text-base-content mb-1">Días solicitados: {computedDays}</p>
              {balance && (
                <p className="text-base-content/60">
                  Saldo disponible: {balance.remaining_days} de {balance.total_days} días
                </p>
              )}
            </Card>
          )}
        </div>
      </Modal>
    </div>
  );
}
