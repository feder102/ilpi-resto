// T037 + Feature 009: Reports view with real data, date filters, visible errors and empty states
// Feature 015: Admin-only "Métricas de Personal" section (overtime ratio, absenteeism,
// overtime ranking, accrued vacation liability)
import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import { BarChart3, TrendingUp, AlertTriangle, CalendarClock, CalendarRange, Info } from 'lucide-react';
import { Card, Button, Alert, Spinner, Table } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import type {
  HoursByDayItem,
  DepartmentDistItem,
  OvertimeRatio,
  OvertimeRanking,
  Absenteeism,
  VacationLiability,
} from '../types/api';
import {
  getHoursByDay,
  getDepartmentDistribution,
  getOvertimeRatio,
  getOvertimeRanking,
  getAbsenteeism,
  getVacationLiability,
} from '../services/dashboardService';

function toNum(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return value;
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

/** Format an ISO date (YYYY-MM-DD) for display, parsing as local time to avoid TZ drift. */
function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ReportsView() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('Admin');
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
          <Button
            variant="secondary"
            size="sm"
            onClick={load}
            disabled={loading}
          >
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

          {/* Feature 015: Admin-only personnel metrics */}
          {isAdmin && (
            <PersonnelMetrics dateFrom={dateFrom} dateTo={dateTo} />
          )}
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

interface PersonnelMetricsProps {
  dateFrom: string;
  dateTo: string;
}

function PersonnelMetrics({ dateFrom, dateTo }: PersonnelMetricsProps) {
  const [ratio, setRatio] = useState<OvertimeRatio | null>(null);
  const [ranking, setRanking] = useState<OvertimeRanking | null>(null);
  const [absenteeism, setAbsenteeism] = useState<Absenteeism | null>(null);
  const [liability, setLiability] = useState<VacationLiability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const period = { date_from: dateFrom, date_to: dateTo };
      const [ratioRes, rankingRes, absRes, liabRes] = await Promise.all([
        getOvertimeRatio(period),
        getOvertimeRanking({ ...period, limit: 10 }),
        getAbsenteeism(period),
        getVacationLiability(),
      ]);
      setRatio(ratioRes);
      setRanking(rankingRes);
      setAbsenteeism(absRes);
      setLiability(liabRes);
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ||
            'No se pudieron cargar las métricas de personal'
          : 'Error de conexión con el servidor';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const ratioPct = ratio?.ratio_pct;
  const absRate = absenteeism ? toNum(absenteeism.rate_pct) : 0;
  const rankingData = (ranking?.items ?? []).map((item) => ({
    name: item.employee_name,
    hours: toNum(item.extra_hours),
  }));
  const hasRanking = rankingData.length > 0;

  return (
    <div className="mb-6">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-base-content">Métricas de Personal</h2>

      {error && (
        <Alert variant="error" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" label="Cargando métricas..." />
        </div>
      ) : (
        <>
          {/* ─── Bloque 1: métricas del período (reaccionan al filtro de fechas) ─── */}
          <section className="mb-8">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h3 className="text-lg font-semibold text-base-content">Actividad del Período</h3>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-base-200 px-3 py-1 text-xs font-medium text-base-content/70">
                <CalendarRange className="w-3.5 h-3.5" />
                {formatDisplayDate(dateFrom)} — {formatDisplayDate(dateTo)}
              </span>
            </div>

            {/* KPI cards del período */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <Card className="bg-primary/10 border-2 border-primary/30">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-base-content/60">Ratio Horas Extras</p>
                    <p className="text-3xl font-bold text-primary mt-1">
                      {ratioPct === null || ratioPct === undefined
                        ? 'N/D'
                        : `${toNum(ratioPct).toFixed(1)}%`}
                    </p>
                    <p className="text-xs text-base-content/60 mt-1">
                      {toNum(ratio?.extra_hours).toFixed(1)}h extra ·{' '}
                      {toNum(ratio?.ordinary_hours).toFixed(1)}h ordinarias
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-primary/60" />
                </div>
              </Card>

              <Card
                className={
                  absenteeism?.alert
                    ? 'bg-error/10 border-2 border-error/40'
                    : 'bg-success/10 border-2 border-success/30'
                }
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-base-content/60">Tasa de Absentismo</p>
                    <p
                      className={`text-3xl font-bold mt-1 ${
                        absenteeism?.alert ? 'text-error' : 'text-success'
                      }`}
                    >
                      {absRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-base-content/60 mt-1">
                      {absenteeism?.total_absences ?? 0} ausencias (
                      {absenteeism?.justified_absences ?? 0} just. /{' '}
                      {absenteeism?.unjustified_absences ?? 0} injust.)
                    </p>
                  </div>
                  <AlertTriangle
                    className={`w-8 h-8 ${absenteeism?.alert ? 'text-error/70' : 'text-success/60'}`}
                  />
                </div>
              </Card>
            </div>

            {/* Overtime ranking */}
            <Card>
              <h4 className="text-base sm:text-lg font-semibold text-base-content mb-4">
                Ranking de Horas Extras
              </h4>
              {hasRanking ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={rankingData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="currentColor"
                      className="text-base-content/10"
                    />
                    <XAxis type="number" tick={{ fill: 'currentColor' }} className="text-base-content/70" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fill: 'currentColor', fontSize: 12 }}
                      className="text-base-content/70"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--b1))',
                        border: '1px solid hsl(var(--bc) / 0.2)',
                        borderRadius: '0.5rem',
                        color: 'hsl(var(--bc))',
                      }}
                      formatter={(value) => [`${toNum(value as number).toFixed(1)}h`, 'Horas extra']}
                    />
                    <Bar dataKey="hours" fill="#7C3AED" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No hay horas extra registradas en el período seleccionado." />
              )}
            </Card>
          </section>

          {/* ─── Bloque 2: pasivo de vacaciones (año en curso, NO usa el filtro de fechas) ─── */}
          <section className="mb-6 border-t border-base-300 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <h3 className="text-lg font-semibold text-base-content">Pasivo de Vacaciones</h3>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-base-200 px-3 py-1 text-xs font-medium text-base-content/70">
                <CalendarClock className="w-3.5 h-3.5" />
                Año {liability?.year ?? new Date().getFullYear()}
              </span>
            </div>
            <p className="text-xs text-base-content/60 mb-4">
              Se calcula sobre el año en curso y no depende del filtro de fechas de arriba.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Pasivo total */}
              <Card className="bg-secondary/10 border-2 border-secondary/30 self-start">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-base-content/60">Pasivo Total</p>
                    <p className="text-3xl font-bold text-secondary mt-1">
                      {toNum(liability?.total_liability)} días
                    </p>
                    <p className="text-xs text-base-content/60 mt-1">
                      Devengados {toNum(liability?.total_accrued)} · usados {toNum(liability?.total_used)}
                    </p>
                  </div>
                  <CalendarClock className="w-8 h-8 text-secondary/60" />
                </div>
              </Card>

              {/* Vacation liability table */}
              <Card className="lg:col-span-2">
                <h4 className="text-base sm:text-lg font-semibold text-base-content mb-4">
                  Pasivo por Empleado
                </h4>
                {liability && liability.items.length > 0 ? (
                  <Table>
                    <thead>
                      <tr>
                        <Table.Head>Empleado</Table.Head>
                        <Table.Head className="text-right">Anual</Table.Head>
                        <Table.Head className="text-right">Devengado</Table.Head>
                        <Table.Head className="text-right">Usados</Table.Head>
                        <Table.Head className="text-right">Pasivo</Table.Head>
                      </tr>
                    </thead>
                    <tbody>
                      {liability.items.map((item) => (
                        <Table.Row key={item.employee_id}>
                          <Table.Cell>{item.employee_name}</Table.Cell>
                          <Table.Cell className="text-right">{toNum(item.annual_days)}</Table.Cell>
                          <Table.Cell className="text-right">{toNum(item.accrued_days)}</Table.Cell>
                          <Table.Cell className="text-right">{toNum(item.used_days)}</Table.Cell>
                          <Table.Cell
                            className={`text-right font-semibold ${
                              toNum(item.liability_days) < 0 ? 'text-error' : 'text-base-content'
                            }`}
                          >
                            {toNum(item.liability_days)}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <EmptyChart message="No hay empleados activos para calcular el pasivo." />
                )}
              </Card>
            </div>
          </section>

          <MetricsGlossary />
        </>
      )}
    </div>
  );
}

