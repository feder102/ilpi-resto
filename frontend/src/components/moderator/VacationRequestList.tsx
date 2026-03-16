/**
 * T041: VacationRequestList - Feature 006 US2 Request List Component
 *
 * Displays list of vacation requests with filtering capabilities.
 * Shows pending requests by default.
 *
 * Features:
 * - List of vacation requests with employee details
 * - Filter by status (Pendiente, Aprobado, Rechazado)
 * - Filter by employee name
 * - Click row to view details
 * - Color-coded status badges
 * - Loading and empty states
 */

import { useState } from 'react';

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

interface VacationRequestListProps {
  requests: VacationRequest[];
  isLoading: boolean;
  selectedRequestId: string | null;
  onSelectRequest: (id: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  employeeFilter: string;
  onEmployeeFilterChange: (employee: string) => void;
}

/**
 * Get status badge class
 */
function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Pendiente':
      return 'badge badge-warning';
    case 'Aprobado':
      return 'badge badge-success';
    case 'Rechazado':
      return 'badge badge-error';
    case 'Cancelado':
      return 'badge badge-ghost';
    default:
      return 'badge badge-ghost';
  }
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function VacationRequestList({
  requests,
  isLoading,
  selectedRequestId,
  onSelectRequest,
  statusFilter,
  onStatusFilterChange,
  employeeFilter,
  onEmployeeFilterChange,
}: VacationRequestListProps) {
  const [searchInput, setSearchInput] = useState(employeeFilter);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    onEmployeeFilterChange(value);
  };

  /**
   * T045: Filter requests by date range
   */
  const getFilteredByDate = (reqs: VacationRequest[]) => {
    return reqs.filter(req => {
      if (dateFromFilter && new Date(req.start_date) < new Date(dateFromFilter)) return false;
      if (dateToFilter && new Date(req.end_date) > new Date(dateToFilter)) return false;
      return true;
    });
  };

  // Filter requests based on search and date range
  const filteredRequests = getFilteredByDate(
    requests.filter(req =>
      req.employee_name.toLowerCase().includes(searchInput.toLowerCase())
    )
  );

  return (
    <div className="card bg-base-100 shadow-sm">
      {/* Filters */}
      <div className="p-4 border-b border-base-300">
        <div className="space-y-4">
          {/* Status Filter */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Estado</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {['Pendiente', 'Aprobado', 'Rechazado', 'Cancelado'].map(status => (
                <button
                  key={status}
                  onClick={() => onStatusFilterChange(status)}
                  className={`btn btn-sm ${
                    statusFilter === status
                      ? 'btn-primary'
                      : 'btn-ghost'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Employee Filter */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Buscar empleado</span>
            </label>
            <input
              type="text"
              placeholder="Nombre del empleado..."
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              className="input input-bordered w-full"
            />
          </div>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="btn btn-ghost btn-sm text-primary"
          >
            {showAdvancedFilters ? 'Ocultar filtros avanzados' : 'Mostrar filtros avanzados'}
          </button>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="pt-2 border-t border-base-300 space-y-3">
              <p className="text-sm font-medium text-base-content">Rango de Fechas</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text-alt">Desde</span>
                  </label>
                  <input
                    type="date"
                    value={dateFromFilter}
                    onChange={e => setDateFromFilter(e.target.value)}
                    className="input input-bordered input-sm w-full"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text-alt">Hasta</span>
                  </label>
                  <input
                    type="date"
                    value={dateToFilter}
                    onChange={e => setDateToFilter(e.target.value)}
                    className="input input-bordered input-sm w-full"
                  />
                </div>
              </div>
              {(dateFromFilter || dateToFilter) && (
                <button
                  onClick={() => {
                    setDateFromFilter('');
                    setDateToFilter('');
                  }}
                  className="btn btn-ghost btn-xs"
                >
                  Limpiar fechas
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Request List */}
      <div className="divide-y divide-base-300">
        {isLoading && (
          <div className="p-8 text-center">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="mt-2 text-base-content/60 text-sm">Cargando solicitudes...</p>
          </div>
        )}

        {!isLoading && filteredRequests.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-base-content/60">
              {requests.length === 0
                ? 'No hay solicitudes de vacaciones'
                : 'No se encontraron solicitudes con los filtros especificados'}
            </p>
          </div>
        )}

        {!isLoading &&
          filteredRequests.map(request => (
            <div
              key={request.id}
              onClick={() => onSelectRequest(request.id)}
              className={`p-4 cursor-pointer hover:bg-base-200 transition ${
                selectedRequestId === request.id ? 'bg-primary/10 border-l-4 border-primary' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Employee Name */}
                  <h3 className="font-semibold text-base-content">{request.employee_name}</h3>

                  {/* Dates */}
                  <p className="text-sm text-base-content/60 mt-1">
                    {formatDate(request.start_date)} - {formatDate(request.end_date)}
                  </p>

                  {/* Days Requested */}
                  <p className="text-sm text-base-content/60">
                    {request.requested_days} día{request.requested_days !== 1 ? 's' : ''}
                  </p>

                  {/* Created Date */}
                  <p className="text-xs text-base-content/60 mt-2">
                    Solicitado: {formatDate(request.created_at)}
                  </p>
                </div>

                {/* Status Badge */}
                <div className="ml-4">
                  <span className={getStatusBadgeClass(request.status)}>
                    {request.status}
                  </span>
                </div>
              </div>

              {/* Reviewed Info */}
              {request.reviewed_by && (
                <p className="text-xs text-base-content/60 mt-2">
                  Revisado: {formatDate(request.reviewed_at || '')}
                </p>
              )}
            </div>
          ))}
      </div>

      {/* Summary */}
      {!isLoading && filteredRequests.length > 0 && (
        <div className="p-4 bg-base-200 border-t border-base-300 text-sm text-base-content/60">
          Mostrando {filteredRequests.length} de {requests.length} solicitud
          {requests.length !== 1 ? 'es' : ''}
        </div>
      )}
    </div>
  );
}
