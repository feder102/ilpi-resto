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

const statusConfig: Record<string, { label: string; badgeClass: string; icon: React.ReactNode }> = {
  Pendiente: {
    label: 'Pendiente',
    badgeClass: 'badge badge-warning',
    icon: <Clock className="w-4 h-4" />,
  },
  Aprobado: {
    label: 'Aprobado',
    badgeClass: 'badge badge-success',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  Rechazado: {
    label: 'Rechazado',
    badgeClass: 'badge badge-error',
    icon: <XCircle className="w-4 h-4" />,
  },
  Cancelado: {
    label: 'Cancelado',
    badgeClass: 'badge badge-ghost',
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
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title text-2xl">Mis Solicitudes de Vacaciones</h2>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => onFilterChange?.(null)}
            className={`btn btn-sm ${statusFilter === null ? 'btn-primary' : 'btn-ghost'}`}
          >
            Todas
          </button>
          <button
            onClick={() => onFilterChange?.('Pendiente')}
            className={`btn btn-sm ${statusFilter === 'Pendiente' ? 'btn-warning' : 'btn-ghost'}`}
          >
            Pendientes
          </button>
          <button
            onClick={() => onFilterChange?.('Aprobado')}
            className={`btn btn-sm ${statusFilter === 'Aprobado' ? 'btn-success' : 'btn-ghost'}`}
          >
            Aprobadas
          </button>
          <button
            onClick={() => onFilterChange?.('Rechazado')}
            className={`btn btn-sm ${statusFilter === 'Rechazado' ? 'btn-error' : 'btn-ghost'}`}
          >
            Rechazadas
          </button>
          <button
            onClick={() => onFilterChange?.('Cancelado')}
            className={`btn btn-sm ${statusFilter === 'Cancelado' ? 'btn-neutral' : 'btn-ghost'}`}
          >
            Canceladas
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <span className="ml-3 text-base-content/60">Cargando solicitudes...</span>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Calendar className="w-12 h-12 text-base-content/30 mb-3" />
            <p className="text-base-content/60 font-medium">No tienes solicitudes</p>
            <p className="text-sm text-base-content/60 mt-1">
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
                    className="border border-base-300 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left side - Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          {/* Status Badge */}
                          <span className={`${config.badgeClass} gap-1`}>
                            {config.icon}
                            {config.label}
                          </span>

                          {/* Dates */}
                          <span className="text-sm text-base-content/60 flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(request.start_date)} → {formatDate(request.end_date)}
                          </span>
                        </div>

                        {/* Days info */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-base-content/60 uppercase font-medium">Días</p>
                            <p className="text-lg font-semibold text-base-content">
                              {request.requested_days || daysDiff}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-base-content/60 uppercase font-medium">Creada</p>
                            <p className="text-sm text-base-content">
                              {new Date(request.created_at).toLocaleDateString('es-ES', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                          {request.reviewed_at && (
                            <div>
                              <p className="text-xs text-base-content/60 uppercase font-medium">Revisada</p>
                              <p className="text-sm text-base-content">
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
                            className="btn btn-error btn-outline btn-sm gap-2"
                          >
                            {cancelling === request.id ? (
                              <span className="loading loading-spinner loading-xs"></span>
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
                      <div role="alert" className="alert alert-error mt-3 py-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-xs">{cancelError}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-base-300">
                <p className="text-sm text-base-content/60">
                  Página {page} de {totalPages}
                </p>
                <div className="join">
                  <button
                    onClick={() => onPageChange?.(page - 1)}
                    disabled={page === 1 || loading}
                    className="join-item btn btn-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>
                  <button
                    onClick={() => onPageChange?.(page + 1)}
                    disabled={page === totalPages || loading}
                    className="join-item btn btn-sm"
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
    </div>
  );
}
