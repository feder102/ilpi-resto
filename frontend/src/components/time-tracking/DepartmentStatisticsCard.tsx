/**
 * DepartmentStatisticsCard - Displays department-level work statistics
 * Shows total hours, employee count, and average hours per employee
 */

import React, { useEffect, useState } from "react";
import Card from "../ui/Card";
import Alert from "../ui/Alert";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, Clock } from "lucide-react";
import { getDepartmentStatistics } from "../../services/statisticsService";
import type { DepartmentStatistics } from "../../types/timeTracking";

interface DepartmentStatisticsCardProps {
  department?: string;
  onDateChange?: (year: number, month: number) => void;
}

export const DepartmentStatisticsCard: React.FC<DepartmentStatisticsCardProps> = ({
  department,
  onDateChange,
}) => {
  const [stats, setStats] = useState<DepartmentStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getDepartmentStatistics(year, month, department);
        setStats(data);
        onDateChange?.(year, month);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar estadísticas");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [department, year, month, onDateChange]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const chartData = stats
    ? [
        {
          name: stats.department,
          "Horas Totales": typeof stats.total_hours === 'string'
            ? parseFloat(stats.total_hours)
            : stats.total_hours,
          "Promedio por Empleado": typeof stats.avg_hours_per_employee === 'string'
            ? parseFloat(stats.avg_hours_per_employee)
            : stats.avg_hours_per_employee,
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      {/* Month Navigator */}
      <Card>
        <div className="flex items-center justify-between p-4">
          <h3 className="font-semibold text-base-content">
            {department ? `${department} ` : ""}Estadísticas del Departamento
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="btn btn-sm btn-ghost"
            >
              ← Anterior
            </button>
            <span className="text-sm font-medium text-base-content/70 min-w-[100px] text-center">
              {year}-{String(month).padStart(2, "0")}
            </span>
            <button
              onClick={handleNextMonth}
              className="btn btn-sm btn-ghost"
            >
              Siguiente →
            </button>
          </div>
        </div>
      </Card>

      {/* Stats Display */}
      {loading ? (
        <Card>
          <div className="p-4 text-center text-base-content/60">Cargando...</div>
        </Card>
      ) : error ? (
        <Alert variant="error" message={error} />
      ) : stats ? (
        <>
          {/* Stats Summary */}
          <Card>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {typeof stats.total_hours === 'string'
                    ? parseFloat(stats.total_hours).toFixed(2)
                    : stats.total_hours.toFixed(2)}
                </div>
                <div className="text-sm text-base-content/70 flex items-center justify-center gap-1 mt-1">
                  <Clock className="w-4 h-4" />
                  Horas Totales
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-success">
                  {stats.unique_employees}
                </div>
                <div className="text-sm text-base-content/70 flex items-center justify-center gap-1 mt-1">
                  <Users className="w-4 h-4" />
                  Empleados
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-secondary">
                  {typeof stats.avg_hours_per_employee === 'string'
                    ? parseFloat(stats.avg_hours_per_employee).toFixed(2)
                    : stats.avg_hours_per_employee.toFixed(2)}
                </div>
                <div className="text-sm text-base-content/70">Promedio/Empleado</div>
              </div>
            </div>
          </Card>

          {/* Chart */}
          {chartData.length > 0 && (
            <Card>
              <div className="p-4">
                <h4 className="font-semibold text-base-content mb-4">Desglose de Horas</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-base-content/10" />
                    <XAxis dataKey="name" tick={{ fill: "currentColor" }} className="text-base-content/70" />
                    <YAxis tick={{ fill: "currentColor" }} className="text-base-content/70" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--b1))",
                        border: "1px solid hsl(var(--bc) / 0.2)",
                        borderRadius: "0.5rem",
                        color: "hsl(var(--bc))",
                      }}
                    />
                    <Bar dataKey="Horas Totales" fill="#3b82f6" />
                    <Bar dataKey="Promedio por Empleado" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <div className="p-4 text-center text-base-content/60">
            No hay datos disponibles
          </div>
        </Card>
      )}
    </div>
  );
};
