/**
 * TimeEntriesTable - Displays paginated time entries with filtering
 * Shows date, employee, hours worked, shift type, and source
 */

import React, { useEffect, useState, useMemo } from "react";
import Card from "../ui/Card";
import Alert from "../ui/Alert";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTimeEntries } from "../../services/statisticsService";
import type { TimeEntry, TimeEntryListResponse } from "../../types/timeTracking";
import { TimeEntrySourceEnum } from "../../types/timeTracking";

const sourceLabel = (source: string): string => {
  if (source === "extra") return "Extra";
  if (source === "manual") return "Manual";
  return "Turno";
};

interface TimeEntriesTableProps {
  filters?: {
    start_date?: string;
    end_date?: string;
    employee_id?: string;
    department?: string;
    source?: "shift" | "manual" | "extra";
  };
  pageSize?: number;
}

export const TimeEntriesTable: React.FC<TimeEntriesTableProps> = ({
  filters = {},
  pageSize = 20,
}) => {
  const [entries, setEntries] = useState<TimeEntryListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const today = new Date().toISOString().split("T")[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const finalFilters = useMemo(() => ({
    start_date: filters.start_date || monthAgo,
    end_date: filters.end_date || today,
    employee_id: filters.employee_id,
    department: filters.department,
    source: (filters.source as typeof TimeEntrySourceEnum[keyof typeof TimeEntrySourceEnum]) || TimeEntrySourceEnum.SHIFT,
  }), [filters.start_date, filters.end_date, filters.employee_id, filters.department, filters.source, monthAgo, today]);

  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      setError(null);
      try {
        const offset = (currentPage - 1) * pageSize;
        const data = await getTimeEntries({
          ...finalFilters,
          limit: pageSize,
          offset,
        });
        setEntries(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar registros");
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [finalFilters, currentPage, pageSize]);

  const totalPages = entries ? Math.ceil(entries.total / pageSize) : 1;

  return (
    <div className="space-y-4">
      {/* Filters Summary */}
      <Card className="bg-white">
        <div className="p-4 text-sm text-gray-600">
          <span className="font-medium">Filtros:</span> {finalFilters.start_date} a{" "}
          {finalFilters.end_date}
          {finalFilters.employee_id && ` | Empleado: ${finalFilters.employee_id}`}
          {finalFilters.department && ` | Departamento: ${finalFilters.department}`}
          {finalFilters.source && ` | Origen: ${sourceLabel(finalFilters.source)}`}
        </div>
      </Card>

      {/* Table */}
      {loading ? (
        <Card className="bg-white">
          <div className="p-4 text-center text-gray-500">Cargando...</div>
        </Card>
      ) : error ? (
        <Alert variant="error" message={error} />
      ) : entries && entries.items.length > 0 ? (
        <>
          <Card className="bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">
                      Empleado
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">
                      DNI
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">
                      Hora Inicio
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">
                      Hora Fin
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-900">
                      Horas
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">
                      Origen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {entries.items.map((entry: TimeEntry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{entry.shift_date}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {entry.employee_name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {entry.employee_dni}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{entry.start_time ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{entry.end_time ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {typeof entry.hours_worked === 'string'
                          ? parseFloat(entry.hours_worked).toFixed(2)
                          : entry.hours_worked.toFixed(2)}
                        h
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            entry.source === "extra"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                          title={entry.note ?? undefined}
                        >
                          {sourceLabel(entry.source)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          <Card className="bg-white">
            <div className="p-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando {(currentPage - 1) * pageSize + 1} a{" "}
                {Math.min(currentPage * pageSize, entries.total)} de {entries.total}{" "}
                registros
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 px-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded text-sm ${
                        page === currentPage
                          ? "bg-blue-600 text-white"
                          : "border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <Card className="bg-white">
          <div className="p-4 text-center text-gray-500">
            No hay registros de tiempo para los filtros seleccionados
          </div>
        </Card>
      )}
    </div>
  );
};
