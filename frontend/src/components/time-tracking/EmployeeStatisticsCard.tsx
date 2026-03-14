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
          setError(err instanceof Error ? err.message : "Failed to load statistics");
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
      <Card className="bg-white">
        <div className="p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Employee by Name or DNI
          </label>
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter name or DNI..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searching && <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">Searching...</span>}
              </div>
              {selectedEmployee && (
                <button
                  onClick={handleClearSelection}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Clear selection"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown Results */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => handleSelectEmployee(emp)}
                    className="w-full px-4 py-2 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {emp.first_name} {emp.last_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        DNI: {emp.dni} • {emp.department}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showDropdown && searchResults.length === 0 && searchQuery.length >= 2 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-sm text-gray-500">
                No employees found
              </div>
            )}
          </div>

          {selectedEmployee && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm">
                <span className="font-medium text-gray-900">
                  Selected: {selectedEmployee.first_name} {selectedEmployee.last_name}
                </span>
                <span className="text-gray-600 ml-2">
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
      <Card className="bg-white">
        <div className="flex items-center justify-between p-4">
          <h3 className="font-semibold text-gray-900">
            {selectedEmployee.first_name} {selectedEmployee.last_name} - Statistics
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              ← Prev
            </button>
            <span className="text-sm font-medium text-gray-600 min-w-[100px] text-center">
              {year}-{String(month).padStart(2, "0")}
            </span>
            <button
              onClick={handleNextMonth}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              Next →
            </button>
          </div>
        </div>
      </Card>

      {/* Stats Display */}
      {loading ? (
        <Card className="bg-white">
          <div className="p-4 text-center text-gray-500">Loading...</div>
        </Card>
      ) : error ? (
        <Alert variant="error" message={error} />
      ) : stats ? (
        <>
          {/* Stats Summary */}
          <Card className="bg-white">
            <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {typeof stats.total_hours === 'string'
                    ? parseFloat(stats.total_hours)
                    : stats.total_hours}
                </div>
                <div className="text-sm text-gray-600 flex items-center justify-center gap-1 mt-1">
                  <Clock className="w-4 h-4" />
                  Total Hours
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {stats.days_worked}
                </div>
                <div className="text-sm text-gray-600 flex items-center justify-center gap-1 mt-1">
                  <Calendar className="w-4 h-4" />
                  Days Worked
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {typeof stats.avg_hours_per_day === 'string'
                    ? parseFloat(stats.avg_hours_per_day).toFixed(2)
                    : stats.avg_hours_per_day.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Avg/Day</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">
                  {stats.period}
                </div>
                <div className="text-sm text-gray-600 mt-2">Period</div>
              </div>
            </div>
          </Card>

          {/* Chart */}
          {chartData.length > 0 && (
            <Card className="bg-white">
              <div className="p-4">
                <h4 className="font-semibold text-gray-900 mb-4">Breakdown by Shift Type</h4>
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
        <Card className="bg-white">
          <div className="p-4 text-center text-gray-500">
            No data available
          </div>
        </Card>
      )}
      </>
      )}
      {!selectedEmployee && (
        <Card className="bg-white">
          <div className="p-4 text-center text-gray-500">
            Search and select an employee to view their statistics
          </div>
        </Card>
      )}
    </div>
  );
};
