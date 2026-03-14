/**
 * TimeEntriesTable - Displays paginated table of time entry records
 * Allows filtering by employee, department, date range, and source (shift/manual)
 */

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Alert, AlertDescription } from "../ui/alert";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { getTimeEntries } from "../../services/statisticsService";
import { TimeEntry, TimeEntryListResponse, TimeEntryFilterRequest } from "../../types/timeTracking";

interface TimeEntriesTableProps {
  filters: Omit<TimeEntryFilterRequest, "limit" | "offset">;
  pageSize?: number;
}

export const TimeEntriesTable: React.FC<TimeEntriesTableProps> = ({
  filters,
  pageSize = 20,
}) => {
  const [data, setData] = useState<TimeEntryListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      setError(null);
      try {
        const offset = (currentPage - 1) * pageSize;
        const response = await getTimeEntries({
          ...filters,
          limit: pageSize,
          offset,
        });
        setData(response);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch time entries"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [filters, currentPage, pageSize]);

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const formatTime = (timeStr: string): string => {
    if (!timeStr) return "-";
    // Handle HH:MM format
    return timeStr.substring(0, 5);
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("es-ES", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getSourceBadge = (source: string) => {
    if (source === "shift") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Shift
        </span>
      );
    } else if (source === "manual") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          Manual
        </span>
      );
    }
    return <span className="text-gray-500">-</span>;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Time Entries</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
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

        {data && !loading && (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Time</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Hours</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Shift Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items && data.items.length > 0 ? (
                    data.items.map((entry: TimeEntry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-gray-200 hover:bg-gray-50 transition"
                      >
                        <td className="px-4 py-3 text-gray-800 font-medium">
                          {formatDate(entry.shift_date)}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-800">
                          {Number(entry.hours_worked).toFixed(1)}h
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {entry.shift_type_id || "-"}
                        </td>
                        <td className="px-4 py-3">
                          {getSourceBadge(entry.source || "shift")}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-gray-500 font-medium"
                      >
                        No time entries found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Info */}
            <div className="flex items-center justify-between text-xs text-gray-600 px-2">
              <span>
                Showing {data.items.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
                {Math.min(currentPage * pageSize, data.total)} of {data.total} entries
              </span>
              <span className="font-medium">
                Page {currentPage} of {totalPages}
              </span>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 text-sm font-medium rounded transition ${
                        currentPage === page
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
