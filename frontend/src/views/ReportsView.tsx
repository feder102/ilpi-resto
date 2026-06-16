// T037 + Feature 009: Reports view with real data, date filters, visible errors and empty states
import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { Card, Button, Alert, Spinner } from '../components/ui';
import type { HoursByDayItem, DepartmentDistItem } from '../types/api';
import { getHoursByDay, getDepartmentDistribution } from '../services/dashboardService';

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export default function ReportsView() {
  const [hoursByDay, setHoursByDay] = useState<HoursByDayItem[]>([]);
  const [deptDist, setDeptDist] = useState<DepartmentDistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(isoDaysAgo(30));
  const [dateTo, setDateTo] = useState(today());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [hours, dept] = await Promise.all([
        getHoursByDay({ date_from: dateFrom, date_to: dateTo }),
        getDepartmentDistribution(),
      ]);
      setHoursByDay(hours);
      setDeptDist(dept);
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ||
            'No se pudieron cargar los informes'
          : 'Error de conexión con el servidor';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const totalHours = hoursByDay.reduce((acc, item) => acc + (item.hours || 0), 0);
  const hasHoursData = totalHours > 0;
  const hasDeptData = deptDist.some((d) => d.count > 0);

  return (
    <div className="max-w-7xl">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-base-content">Informes</h1>

      {/* Date range filter */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-base-content/70" htmlFor="date-from">Desde</label>
            <input
              id="date-from"
              type="date"
              className="input input-bordered input-sm"
              value={dateFrom}
              max={dateTo}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-base-content/70" htmlFor="date-to">Hasta</label>
            <input
              id="date-to"
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
        <Alert variant="error" className="mb-6" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" label="Cargando informes..." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-6">
            {/* Hours by day chart */}
            <Card>
              <h3 className="text-base sm:text-lg font-semibold text-base-content mb-4">
                Horas por Día de la Semana
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
                <EmptyChart message="No hay horas registradas en el período seleccionado." />
              )}
            </Card>

            {/* Department distribution */}
            <Card>
              <h3 className="text-base sm:text-lg font-semibold text-base-content mb-4">
                Distribución por Departamento
              </h3>
              {hasDeptData ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={deptDist}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No hay empleados activos para mostrar." />
              )}
            </Card>
          </div>

          {/* Export placeholder */}
          <Card>
            <h3 className="text-base sm:text-lg font-semibold text-base-content mb-4">Exportar</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button disabled variant="secondary" title="Disponible en futuras versiones">
                Exportar PDF — Próximamente
              </Button>
              <Button disabled variant="secondary" title="Disponible en futuras versiones">
                Exportar Excel — Próximamente
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center h-[300px] text-base-content/50">
      <BarChart3 size={40} className="mb-3 opacity-40" />
      <p className="text-sm max-w-xs">{message}</p>
    </div>
  );
}
