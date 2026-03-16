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
import { Clock, LogIn, LogOut, AlertCircle } from 'lucide-react';
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
      <div className="card bg-base-100 shadow-md">
        <div className="card-body items-center justify-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-3 text-base-content/60">Cargando estado del fichaje...</p>
        </div>
      </div>
    );
  }

  const isClockedIn = clockStatus?.status === 'clocked_in';
  const isClockedOut = clockStatus?.status === 'clocked_out';
  const statusBorder = isClockedIn ? 'border-success' : 'border-base-300';
  const buttonIcon = isClockedIn ? <LogOut className="w-6 h-6" /> : <LogIn className="w-6 h-6" />;
  const buttonText = isClockedIn ? 'Registrar Salida' : 'Registrar Entrada';

  return (
    <div className={`card bg-base-100 shadow-md border-2 ${statusBorder}`}>
      <div className="card-body">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-6 h-6 text-base-content" />
          <h2 className="card-title text-2xl">Control de Fichaje</h2>
        </div>

        {/* Error Message */}
        {error && (
          <div role="alert" className="alert alert-error mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Status and Time */}
          <div className="flex flex-col items-center justify-center">
            {/* Status Badge */}
            <div className="mb-6">
              {isClockedIn && (
                <div className="badge badge-success badge-lg gap-2 p-4">
                  <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
                  <span className="font-semibold">Jornada Activa</span>
                </div>
              )}
              {isClockedOut && (
                <div className="badge badge-ghost badge-lg gap-2 p-4">
                  <div className="w-3 h-3 bg-base-content/40 rounded-full" />
                  <span className="font-semibold">Jornada Finalizada</span>
                </div>
              )}
              {!isClockedIn && !isClockedOut && (
                <div className="badge badge-info badge-lg gap-2 p-4">
                  <div className="w-3 h-3 bg-info rounded-full" />
                  <span className="font-semibold">Sin Registrar</span>
                </div>
              )}
            </div>

            {/* Elapsed Time Display (if clocked in) */}
            {isClockedIn && (
              <div className="mb-6 text-center">
                <p className="text-xs text-base-content/60 uppercase tracking-wide mb-2">Tiempo Transcurrido</p>
                <div className="text-5xl font-mono font-bold text-success">
                  {elapsedTime}
                </div>
              </div>
            )}

            {/* Clock Times */}
            {clockStatus?.record && (
              <div className="mb-6 text-center">
                <p className="text-xs text-base-content/60 uppercase tracking-wide mb-3">Horario</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-base-content/60">Entrada:</p>
                    <p className="text-lg font-semibold text-base-content">
                      {new Date(clockStatus.record.clock_in_timestamp).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {clockStatus.record.clock_out_timestamp && (
                    <div>
                      <p className="text-xs text-base-content/60">Salida:</p>
                      <p className="text-lg font-semibold text-base-content">
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
              className={`flex flex-col items-center justify-center w-48 h-48 rounded-full text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg ${
                isClockedIn ? 'bg-error hover:bg-error/80' : 'bg-success hover:bg-success/80'
              }`}
            >
              {submitting ? (
                <>
                  <span className="loading loading-spinner loading-lg mb-2"></span>
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
              <div className="mt-8 w-full bg-info/10 border border-info/30 rounded-lg p-4">
                <p className="text-xs text-base-content/60 uppercase font-medium tracking-wide mb-3">
                  Resumen del Día
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-base-content/60">Horas</p>
                    <p className="text-2xl font-bold text-info">
                      {clockStatus.summary.total_hours}h
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-base-content/60">Minutos</p>
                    <p className="text-2xl font-bold text-info">
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
          <p className="mt-6 text-center text-sm text-base-content/60 font-medium">
            {clockStatus.message}
          </p>
        )}
      </div>
    </div>
  );
}
