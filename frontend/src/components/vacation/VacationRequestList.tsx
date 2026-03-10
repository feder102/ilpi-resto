/**
 * VacationRequestList - Display Vacation Request History
 * Feature 005: Employee Workspace Portal (US3)
 *
 * Features:
 * - Display all vacation requests (Pendiente, Aprobado, Rechazado, Cancelado)
 * - Cancel button only for Pendiente requests
 * - Status badges with color coding
 * - Pagination support
 * - Loading and error states
 */

import React, { useState } from 'react';
import {
  Calendar,
  Loader,
  AlertCircle,
  XCircle,
  CheckCircle,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { VacationRequest } from '../../types/models';

interface VacationRequestListProps {
  requests: VacationRequest[];
  loading: boolean;
  page: number;
  totalPages: number;
  statusFilter: string | null;
  submitting: boolean;
  onFilterChange?: (status: string | null) => void;
  onPageChange?: (page: number) => void;
  onCancel?: (requestId: string, version: number) => Promise<void>;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  Pendiente: {
    label: 'Pendiente',
    color: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    icon: <Clock className="w-4 h-4" />,
  },
  Aprobado: {
    label: 'Aprobado',
    color: 'bg-green-100 border-green-300 text-green-800',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  Rechazado: {
    label: 'Rechazado',
    color: 'bg-red-100 border-red-300 text-red-800',
    icon: <XCircle className="w-4 h-4" />,
  },
  Cancelado: {
    label: 'Cancelado',
    color: 'bg-gray-100 border-gray-300 text-gray-800',
    icon: <XCircle className="w-4 h-4" />,
  },
};

export default function VacationRequestList({
  requests,
  loading,
  page,
  totalPages,
  statusFilter,
  submitting,
  onFilterChange,
  onPageChange,
  onCancel,
}: VacationRequestListProps) {
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string>('');

  const handleCancel = async (requestId: string, version: number) => {
    if (!onCancel) return;

    setCancelling(requestId);
    setCancelError('');
    try {
      await onCancel(requestId, version);
    } catch (err: any) {
      setCancelError(err.response?.data?.detail || 'Error al cancelar la solicitud');
    } finally {
      setCancelling(null);
    }
  };

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Mis Solicitudes de Vacaciones</h2>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => onFilterChange?.(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            statusFilter === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => onFilterChange?.('Pendiente')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            statusFilter === 'Pendiente'
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Pendientes
        </button>
        <button
          onClick={() => onFilterChange?.('Aprobado')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            statusFilter === 'Aprobado'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Aprobadas
        </button>
        <button
          onClick={() => onFilterChange?.('Rechazado')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            statusFilter === 'Rechazado'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Rechazadas
        </button>
        <button
          onClick={() => onFilterChange?.('Cancelado')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            statusFilter === 'Cancelado'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Canceladas
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-gray-600">Cargando solicitudes...</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium">No tienes solicitudes</p>
          <p className="text-sm text-gray-500 mt-1">
            {statusFilter ? 'con ese estado' : 'todavía. ¡Solicita tus vacaciones!'}
          </p>
        </div>
      ) : (
        <>
          {/* Requests List */}
          <div className="space-y-4 mb-6">
            {requests.map(request => {
              const config = statusConfig[request.status] || statusConfig['Pendiente'];
              const startDate = new Date(request.start_date);
              const endDate = new Date(request.end_date);
              const daysDiff =
                Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

              return (
                <div
                  key={request.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left side - Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${config.color}`}
                        >
                          {config.icon}
                          {config.label}
                        </span>

                        {/* Dates */}
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(request.start_date)} → {formatDate(request.end_date)}
                        </span>
                      </div>

                      {/* Days info */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium">Días</p>
                          <p className="text-lg font-semibold text-gray-800">
                            {request.requested_days || daysDiff}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium">Creada</p>
                          <p className="text-sm text-gray-700">
                            {new Date(request.created_at).toLocaleDateString('es-ES', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        {request.reviewed_at && (
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-medium">Revisada</p>
                            <p className="text-sm text-gray-700">
                              {new Date(request.reviewed_at).toLocaleDateString('es-ES', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right side - Actions */}
                    <div className="flex flex-col items-end gap-2">
                      {request.status === 'Pendiente' && (
                        <button
                          onClick={() => handleCancel(request.id, request.version)}
                          disabled={submitting || cancelling === request.id}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {cancelling === request.id ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          {cancelling === request.id ? 'Cancelando...' : 'Cancelar'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Error message for cancel */}
                  {cancelError && cancelling === request.id && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded flex gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">{cancelError}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => onPageChange?.(page - 1)}
                  disabled={page === 1 || loading}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                <button
                  onClick={() => onPageChange?.(page + 1)}
                  disabled={page === totalPages || loading}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
