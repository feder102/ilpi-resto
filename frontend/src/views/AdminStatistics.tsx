/**
 * AdminStatistics - Professional Time Tracking Analytics Dashboard
 * Features: Employee stats, department analytics, time entries, batch processing
 * Accessible to Admin and Moderador roles only
 */

import React, { useState, useMemo } from "react";
import { Card, Button } from "../components/ui";
import Alert from "../components/ui/Alert";
import { BarChart3, Users, Clock, RefreshCw, ChevronDown } from "lucide-react";
import { EmployeeStatisticsCard } from "../components/time-tracking/EmployeeStatisticsCard";
import { DepartmentStatisticsCard } from "../components/time-tracking/DepartmentStatisticsCard";
import { TimeEntriesTable } from "../components/time-tracking/TimeEntriesTable";
import { triggerBatchProcess } from "../services/statisticsService";
import { useAuth } from "../hooks/useAuth";

interface AdminUser {
  id: string;
  role: "Admin" | "Moderador";
  tenant_id: string;
}

interface TabConfig {
  id: "employee" | "department" | "entries" | "batch";
  label: string;
  icon: React.ReactNode;
  description: string;
}

const TABS: TabConfig[] = [
  {
    id: "employee",
    label: "Employee Stats",
    icon: <Users className="w-4 h-4" />,
    description: "View individual employee work statistics",
  },
  {
    id: "department",
    label: "Department Stats",
    icon: <BarChart3 className="w-4 h-4" />,
    description: "Department-wide performance analytics",
  },
  {
    id: "entries",
    label: "Time Entries",
    icon: <Clock className="w-4 h-4" />,
    description: "Detailed time entry records and logs",
  },
  {
    id: "batch",
    label: "Batch Process",
    icon: <RefreshCw className="w-4 h-4" />,
    description: "Manual time entry generation (Admin only)",
  },
];

export const AdminStatistics: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"employee" | "department" | "entries" | "batch">("employee");
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);

  const currentUser = useMemo<AdminUser | null>(() => {
    if (!user) return null;
    return {
      id: user.id,
      role: user.role as "Admin" | "Moderador",
      tenant_id: user.tenant_id,
    };
  }, [user]);

  const isAuthorized = currentUser && ["Admin", "Moderador"].includes(currentUser.role);
  const isAdmin = currentUser?.role === "Admin";

  const timeEntriesFilters = useMemo(() => ({
    start_date: new Date(filterYear, filterMonth - 1, 1)
      .toISOString()
      .split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
  }), [filterYear, filterMonth]);

  const handleBatchProcess = async () => {
    setBatchProcessing(true);
    setBatchMessage(null);
    setBatchError(null);

    try {
      const result = await triggerBatchProcess(batchDate);
      setBatchMessage(
        `✓ Successfully processed ${result.estimated_entries} time entries for ${batchDate}`
      );
    } catch (error) {
      setBatchError(
        error instanceof Error ? error.message : "Failed to trigger batch process"
      );
    } finally {
      setBatchProcessing(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Alert
          variant="error"
          title="Access Denied"
          message="You don't have permission to access this page. Admin or Moderador role required."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-slate-900">Time Tracking Analytics</h1>
        <p className="text-slate-600">
          Monitor work hours, employee productivity, and automatic time entry generation
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
              title={tab.description}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {/* Employee Statistics Tab */}
        {activeTab === "employee" && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Employee Statistics</h2>
                <p className="text-sm text-slate-600">
                  Search for an employee to view their monthly work statistics
                </p>
              </div>
            </Card>
            <EmployeeStatisticsCard
              onDateChange={(year, month) => {
                setFilterYear(year);
                setFilterMonth(month);
              }}
            />
          </div>
        )}

        {/* Department Statistics Tab */}
        {activeTab === "department" && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-violet-50 to-slate-50 border border-violet-100">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Department Analytics
                </h2>
                <p className="text-sm text-slate-600">
                  View aggregated statistics by department
                </p>
              </div>
            </Card>
            <DepartmentStatisticsCard
              onDateChange={(year, month) => {
                setFilterYear(year);
                setFilterMonth(month);
              }}
            />
          </div>
        )}

        {/* Time Entries Tab */}
        {activeTab === "entries" && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-100">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Time Entry Records</h2>
                <p className="text-sm text-slate-600">
                  Browse and filter all time entries by date, employee, or department
                </p>
              </div>
            </Card>

            {/* Filters Card */}
            <Card>
              <div className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <ChevronDown className="w-4 h-4" />
                  Filters
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      defaultValue={new Date(filterYear, filterMonth - 1, 1)
                        .toISOString()
                        .split("T")[0]}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      defaultValue={new Date().toISOString().split("T")[0]}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Employee (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Name or DNI..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Department
                    </label>
                    <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">All Departments</option>
                      <option value="Cocina">Cocina</option>
                      <option value="Atención al Público">Atención al Público</option>
                      <option value="Barra">Barra</option>
                      <option value="Dirección">Dirección</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>

            {/* Time Entries Table */}
            <TimeEntriesTable
              filters={timeEntriesFilters}
              pageSize={20}
            />
          </div>
        )}

        {/* Batch Process Tab */}
        {activeTab === "batch" && (
          <div className="space-y-6">
            {!isAdmin && (
              <Alert
                variant="warning"
                title="Admin Only"
                message="Batch processing is restricted to Admin users. Your role: Moderador"
              />
            )}

            {isAdmin && (
              <>
                <Card className="bg-gradient-to-br from-amber-50 to-slate-50 border border-amber-100">
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">
                      Batch Processing
                    </h2>
                    <p className="text-sm text-slate-600">
                      Manually trigger automatic time entry generation for a specific date
                    </p>
                  </div>
                </Card>

                <Card>
                  <div className="p-6 space-y-6">
                    {/* Info Alert */}
                    <Alert
                      variant="info"
                      message="Time entries are normally generated daily at 1:00 AM. Use this to manually regenerate entries for a specific date."
                    />

                    {/* Date Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        Process Date
                      </label>
                      <input
                        type="date"
                        value={batchDate}
                        onChange={(e) => setBatchDate(e.target.value)}
                        className="w-full md:w-64 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        Typically set to yesterday's date for completed shifts
                      </p>
                    </div>

                    {/* Action Button */}
                    <div className="flex gap-3">
                      <Button
                        onClick={handleBatchProcess}
                        disabled={batchProcessing}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className={`w-4 h-4 ${batchProcessing ? "animate-spin" : ""}`} />
                        {batchProcessing ? "Processing..." : "Generate Entries"}
                      </Button>
                    </div>

                    {/* Result Messages */}
                    {batchMessage && (
                      <Alert variant="success" message={batchMessage} />
                    )}

                    {batchError && (
                      <Alert variant="error" message={batchError} />
                    )}
                  </div>
                </Card>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-6 border-t border-slate-200 text-sm text-slate-500">
        <p>
          Last updated: {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
};

export default AdminStatistics;
