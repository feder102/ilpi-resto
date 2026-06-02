/**
 * Feature 006 US4 + Feature 009: Moderator Reports
 *
 * Reportes scopeados al departamento del moderador (el backend aplica RLS):
 * - Horas trabajadas por día de la semana (desde el reporte de asistencia)
 * - Resumen de vacaciones del equipo (aprobadas / pendientes / rechazadas)
 *
 * Reutiliza moderatorService (/reports/attendance, /reports/vacations) y los
 * componentes UI compartidos.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { Card, Button, Alert, Spinner } from '../components/ui';
import { moderatorService } from '../services/moderatorService';
import { extractErrorMessage } from '../utils/errorHandler';

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

interface HoursByDay {
  day: string;
  hours: number;
}

interface VacationTotals {
  approved_days: number;
  rejected_days: number;
  pending_days: number;
}

export default function ModeratorReports() {
  const navigate = useNavigate();

  const [dateFrom, setDateFrom] = useState(isoDaysAgo(30));
  const [dateTo, setDateTo] = useState(today());
  const [department, setDepartment] = useState<string>('');
  const [hoursByDay, setHoursByDay] = useState<HoursByDay[]>([]);
  const [vacationTotals, setVacationTotals] = useState<VacationTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const year = new Date(dateTo).getFullYear();
      const [attendance, vacations] = await Promise.all([
        moderatorService.getAttendanceReport(dateFrom, dateTo),
        moderatorService.getVacationSummary(year),
      ]);

      // Aggregate worked hours by weekday (Mon-first)
      const totals: Record<string, number> = Object.fromEntries(WEEKDAYS.map((d) => [d, 0]));
      for (const rec of attendance.records) {
        if (rec.hours_worked != null) {
          const weekday = WEEKDAYS[(new Date(rec.date + 'T00:00:00').getDay() + 6) % 7];
          totals[weekday] += rec.hours_worked;
        }
      }
      setHoursByDay(WEEKDAYS.map((d) => ({ day: d, hours: Math.round(totals[d] * 10) / 10 })));
      setDepartment(attendance.department || '');
      setVacationTotals(vacations.department_total);
    } catch (err) {
      setError(extractErrorMessage(err) || 'No se pudieron cargar los reportes');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const hasHoursData = hoursByDay.some((h) => h.hours > 0);

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="bg-base-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <button
            onClick={() => navigate('/moderator/dashboard')}
            className="btn btn-ghost btn-sm gap-2 mb-2 -ml-2"
          >
            <ArrowLeft size={16} /> Volver al panel
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-base-content">
            Reportes {department && <span className="text-base-content/60">· {department}</span>}
          </h1>
          <p className="mt-1 text-base-content/60">Asistencia y vacaciones de tu equipo</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Date filter */}
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
            <div className="form-control">
              <label className="label py-1" htmlFor="mod-date-from">
                <span className="label-text text-xs">Desde</span>
              </label>
              <input
                id="mod-date-from"
                type="date"
                className="input input-bordered input-sm"
                value={dateFrom}
                max={dateTo}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label py-1" htmlFor="mod-date-to">
                <span className="label-text text-xs">Hasta</span>
              </label>
              <input
                id="mod-date-to"
                type="date"
                className="input input-bordered input-sm"
                value={dateTo}
                min={dateFrom}
                max={today()}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              Actualizar
            </Button>
          </div>
        </Card>

        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" label="Cargando reportes..." />
          </div>
        ) : (
          <>
            {/* Vacation summary stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <div className="text-xs opacity-60">Días aprobados</div>
                <div className="text-2xl sm:text-3xl font-bold text-success">
                  {vacationTotals?.approved_days ?? 0}
                </div>
              </Card>
              <Card>
                <div className="text-xs opacity-60">Días pendientes</div>
                <div className="text-2xl sm:text-3xl font-bold text-warning">
                  {vacationTotals?.pending_days ?? 0}
                </div>
              </Card>
              <Card>
                <div className="text-xs opacity-60">Días rechazados</div>
                <div className="text-2xl sm:text-3xl font-bold text-error">
                  {vacationTotals?.rejected_days ?? 0}
                </div>
              </Card>
            </div>

            {/* Hours by day chart */}
            <Card>
              <h3 className="text-base sm:text-lg font-semibold text-base-content mb-4">
                Horas trabajadas por día de la semana
              </h3>
              {hasHoursData ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={hoursByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="hours" stroke="#4F46E5" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center text-center h-[300px] text-base-content/50">
                  <BarChart3 size={40} className="mb-3 opacity-40" />
                  <p className="text-sm max-w-xs">
                    No hay horas registradas en el período seleccionado.
                  </p>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
