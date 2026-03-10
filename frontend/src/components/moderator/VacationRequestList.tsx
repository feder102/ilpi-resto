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
 * Get status badge color
 */
function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'Pendiente':
      return 'bg-yellow-100 text-yellow-800';
    case 'Aprobado':
      return 'bg-green-100 text-green-800';
    case 'Rechazado':
      return 'bg-red-100 text-red-800';
    case 'Cancelado':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
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
    <div className="bg-white rounded-lg shadow">
      {/* Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="space-y-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <div className="flex gap-2 flex-wrap">
              {['Pendiente', 'Aprobado', 'Rechazado', 'Cancelado'].map(status => (
                <button
                  key={status}
                  onClick={() => onStatusFilterChange(status)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                    statusFilter === status
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Employee Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar empleado
            </label>
            <input
              type="text"
              placeholder="Nombre del empleado..."
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showAdvancedFilters ? '▼ Ocultar filtros avanzados' : '▶ Mostrar filtros avanzados'}
          </button>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="pt-2 border-t border-gray-200 space-y-3">
              <p className="text-sm font-medium text-gray-700">Rango de Fechas</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Desde</label>
                  <input
                    type="date"
                    value={dateFromFilter}
                    onChange={e => setDateFromFilter(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Hasta</label>
                  <input
                    type="date"
                    value={dateToFilter}
                    onChange={e => setDateToFilter(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
              {(dateFromFilter || dateToFilter) && (
                <button
                  onClick={() => {
                    setDateFromFilter('');
                    setDateToFilter('');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Limpiar fechas
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Request List */}
      <div className="divide-y divide-gray-200">
        {isLoading && (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600 text-sm">Cargando solicitudes...</p>
          </div>
        )}

        {!isLoading && filteredRequests.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-500">
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
              className={`p-4 cursor-pointer hover:bg-gray-50 transition ${
                selectedRequestId === request.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Employee Name */}
                  <h3 className="font-semibold text-gray-900">{request.employee_name}</h3>

                  {/* Dates */}
                  <p className="text-sm text-gray-600 mt-1">
                    📅 {formatDate(request.start_date)} - {formatDate(request.end_date)}
                  </p>

                  {/* Days Requested */}
                  <p className="text-sm text-gray-600">
                    📊 {request.requested_days} día{request.requested_days !== 1 ? 's' : ''}
                  </p>

                  {/* Created Date */}
                  <p className="text-xs text-gray-500 mt-2">
                    Solicitado: {formatDate(request.created_at)}
                  </p>
                </div>

                {/* Status Badge */}
                <div className="ml-4">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                      request.status
                    )}`}
                  >
                    {request.status}
                  </span>
                </div>
              </div>

              {/* Reviewed Info */}
              {request.reviewed_by && (
                <p className="text-xs text-gray-500 mt-2">
                  Revisado: {formatDate(request.reviewed_at || '')}
                </p>
              )}
            </div>
          ))}
      </div>

      {/* Summary */}
      {!isLoading && filteredRequests.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
          Mostrando {filteredRequests.length} de {requests.length} solicitud
          {requests.length !== 1 ? 'es' : ''}
        </div>
      )}
    </div>
  );
}