const GLOSSARY_ITEMS = [
  {
    term: 'Ratio de Horas Extras vs. Ordinarias',
    purpose:
      'Control de costos: avisa si se está gastando de más en recargos y si conviene contratar personal nuevo para abaratar costos.',
    formula: '(horas extra ÷ horas ordinarias) × 100, sobre el período del filtro de fechas.',
  },
  {
    term: 'Tasa de Absentismo',
    purpose:
      'Alerta operativa y de clima: mide el % de tiempo perdido. Si supera el 5%, señala posibles problemas de salud, motivación o conflicto interno.',
    formula:
      '(total de ausencias ÷ turnos planificados) × 100. Incluye justificadas e injustificadas; se desglosan por separado.',
  },
  {
    term: 'Ranking de Horas Extras',
    purpose:
      'Prevención de burnout: identifica con nombre y apellido a los empleados más sobrecargados para redistribuir tareas antes de que se quemen o cometan errores.',
    formula:
      'Suma de horas con origen "extra" por empleado en el período, ordenadas de mayor a menor (top 10).',
  },
  {
    term: 'Pasivo de Vacaciones (Devengamiento)',
    purpose:
      'Control de deuda y descanso: muestra cuántos días le debe la empresa a cada empleado, para obligar a rotar los descansos y evitar que se acumule una deuda económica grande.',
    formula:
      'Devengado = días anuales × (meses trabajados en el año ÷ 12). Pasivo = devengado − días ya usados (puede ser negativo si tomó un adelanto).',
  },
];

function MetricsGlossary() {
  return (
    <Card className="bg-info/10 border-2 border-info/30">
      <h3 className="font-semibold text-info mb-4 flex items-center gap-2">
        <Info className="w-5 h-5" />
        Glosario de Métricas de Personal
      </h3>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
        {GLOSSARY_ITEMS.map((item) => (
          <div key={item.term}>
            <dt className="font-semibold text-base-content text-sm">{item.term}</dt>
            <dd className="text-sm text-base-content/70 mt-1">{item.purpose}</dd>
            <dd className="text-xs text-base-content/60 mt-1">
              <span className="font-medium">Cálculo:</span> {item.formula}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
