/**
 * TimeClock Widget - Employee Time Tracking Clock
 * Feature 005: Employee Workspace Portal (US4)
 *
 * Dynamic clock widget showing:
 * - Large button for Clock In/Out
 * - Live elapsed time counter (if clocked in)
 * - Status indicator with color coding
 * - Today's summary (if clocked out)
 */

import { useState, useEffect, useRef } from 'react';
import { Clock, LogIn, LogOut, AlertCircle, Loader } from 'lucide-react';
import { timeTrackingService } from '../../services/timeTrackingService';

interface TimeClockProps {
  onStatusChange?: (status: 'clocked_in' | 'clocked_out' | 'not_clocked_in') => void;
}

interface TimeRecord {
  id: string;
  employee_id: string;
  date: string;
  clock_in_timestamp: string;
  clock_out_timestamp: string | null;
}

interface ClockStatus {
  status: 'clocked_in' | 'clocked_out' | 'not_clocked_in';
  record: TimeRecord | null;
  elapsed_seconds: number;
  summary?: {
    total_hours: number;
    total_minutes: number;
    formatted: string;
    clock_in: string;
    clock_out: string | null;
  };
  message: string;
}

// Helper to extract error message from various response formats
function extractErrorMessage(err: any): string {
  if (typeof err === 'string') return err;

  // Check nested error object format: {"detail":{"error":{"message":"..."}}}
  if (err?.response?.data?.detail?.error?.message) {
    return err.response.data.detail.error.message;
  }

  // Check simple error format: {"detail":"..."}
  if (typeof err?.response?.data?.detail === 'string') {
    return err.response.data.detail;
  }

  // Check if detail is an object with message property
  if (err?.response?.data?.detail?.message) {
    return err.response.data.detail.message;
  }

  return 'Error desconocido';
}

