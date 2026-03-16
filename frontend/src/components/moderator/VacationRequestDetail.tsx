/**
 * T042: VacationRequestDetail - Feature 006 US2 Request Detail Component
 *
 * Displays detailed vacation request information in a sidebar/modal.
 * Shows employee details, balance, and approve/reject buttons.
 *
 * Features:
 * - Full request details with employee info
 * - Vacation balance display
 * - Approve button with confirmation
 * - Reject button with optional reason input
 * - Loading and error states
 * - Success/error feedback
 */

import { useEffect, useState } from 'react';
import { moderatorService } from '../../services/moderatorService';
import { extractErrorMessage } from '../../utils/errorHandler';

interface VacationDetail {
  id: string;
  employee_id: string;
  employee: {
    name: string;
    department: string;
    hire_date: string | null;
  };
  start_date: string;
  end_date: string;
  requested_days: number;
  status: string;
  balance: {
    year: number;
    total_days: number;
    used_days: number;
    remaining_days: number;
  };
  created_at: string;
}

interface VacationRequestDetailProps {
  requestId: string;
  onApproved: () => void;
  onRejected: () => void;
  onClose: () => void;
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Pendiente':
      return 'badge-warning';
    case 'Aprobado':
      return 'badge-success';
    case 'Rechazado':
      return 'badge-error';
    case 'Cancelado':
      return 'badge-ghost';
    default:
      return 'badge-ghost';
  }
}

export default function VacationRequestDetail({
  requestId,
  onApproved,
  onRejected,
  onClose,
}: VacationRequestDetailProps) {
  const [detail, setDetail] = useState<VacationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  /**
   * Fetch request details
   */
  useEffect(() => {
    fetchDetail();
  }, [requestId]);

  const fetchDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await moderatorService.getVacationRequestDetails(requestId);
      setDetail(data);
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Approve request
   */
  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);
    try {
      await moderatorService.approveVacationRequest(requestId);
      setShowApproveConfirm(false);
      onApproved();
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsApproving(false);
    }
  };

  /**
   * Reject request
   */
  const handleReject = async () => {
    setIsRejecting(true);
    setError(null);
    try {
      await moderatorService.rejectVacationRequest(requestId, rejectReason || undefined);
      setShowRejectReason(false);
      setRejectReason('');
      onRejected();
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsRejecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="card bg-base-100 shadow-sm h-full">
        <div className="card-body items-center justify-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-base-content/60 text-sm mt-2">Cargando detalles...</p>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="card bg-base-100 shadow-sm h-full">
        <div className="card-body items-center justify-center">
          <p className="text-base-content/60">Selecciona una solicitud para ver los detalles</p>
        </div>
      </div>
    );
  }

  const isApprovedOrRejected = detail.status !== 'Pendiente';

  return (
    <div className="card bg-base-100 shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-base-300 flex items-center justify-between">
        <h3 className="font-bold text-lg">Detalles de la Solicitud</h3>
        <button
          onClick={onClose}
          className="btn btn-ghost btn-sm"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Error */}
        {error && (
          <div role="alert" className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        {/* Employee Info */}
        <div className="bg-primary/10 p-4 rounded-lg">
          <p className="text-sm text-base-content/60 mb-1">Empleado</p>
          <p className="font-bold text-lg text-base-content">{detail.employee.name}</p>
          <p className="text-sm text-base-content/60">{detail.employee.department}</p>
          {detail.employee.hire_date && (
            <p className="text-xs text-base-content/60 mt-2">
              Contratado: {formatDate(detail.employee.hire_date)}
            </p>
          )}
        </div>

        {/* Dates */}
        <div>
          <p className="text-sm font-medium text-base-content mb-2">Fechas Solicitadas</p>
          <div className="bg-base-200 p-3 rounded text-sm">
            <p className="text-base-content">
              <span className="font-semibold">De:</span> {formatDate(detail.start_date)}
            </p>
            <p className="text-base-content">
              <span className="font-semibold">Hasta:</span> {formatDate(detail.end_date)}
            </p>
            <p className="text-base-content mt-2">
              <span className="font-semibold">Total:</span> {detail.requested_days} día
              {detail.requested_days !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Vacation Balance */}
        <div>
          <p className="text-sm font-medium text-base-content mb-2">Saldo de Vacaciones {detail.balance.year}</p>
          <div className="bg-base-200 p-3 rounded text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-base-content/60">Días totales:</span>
              <span className="font-semibold text-base-content">{detail.balance.total_days}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/60">Días usados:</span>
              <span className="font-semibold text-warning">{detail.balance.used_days}</span>
            </div>
            <div className="border-t border-base-300 pt-2 flex justify-between">
              <span className="text-base-content/60">Días disponibles:</span>
              <span className="font-bold text-success">{detail.balance.remaining_days}</span>
            </div>
          </div>

          {/* Balance Check */}
          {detail.requested_days > detail.balance.remaining_days && (
            <div role="alert" className="alert alert-error mt-2 py-2">
              <span className="text-sm">
                Saldo insuficiente ({detail.requested_days} días solicitados vs{' '}
                {detail.balance.remaining_days} disponibles)
              </span>
            </div>
          )}
        </div>

        {/* Status */}
        <div>
          <p className="text-sm font-medium text-base-content mb-2">Estado</p>
          <span className={`badge ${getStatusBadgeClass(detail.status)}`}>{detail.status}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-base-300 space-y-2">
        {/* Approve Button */}
        {!isApprovedOrRejected && (
          <>
            {showApproveConfirm ? (
              <div className="space-y-2">
                <p className="text-sm text-base-content font-medium">¿Confirmar aprobación?</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="btn btn-success btn-sm flex-1"
                  >
                    {isApproving ? 'Aprobando...' : 'Sí, Aprobar'}
                  </button>
                  <button
                    onClick={() => setShowApproveConfirm(false)}
                    className="btn btn-ghost btn-sm flex-1"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowApproveConfirm(true)}
                className="btn btn-success w-full"
              >
                Aprobar Solicitud
              </button>
            )}
          </>
        )}

        {/* Reject Button */}
        {!isApprovedOrRejected && (
          <>
            {showRejectReason ? (
              <div className="space-y-2 bg-error/10 p-3 rounded border border-error/30">
                <p className="text-sm font-medium text-base-content">Razón del rechazo (opcional)</p>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Ej: Necesitamos cobertura esa semana..."
                  maxLength={500}
                  className="textarea textarea-bordered w-full text-sm"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleReject}
                    disabled={isRejecting}
                    className="btn btn-error btn-sm flex-1"
                  >
                    {isRejecting ? 'Rechazando...' : 'Rechazar'}
                  </button>
                  <button
                    onClick={() => {
                      setShowRejectReason(false);
                      setRejectReason('');
                    }}
                    className="btn btn-ghost btn-sm flex-1"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowRejectReason(true)}
                className="btn btn-error w-full"
              >
                Rechazar Solicitud
              </button>
            )}
          </>
        )}

        {/* Already Processed */}
        {isApprovedOrRejected && (
          <div className="p-3 bg-base-200 rounded text-center text-sm text-base-content/60">
            Esta solicitud ya ha sido {detail.status === 'Aprobado' ? 'aprobada' : 'rechazada'}
          </div>
        )}
      </div>
    </div>
  );
}
