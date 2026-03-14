/**
 * DepartmentStatisticsCard - Displays department-level work statistics
 * Shows total hours, employee count, and average hours per employee
 */

import React, { useEffect, useState } from "react";
import Card from "../ui/Card";
import Alert from "../ui/Alert";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, Clock, AlertCircle } from "lucide-react";
import { getDepartmentStatistics } from "../../services/statisticsService";
import { DepartmentStatistics } from "../../types/timeTracking";

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
        setError(err instanceof Error ? err.message : "Failed to load statistics");
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
          "Total Hours": typeof stats.total_hours === 'string'
            ? parseFloat(stats.total_hours)
            : stats.total_hours,
          "Avg per Employee": typeof stats.avg_hours_per_employee === 'string'
            ? parseFloat(stats.avg_hours_per_employee)
            : stats.avg_hours_per_employee,
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      {/* Month Navigator */}
      <Card className="bg-white">
        <div className="flex items-center justify-between p-4">
          <h3 className="font-semibold text-gray-900">
            {department ? `${department} ` : ""}Department Statistics
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
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {typeof stats.total_hours === 'string'
                    ? parseFloat(stats.total_hours).toFixed(2)
                    : stats.total_hours.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 flex items-center justify-center gap-1 mt-1">
                  <Clock className="w-4 h-4" />
                  Total Hours
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {stats.unique_employees}
                </div>
                <div className="text-sm text-gray-600 flex items-center justify-center gap-1 mt-1">
                  <Users className="w-4 h-4" />
                  Employees
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {typeof stats.avg_hours_per_employee === 'string'
                    ? parseFloat(stats.avg_hours_per_employee).toFixed(2)
                    : stats.avg_hours_per_employee.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Avg/Employee</div>
              </div>
            </div>
          </Card>

          {/* Chart */}
          {chartData.length > 0 && (
            <Card className="bg-white">
              <div className="p-4">
                <h4 className="font-semibold text-gray-900 mb-4">Hours Breakdown</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="Total Hours" fill="#3b82f6" />
                    <Bar dataKey="Avg per Employee" fill="#10b981" />
                  </BarChart>
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