export default function TimeClock({ onStatusChange }: TimeClockProps) {
  const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load today's status on mount
  useEffect(() => {
    loadTodayStatus();
  }, []);

  // Update elapsed time every second if clocked in
  useEffect(() => {
    if (clockStatus?.status === 'clocked_in') {
      // Set up interval to update elapsed time
      elapsedIntervalRef.current = setInterval(() => {
        if (clockStatus) {
          const newElapsed = clockStatus.elapsed_seconds + 1;
          const hours = Math.floor(newElapsed / 3600);
          const minutes = Math.floor((newElapsed % 3600) / 60);
          const seconds = newElapsed % 60;
          const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
          setElapsedTime(formatted);
          setClockStatus(current => current ? { ...current, elapsed_seconds: newElapsed } : null);
        }
      }, 1000);
    }

    return () => {
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
      }
    };
  }, [clockStatus?.status, clockStatus?.elapsed_seconds]);

  const loadTodayStatus = async () => {
    try {
      setLoading(true);
      setError('');
      const status = await timeTrackingService.getTodayStatus();
      setClockStatus(status);
      onStatusChange?.(status.status);

      // Set initial elapsed time if clocked in
      if (status.status === 'clocked_in') {
        const hours = Math.floor(status.elapsed_seconds / 3600);
        const minutes = Math.floor((status.elapsed_seconds % 3600) / 60);
        const seconds = status.elapsed_seconds % 60;
        const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        setElapsedTime(formatted);
      }
    } catch (err: any) {
      const message = extractErrorMessage(err) || 'Error al cargar el estado del fichaje';
      setError(message);
      console.error('[TimeClock] Error loading status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    try {
      setSubmitting(true);
      setError('');
      const response = await timeTrackingService.clockIn();
      setClockStatus(() => ({
        status: 'clocked_in',
        record: response.time_record,
        elapsed_seconds: 0,
        message: response.message,
      }));
      setElapsedTime('00:00:00');
      onStatusChange?.('clocked_in');
    } catch (err: any) {
      const message = extractErrorMessage(err) || 'Error al registrar entrada';
      setError(message);
      console.error('[TimeClock] Clock-in failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setSubmitting(true);
      setError('');
      const response = await timeTrackingService.clockOut();
      setClockStatus({
        status: 'clocked_out',
        record: response.time_record,
        elapsed_seconds: 0,
        summary: response.summary,
        message: response.message,
      });
      onStatusChange?.('clocked_out');
    } catch (err: any) {
      const message = extractErrorMessage(err) || 'Error al registrar salida';
      setError(message);
      console.error('[TimeClock] Clock-out failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 flex flex-col items-center justify-center">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="mt-3 text-gray-600">Cargando estado del fichaje...</p>
      </div>
    );
  }

  const isClockedIn = clockStatus?.status === 'clocked_in';
  const isClockedOut = clockStatus?.status === 'clocked_out';
  const statusColor = isClockedIn ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200';
  const buttonColor = isClockedIn ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700';
  const buttonIcon = isClockedIn ? <LogOut className="w-6 h-6" /> : <LogIn className="w-6 h-6" />;
  const buttonText = isClockedIn ? 'Registrar Salida' : 'Registrar Entrada';

  return (
    <div className={`bg-white rounded-lg shadow-md p-8 border-2 ${statusColor}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Clock className="w-6 h-6 text-gray-700" />
        <h2 className="text-2xl font-bold text-gray-800">Control de Fichaje</h2>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Status and Time */}
        <div className="flex flex-col items-center justify-center">
          {/* Status Badge */}
          <div className="mb-6">
            {isClockedIn && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 border border-green-300 rounded-full">
                <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-green-700">Jornada Activa</span>
              </div>
            )}
            {isClockedOut && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-full">
                <div className="w-3 h-3 bg-gray-400 rounded-full" />
                <span className="text-sm font-semibold text-gray-700">Jornada Finalizada</span>
              </div>
            )}
            {!isClockedIn && !isClockedOut && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 border border-blue-300 rounded-full">
                <div className="w-3 h-3 bg-blue-600 rounded-full" />
                <span className="text-sm font-semibold text-blue-700">Sin Registrar</span>
              </div>
            )}
          </div>

          {/* Elapsed Time Display (if clocked in) */}
          {isClockedIn && (
            <div className="mb-6 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Tiempo Transcurrido</p>
              <div className="text-5xl font-mono font-bold text-green-600">
                {elapsedTime}
              </div>
            </div>
          )}

          {/* Clock Times */}
          {clockStatus?.record && (
            <div className="mb-6 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Horario</p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-600">Entrada:</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {new Date(clockStatus.record.clock_in_timestamp).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {clockStatus.record.clock_out_timestamp && (
                  <div>
                    <p className="text-xs text-gray-600">Salida:</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {new Date(clockStatus.record.clock_out_timestamp).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Clock Button and Summary */}
        <div className="flex flex-col items-center justify-center">
          {/* Clock Button */}
          <button
            onClick={isClockedIn ? handleClockOut : handleClockIn}
            disabled={submitting}
            className={`flex flex-col items-center justify-center w-48 h-48 rounded-full text-white font-bold transition-all ${buttonColor} disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg`}
          >
            {submitting ? (
              <>
                <Loader className="w-12 h-12 mb-2 animate-spin" />
                <span className="text-sm">Procesando...</span>
              </>
            ) : (
              <>
                {buttonIcon}
                <span className="mt-4 text-center text-lg">{buttonText}</span>
              </>
            )}
          </button>

          {/* Daily Summary (if clocked out) */}
          {isClockedOut && clockStatus?.summary && (
            <div className="mt-8 w-full p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-gray-600 uppercase font-medium tracking-wide mb-3">
                Resumen del Día
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Horas</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {clockStatus.summary.total_hours}h
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Minutos</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {clockStatus.summary.total_minutes}m
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message */}
      {clockStatus?.message && (
        <p className="mt-6 text-center text-sm text-gray-600 font-medium">
          ℹ️ {clockStatus.message}
        </p>
      )}
    </div>
  );
}
