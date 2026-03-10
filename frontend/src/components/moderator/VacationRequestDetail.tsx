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
      <div className="bg-white rounded-lg shadow p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
          <p className="text-gray-600 text-sm">Cargando detalles...</p>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="bg-white rounded-lg shadow p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Selecciona una solicitud para ver los detalles</p>
        </div>
      </div>
    );
  }

  const isApprovedOrRejected = detail.status !== 'Pendiente';

  return (
    <div className="bg-white rounded-lg shadow h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-bold text-lg">Detalles de la Solicitud</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl font-bold"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Employee Info */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Empleado</p>
          <p className="font-bold text-lg text-gray-900">{detail.employee.name}</p>
          <p className="text-sm text-gray-600">{detail.employee.department}</p>
          {detail.employee.hire_date && (
            <p className="text-xs text-gray-500 mt-2">
              Contratado: {formatDate(detail.employee.hire_date)}
            </p>
          )}
        </div>

        {/* Dates */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Fechas Solicitadas</p>
          <div className="bg-gray-50 p-3 rounded text-sm">
            <p className="text-gray-900">
              <span className="font-semibold">De:</span> {formatDate(detail.start_date)}
            </p>
            <p className="text-gray-900">
              <span className="font-semibold">Hasta:</span> {formatDate(detail.end_date)}
            </p>
            <p className="text-gray-900 mt-2">
              <span className="font-semibold">Total:</span> {detail.requested_days} día
              {detail.requested_days !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Vacation Balance */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Saldo de Vacaciones {detail.balance.year}</p>
          <div className="bg-gray-50 p-3 rounded text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Días totales:</span>
              <span className="font-semibold text-gray-900">{detail.balance.total_days}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Días usados:</span>
              <span className="font-semibold text-orange-600">{detail.balance.used_days}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between">
              <span className="text-gray-600">Días disponibles:</span>
              <span className="font-bold text-green-600">{detail.balance.remaining_days}</span>
            </div>
          </div>

          {/* Balance Check */}
          {detail.requested_days > detail.balance.remaining_days && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              ⚠️ Saldo insuficiente ({detail.requested_days} días solicitados vs{' '}
              {detail.balance.remaining_days} disponibles)
            </div>
          )}
        </div>

        {/* Status */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Estado</p>
          <div className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
            {detail.status}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        {/* Approve Button */}
        {!isApprovedOrRejected && (
          <>
            {showApproveConfirm ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-700 font-medium">¿Confirmar aprobación?</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded text-sm font-medium transition"
                  >
                    {isApproving ? 'Aprobando...' : '✓ Sí, Aprobar'}
                  </button>
                  <button
                    onClick={() => setShowApproveConfirm(false)}
                    className="flex-1 px-3 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded text-sm font-medium transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowApproveConfirm(true)}
                className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium transition"
              >
                ✓ Aprobar Solicitud
              </button>
            )}
          </>
        )}

        {/* Reject Button */}
        {!isApprovedOrRejected && (
          <>
            {showRejectReason ? (
              <div className="space-y-2 bg-red-50 p-3 rounded border border-red-200">
                <p className="text-sm font-medium text-gray-700">Razón del rechazo (opcional)</p>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Ej: Necesitamos cobertura esa semana..."
                  maxLength={500}
                  className="w-full px-2 py-2 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleReject}
                    disabled={isRejecting}
                    className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded text-sm font-medium transition"
                  >
                    {isRejecting ? 'Rechazando...' : '✕ Rechazar'}
                  </button>
                  <button
                    onClick={() => {
                      setShowRejectReason(false);
                      setRejectReason('');
                    }}
                    className="flex-1 px-3 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded text-sm font-medium transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowRejectReason(true)}
                className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium transition"
              >
                ✕ Rechazar Solicitud
              </button>
            )}
          </>
        )}

        {/* Already Processed */}
        {isApprovedOrRejected && (
          <div className="p-3 bg-gray-50 rounded text-center text-sm text-gray-600">
            Esta solicitud ya ha sido {detail.status === 'Aprobado' ? 'aprobada' : 'rechazada'}
          </div>
        )}
      </div>
    </div>
  );
}
