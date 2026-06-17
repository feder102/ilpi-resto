/**
 * EmployeeStatisticsCard - Displays monthly work statistics for an employee
 * Shows total hours, days worked, average, and breakdown by shift type
 * Includes search by name or DNI
 */

import React, { useEffect, useState } from "react";
import Card from "../ui/Card";
import Alert from "../ui/Alert";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Calendar, Clock, Search, X } from "lucide-react";
import { getEmployeeStatistics } from "../../services/statisticsService";
import { getEmployees } from "../../services/employeeService";
import type { EmployeeStatistics } from "../../types/timeTracking";
import type { Employee } from "../../types/models";

interface EmployeeStatisticsCardProps {
  employeeId?: string;
  employeeName?: string;
  onDateChange?: (year: number, month: number) => void;
}

const SHIFT_TYPE_COLORS: Record<string, string> = {
  "Mañana": "#3b82f6",    // blue
  "Noche": "#1f2937",     // dark gray
  "Cortado": "#f59e0b",   // amber
  "Corrido": "#10b981",   // emerald
};

export const EmployeeStatisticsCard: React.FC<EmployeeStatisticsCardProps> = ({
  onDateChange,
}) => {
  // Search and selection state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Statistics state
  const [stats, setStats] = useState<EmployeeStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  // Search employees by name or DNI
  useEffect(() => {
    const searchTimer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        const fetchEmployees = async () => {
          setSearching(true);
          try {
            const result = await getEmployees({ search: searchQuery, size: 10 });
            setSearchResults(result.items);
            setShowDropdown(true);
          } catch (err) {
            console.error("Search error:", err);
          } finally {
            setSearching(false);
          }
        };
        fetchEmployees();
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [searchQuery]);

  // Fetch statistics for selected employee
  useEffect(() => {
    const statsTimer = setTimeout(() => {
      const fetchStats = async () => {
        if (!selectedEmployee) return;
        setLoading(true);
        setError(null);
        try {
          const data = await getEmployeeStatistics(selectedEmployee.id, year, month);
          setStats(data);
          onDateChange?.(year, month);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error al cargar estadísticas");
        } finally {
          setLoading(false);
        }
      };

      if (selectedEmployee) {
        fetchStats();
      }
    }, 300);

    return () => clearTimeout(statsTimer);
  }, [selectedEmployee, year, month, onDateChange]);

  const handleSelectEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setSearchQuery("");
    setShowDropdown(false);
    setSearchResults([]);
  };

  const handleClearSelection = () => {
    setSelectedEmployee(null);
    setSearchQuery("");
    setStats(null);
    setError(null);
  };

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

  const chartData = stats?.breakdown_by_shift_type
    ? Object.entries(stats.breakdown_by_shift_type).map(([shiftId, hours]) => ({
        name: shiftId,
        value: typeof hours === 'string' ? parseFloat(hours) : hours,
        color: Object.values(SHIFT_TYPE_COLORS)[Object.keys(stats.breakdown_by_shift_type).indexOf(shiftId)] || "#8b5cf6",
      }))
    : [];

  return (
    <div className="space-y-4">
      {/* Employee Search */}
      <Card>
        <div className="p-4">
          <label className="block text-sm font-medium text-base-content mb-2">
            Buscar Empleado por Nombre o DNI
          </label>
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40 z-10" />
                <input
                  type="text"
                  placeholder="Ingresa nombre o DNI..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input input-bordered w-full pl-10"
                />
                {searching && <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content/50 text-sm">Buscando...</span>}
              </div>
              {selectedEmployee && (
                <button
                  onClick={handleClearSelection}
                  className="p-2 text-base-content/40 hover:text-base-content"
                  title="Limpiar selección"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown Results */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => handleSelectEmployee(emp)}
                    className="w-full px-4 py-2 text-left hover:bg-base-200 border-b border-base-300 last:border-b-0 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-base-content">
                        {emp.first_name} {emp.last_name}
                      </div>
                      <div className="text-xs text-base-content/60">
                        DNI: {emp.dni} • {emp.department}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showDropdown && searchResults.length === 0 && searchQuery.length >= 2 && (
              <div className="absolute z-10 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg p-4 text-center text-sm text-base-content/60">
                No se encontraron empleados
              </div>
            )}
          </div>

          {selectedEmployee && (
            <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/30">
              <div className="text-sm">
                <span className="font-medium text-base-content">
                  Seleccionado: {selectedEmployee.first_name} {selectedEmployee.last_name}
                </span>
                <span className="text-base-content/60 ml-2">
                  ({selectedEmployee.dni})
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {selectedEmployee && (
      <>
      {/* Month Navigator */}
      <Card>
        <div className="flex items-center justify-between p-4">
          <h3 className="font-semibold text-base-content">
            {selectedEmployee.first_name} {selectedEmployee.last_name} - Estadísticas
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
            <div className="p-4 grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {typeof stats.total_hours === 'string'
                    ? parseFloat(stats.total_hours)
                    : stats.total_hours}
                </div>
                <div className="text-sm text-base-content/70 flex items-center justify-center gap-1 mt-1">
                  <Clock className="w-4 h-4" />
                  Horas Totales
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-warning">
                  {typeof stats.extra_hours === 'string'
                    ? parseFloat(stats.extra_hours)
                    : (stats.extra_hours ?? 0)}
                </div>
                <div className="text-sm text-base-content/70 flex items-center justify-center gap-1 mt-1">
                  <Clock className="w-4 h-4" />
                  Horas Extra
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-success">
                  {stats.days_worked}
                </div>
                <div className="text-sm text-base-content/70 flex items-center justify-center gap-1 mt-1">
                  <Calendar className="w-4 h-4" />
                  Días Trabajados
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-secondary">
                  {typeof stats.avg_hours_per_day === 'string'
                    ? parseFloat(stats.avg_hours_per_day).toFixed(2)
                    : stats.avg_hours_per_day.toFixed(2)}
                </div>
                <div className="text-sm text-base-content/70">Promedio/Día</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-error">
                  {stats.total_absences ?? 0}
                </div>
                <div className="text-sm text-base-content/70 mt-1">Ausencias</div>
                {(stats.total_absences ?? 0) > 0 && (
                  <div className="text-xs text-base-content/50 mt-1">
                    {stats.justified_absences ?? 0}J / {stats.unjustified_absences ?? 0}I
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-sm text-base-content/50">
                  {stats.period}
                </div>
                <div className="text-sm text-base-content/70 mt-2">Período</div>
              </div>
            </div>
          </Card>

          {/* Chart */}
          {chartData.length > 0 && (
            <Card>
              <div className="p-4">
                <h4 className="font-semibold text-base-content mb-4">Desglose por Tipo de Turno</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ value }) => `${value.toFixed(1)}h`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
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
      </>
      )}
      {!selectedEmployee && (
        <Card>
          <div className="p-4 text-center text-base-content/60">
            Busca y selecciona un empleado para ver sus estadísticas
          </div>
        </Card>
      )}
    </div>
  );
};
