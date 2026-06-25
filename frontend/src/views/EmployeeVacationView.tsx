/**
 * EmployeeVacationView - Employee Vacation Requests Module
 * Feature 005: Employee Workspace Portal (US3)
 *
 * SECURITY ARCHITECTURE:
 * 1. Frontend: Wrapped in EmployeeRoute component (checks: authenticated + Empleado role + is_active=true)
 * 2. Backend: API endpoints require require_role_and_active("Empleado") dependency
 * 3. RLS: Service layer filters to only current employee's requests (emp_id from JWT)
 *
 * This component is ONLY accessible to active employees with properly authenticated sessions.
 * The backend rejects any requests from:
 * - Unauthenticated users (401 Unauthorized)
 * - Users without Empleado role (403 Forbidden)
 * - Users with is_active=false (401 with password setup message)
 * - Cross-employee access attempts (RLS filters at service layer)
 */

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import VacationBalanceCard from '../components/vacation/VacationBalanceCard';
import VacationRequestForm from '../components/vacation/VacationRequestForm';
import VacationRequestList from '../components/vacation/VacationRequestList';
import { useVacation } from '../hooks/useVacation';

export default function EmployeeVacationView() {
  const {
    balance,
    requests,
    loading,
    submitting,
    error,
    success,
    page,
    totalPages,
    statusFilter,
    loadRequests,
    submitRequest,
    cancelRequest,
    filterByStatus,
    clearError,
    clearSuccess,
  } = useVacation();

  const [dateError, setDateError] = useState<string | null>(null);

  // Auto-dismiss error messages after 10 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 10000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // Auto-dismiss success messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(clearSuccess, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, clearSuccess]);

  const handleFilterChange = (status: string | null) => {
    filterByStatus(status);
  };

  const handlePageChange = (newPage: number) => {
    loadRequests(newPage, statusFilter || undefined);
  };

  const handleSubmitRequest = async (startDate: string, endDate: string) => {
    setDateError(null);
    try {
      await submitRequest(startDate, endDate);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { code?: string; message?: string } } } };
      const code = axiosErr.response?.data?.error?.code;
      if (code === 'ADVANCE_NOTICE_REQUIRED') {
        setDateError('Las vacaciones deben solicitarse con al menos 2 meses de anticipación');
      } else if (code === 'CALENDAR_YEAR_VIOLATION') {
        setDateError('Las vacaciones deben disfrutarse dentro del año natural (antes del 31 de diciembre)');
      }
    }
  };

  const handleCancelRequest = async (requestId: string, version: number) => {
    await cancelRequest(requestId, version);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-base-content">Mis Vacaciones</h1>
          <p className="mt-2 text-lg text-base-content/60">
            Solicita, consulta y gestiona tus días de vacaciones
          </p>
        </div>

        {/* Global Error Message */}
        {error && (
          <div className="alert alert-error mb-6 animate-in fade-in">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold">Error</h3>
              <p className="text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="btn btn-ghost btn-sm"
              aria-label="Cerrar mensaje"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Global Success Message */}
        {success && (
          <div className="alert alert-success mb-6 animate-in fade-in">
            <CheckCircle className="w-6 h-6 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold">¡Éxito!</h3>
              <p className="text-sm mt-1">{success}</p>
            </div>
            <button
              onClick={clearSuccess}
              className="btn btn-ghost btn-sm"
              aria-label="Cerrar mensaje"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Vacation Balance Card */}
        <div className="mb-8">
          <VacationBalanceCard balance={balance} loading={loading} />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-1">
            <VacationRequestForm
              balance={balance}
              submitting={submitting}
              onSubmit={handleSubmitRequest}
              onError={clearError}
              serverDateError={dateError}
            />
          </div>

          {/* Right Column - Requests List */}
          <div className="lg:col-span-2">
            <VacationRequestList
              requests={requests}
              loading={loading}
              page={page}
              totalPages={totalPages}
              statusFilter={statusFilter}
              submitting={submitting}
              onFilterChange={handleFilterChange}
              onPageChange={handlePageChange}
              onCancel={handleCancelRequest}
            />
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 p-6 bg-info/10 border border-info/30 rounded-lg">
          <h3 className="font-semibold text-info mb-3">Información Importante</h3>
          <ul className="space-y-2 text-sm text-base-content/70">
            <li>
              • Las solicitudes de vacaciones deben ser revisadas por un moderador o administrador
            </li>
            <li>
              • Solo puedes cancelar solicitudes que estén en estado "Pendiente"
            </li>
            <li>
              • Los fines de semana están bloqueados en el selector de fechas
            </li>
            <li>
              • Se cuentan todos los días naturales (incluidos fines de semana)
            </li>
            <li>
              • No puedes solicitar más días de los que tienes disponibles
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
