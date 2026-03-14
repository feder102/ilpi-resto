/**
 * AdminStatistics - Admin dashboard for automatic time tracking statistics
 * Displays employee and department statistics, and allows manual batch processing
 * Accessible only by Admin and Moderador roles
 */

import React, { useState } from "react";
import { Alert, AlertDescription } from "../components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { EmployeeStatisticsCard } from "../components/time-tracking/EmployeeStatisticsCard";
import { DepartmentStatisticsCard } from "../components/time-tracking/DepartmentStatisticsCard";
import { TimeEntriesTable } from "../components/time-tracking/TimeEntriesTable";
import { triggerBatchProcess } from "../services/statisticsService";

interface AdminUser {
  id: string;
  role: "Admin" | "Moderador";
  tenant_id: string;
}

interface AdminStatisticsProps {
  currentUser?: AdminUser;
}

export const AdminStatistics: React.FC<AdminStatisticsProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<"employee" | "department" | "entries" | "batch">(
    "employee"
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split("T")[0]);

  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);

  const handleBatchProcess = async () => {
    setBatchProcessing(true);
    setBatchMessage(null);
    setBatchError(null);

    try {
      const result = await triggerBatchProcess(batchDate);
      setBatchMessage(
        `✓ Batch processing completed successfully. Created ${result.estimated_entries} time entries.`
      );
    } catch (error) {
      setBatchError(
        error instanceof Error
          ? error.message
          : "Failed to trigger batch process. Please try again."
      );
    } finally {
      setBatchProcessing(false);
    }
  };

  // Check authorization
  if (!currentUser || !["Admin", "Moderador"].includes(currentUser.role)) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-700">
          You do not have permission to access this page. Admin or Moderador role required.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Time Tracking Statistics</h1>
        <p className="text-gray-600 mt-2">
          Monitor automatic work hour tracking, employee statistics, and department performance
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          {[
            { id: "employee", label: "Employee Stats", icon: "👤" },
            { id: "department", label: "Department Stats", icon: "🏢" },
            { id: "entries", label: "Time Entries", icon: "📋" },
            { id: "batch", label: "Batch Process", icon: "⚙️" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-3 font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-700 hover:text-gray-900"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Areas */}

      {/* Employee Statistics Tab */}
      {activeTab === "employee" && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee ID
            </label>
            <input
              type="text"
              placeholder="Enter employee UUID..."
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Paste the employee UUID to view their monthly statistics
            </p>
          </div>

          {selectedEmployeeId && (
            <EmployeeStatisticsCard
              employeeId={selectedEmployeeId}
              employeeName="Employee"
              onDateChange={(year, month) => {
                setFilterYear(year);
                setFilterMonth(month);
              }}
            />
          )}
        </div>
      )}

      {/* Department Statistics Tab */}
      {activeTab === "department" && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Department (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Cocina, Atención al Público..."
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to see all departments
            </p>
          </div>

          <DepartmentStatisticsCard
            department={selectedDepartment || undefined}
            onDateChange={(year, month) => {
              setFilterYear(year);
              setFilterMonth(month);
            }}
          />
        </div>
      )}

      {/* Time Entries Tab */}
      {activeTab === "entries" && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                defaultValue={new Date(filterYear, filterMonth - 1, 1)
                  .toISOString()
                  .split("T")[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee ID (Optional)
              </label>
              <input
                type="text"
                placeholder="UUID..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department (Optional)
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="">All</option>
                <option value="Cocina">Cocina</option>
                <option value="Atención al Público">Atención al Público</option>
                <option value="Barra">Barra</option>
                <option value="Dirección">Dirección</option>
              </select>
            </div>
          </div>

          <TimeEntriesTable
            filters={{
              start_date: new Date(filterYear, filterMonth - 1, 1)
                .toISOString()
                .split("T")[0],
              end_date: new Date().toISOString().split("T")[0],
            }}
            pageSize={20}
          />
        </div>
      )}

      {/* Batch Process Tab */}
      {activeTab === "batch" && currentUser?.role === "Admin" && (
        <div className="space-y-4">
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700">
              Manually trigger automatic time entry generation for a specific date. Normally runs
              daily at 1:00 AM.
            </AlertDescription>
          </Alert>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Process Date
                </label>
                <input
                  type="date"
                  value={batchDate}
                  onChange={(e) => setBatchDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Select the date to generate time entries for (usually yesterday)
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleBatchProcess}
                  disabled={batchProcessing}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <RefreshCw className="h-4 w-4" />
                  {batchProcessing ? "Processing..." : "Process Now"}
                </button>
              </div>

              {batchMessage && (
                <Alert className="bg-green-50 border-green-200">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">{batchMessage}</AlertDescription>
                </Alert>
              )}

              {batchError && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">{batchError}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "batch" && currentUser?.role !== "Admin" && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            Only Admin users can trigger batch processing. Your role: {currentUser.role}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default AdminStatistics;
