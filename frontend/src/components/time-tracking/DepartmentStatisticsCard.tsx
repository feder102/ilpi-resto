/**
 * DepartmentStatisticsCard - Displays monthly work statistics aggregated by department
 * Shows total hours, employee count, and average hours per employee
 */

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Alert, AlertDescription } from "../ui/alert";
import { Users, Clock, AlertCircle, TrendingUp } from "lucide-react";
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
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch statistics"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [year, month, department]);

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

  const getDepartmentLabel = () => {
    if (!department || department === "all") {
      return "All Departments";
    }
    return department;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">
              {getDepartmentLabel()}
            </CardTitle>
            <p className="text-sm text-gray-500">Department Statistics</p>
          </div>
          <TrendingUp className="h-6 w-6 text-gray-400" />
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
            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total Hours */}
              <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-700 font-medium">Total Hours</p>
                    <p className="text-3xl font-bold text-blue-700 mt-1">
                      {stats.total_hours.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">hours</p>
                  </div>
                  <Clock className="h-10 w-10 text-blue-300" />
                </div>
              </div>

              {/* Employee Count */}
              <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-700 font-medium">Employees</p>
                    <p className="text-3xl font-bold text-emerald-700 mt-1">
                      {stats.unique_employees}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">active</p>
                  </div>
                  <Users className="h-10 w-10 text-emerald-300" />
                </div>
              </div>

              {/* Average Hours per Employee */}
              <div className="rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 p-4 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-700 font-medium">
                      Avg per Employee
                    </p>
                    <p className="text-3xl font-bold text-purple-700 mt-1">
                      {stats.avg_hours_per_employee.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">hours</p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-purple-300" />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Summary
              </p>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <p>
                  The department logged a total of{" "}
                  <span className="font-bold text-blue-700">
                    {stats.total_hours.toFixed(1)} hours
                  </span>{" "}
                  across{" "}
                  <span className="font-bold text-emerald-700">
                    {stats.unique_employees} employees
                  </span>
                  , averaging{" "}
                  <span className="font-bold text-purple-700">
                    {stats.avg_hours_per_employee.toFixed(1)} hours
                  </span>{" "}
                  per employee for {new Date(year, month - 1).toLocaleDateString("es-ES", {
                    month: "long",
                    year: "numeric",
                  })}.
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
