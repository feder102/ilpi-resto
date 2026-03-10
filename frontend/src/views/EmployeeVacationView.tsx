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

import { useEffect } from 'react';
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
    await submitRequest(startDate, endDate);
  };

  const handleCancelRequest = async (requestId: string, version: number) => {
    await cancelRequest(requestId, version);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Mis Vacaciones</h1>
          <p className="mt-2 text-lg text-gray-600">
            Solicita, consulta y gestiona tus días de vacaciones
          </p>
        </div>

        {/* Global Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-4 items-start animate-in fade-in">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800 flex-shrink-0 p-1"
              aria-label="Cerrar mensaje"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Global Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-4 items-start animate-in fade-in">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-800">¡Éxito!</h3>
              <p className="text-sm text-green-700 mt-1">{success}</p>
            </div>
            <button
              onClick={clearSuccess}
              className="text-green-600 hover:text-green-800 flex-shrink-0 p-1"
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
        <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-3">ℹ️ Información Importante</h3>
          <ul className="space-y-2 text-sm text-blue-800">
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
