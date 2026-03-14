/**
 * EmployeeStatisticsCard - Displays monthly work statistics for an employee
 * Shows total hours, days worked, average, and breakdown by shift type
 */

import React, { useEffect, useState } from "react";
import Card from "../ui/Card";
import Alert from "../ui/Alert";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Calendar, Clock } from "lucide-react";
import { getEmployeeStatistics } from "../../services/statisticsService";
import type { EmployeeStatistics } from "../../types/timeTracking";

interface EmployeeStatisticsCardProps {
  employeeId: string;
  employeeName?: string;
  onDateChange?: (year: number, month: number) => void;
}

const SHIFT_TYPE_COLORS: Record<string, string> = {
  "Mañana": "#3b82f6",    // blue
  "Noche": "#1f2937",     // dark gray
  "Cortado": "#f59e0b",   // amber
  "Corrido": "#10b981",   // emerald
};

// UUID v4 validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUUID = (uuid: string): boolean => UUID_REGEX.test(uuid);

export const EmployeeStatisticsCard: React.FC<EmployeeStatisticsCardProps> = ({
  employeeId,
  employeeName = "Employee",
  onDateChange,
}) => {
  const [stats, setStats] = useState<EmployeeStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getEmployeeStatistics(employeeId, year, month);
        setStats(data);
        onDateChange?.(year, month);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load statistics");
      } finally {
        setLoading(false);
      }
    };

    if (employeeId && isValidUUID(employeeId)) {
      fetchStats();
    } else if (employeeId && !isValidUUID(employeeId)) {
      setError("Invalid employee ID format. Please enter a valid UUID.");
      setStats(null);
    }
  }, [employeeId, year, month, onDateChange]);

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
      {/* Month Navigator */}
      <Card className="bg-white">
        <div className="flex items-center justify-between p-4">
          <h3 className="font-semibold text-gray-900">
            {employeeName} - Statistics
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
    </div>
  );
};
