/**
 * EmployeeStatisticsCard - Displays monthly work statistics for an employee
 * Shows total hours, days worked, average, and breakdown by shift type
 */

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Alert, AlertDescription } from "../ui/alert";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import { getEmployeeStatistics } from "../../services/statisticsService";
import { EmployeeStatistics } from "../../types/timeTracking";

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
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch statistics"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [employeeId, year, month]);

  const handleMonthChange = (newMonth: number) => {
    let newYear = year;
    if (newMonth > 12) {
      newYear = year + 1;
      newMonth = 1;
    } else if (newMonth < 1) {
      newYear = year - 1;
      newMonth = 12;
    }
    setYear(newYear);
    setMonth(newMonth);
    if (onDateChange) {
      onDateChange(newYear, newMonth);
    }
  };

  const pieData =
    stats && stats.breakdown_by_shift_type
      ? Object.entries(stats.breakdown_by_shift_type).map(([shiftTypeId, hours]) => ({
          name: shiftTypeId,
          value: Number(hours.toFixed(2)),
        }))
      : [];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">{employeeName}</CardTitle>
            <p className="text-sm text-gray-500">Work Statistics</p>
          </div>
          <Calendar className="h-6 w-6 text-gray-400" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Month/Year Picker */}
        <div className="flex items-center justify-between rounded-lg bg-gray-100 p-3">
          <button
            onClick={() => handleMonthChange(month - 1)}
            className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded"
          >
            ←
          </button>
          <span className="text-sm font-semibold">
            {new Date(year, month - 1).toLocaleDateString("es-ES", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            onClick={() => handleMonthChange(month + 1)}
            className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded"
          >
            →
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center h-40 bg-gray-50 rounded">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {stats && !loading && (
          <>
            {/* Main Statistics Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Total Hours - Large Display */}
              <div className="col-span-2 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700 font-medium">Total Hours</p>
                    <p className="text-4xl font-bold text-blue-700">
                      {stats.total_hours.toFixed(1)}
                      <span className="text-lg ml-1">h</span>
                    </p>
                  </div>
                  <Clock className="h-12 w-12 text-blue-300" />
                </div>
              </div>

              {/* Days Worked */}
              <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
                <p className="text-xs text-gray-600 font-medium">Days Worked</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">
                  {stats.days_worked}
                </p>
                <p className="text-xs text-gray-500 mt-1">days</p>
              </div>

              {/* Average Hours per Day */}
              <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
                <p className="text-xs text-gray-600 font-medium">Average/Day</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">
                  {stats.avg_hours_per_day.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500 mt-1">hours</p>
              </div>
            </div>

            {/* Breakdown by Shift Type */}
            {pieData.length > 0 && (
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-800 mb-3">Shift Type Breakdown</p>
                <div className="flex items-center justify-between">
                  <div className="flex-1 h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          dataKey="value"
                          startAngle={90}
                          endAngle={450}
                        >
                          {pieData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={SHIFT_TYPE_COLORS[entry.name] || "#6b7280"}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="ml-4 space-y-2">
                    {pieData.map((entry) => (
                      <div key={entry.name} className="flex items-center text-xs">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{
                            backgroundColor: SHIFT_TYPE_COLORS[entry.name] || "#6b7280",
                          }}
                        ></div>
                        <span className="font-medium text-gray-700">{entry.name}</span>
                        <span className="ml-2 text-gray-500">{entry.value}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
