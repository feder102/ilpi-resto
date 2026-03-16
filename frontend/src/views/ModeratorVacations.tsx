/**
 * T040: VacationApproval - Feature 006 US2 Main View
 *
 * Displays list of vacation requests for moderator's department.
 * Allows moderator to review, approve, and reject requests.
 *
 * Features:
 * - List of pending/all vacation requests
 * - Filters by status, employee, date range
 * - Click to view details and approve/reject
 * - Error and loading state handling
 * - Success/error toast notifications
 */

import { useState, useEffect } from 'react';
import VacationRequestList from '../components/moderator/VacationRequestList';
import VacationRequestDetail from '../components/moderator/VacationRequestDetail';
import { moderatorService } from '../services/moderatorService';
import { extractErrorMessage } from '../utils/errorHandler';

interface VacationRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  start_date: string;
  end_date: string;
  requested_days: number;
  status: string;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export default function ModeratorVacations() {
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('Pendiente');
  const [employeeFilter, setEmployeeFilter] = useState<string>('');

  /**
   * Fetch vacation requests
   */
  useEffect(() => {
    fetchRequests();
  }, [statusFilter, employeeFilter]);

  const fetchRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await moderatorService.getPendingVacationRequests(
        statusFilter || undefined,
        employeeFilter || undefined
      );
      setRequests(response.requests);
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestApproved = async () => {
    setSuccessMessage('Solicitud aprobada exitosamente');
    setSelectedRequestId(null);
    await fetchRequests();
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleRequestRejected = async () => {
    setSuccessMessage('Solicitud rechazada');
    setSelectedRequestId(null);
    await fetchRequests();
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-base-content">Solicitudes de Vacaciones</h1>
        <p className="text-base-content/60">
          Revisa y aprueba/rechaza solicitudes de vacaciones de tu equipo
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="alert alert-success mb-4">
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="alert alert-error mb-4">
          <span className="font-medium">Error</span>
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request List */}
        <div className="lg:col-span-2">
          <VacationRequestList
            requests={requests}
            isLoading={isLoading}
            selectedRequestId={selectedRequestId}
            onSelectRequest={setSelectedRequestId}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            employeeFilter={employeeFilter}
            onEmployeeFilterChange={setEmployeeFilter}
          />
        </div>

        {/* Request Detail Modal/Sidebar */}
        <div className="lg:col-span-1">
          {selectedRequestId && (
            <VacationRequestDetail
              requestId={selectedRequestId}
              onApproved={handleRequestApproved}
              onRejected={handleRequestRejected}
              onClose={() => setSelectedRequestId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
