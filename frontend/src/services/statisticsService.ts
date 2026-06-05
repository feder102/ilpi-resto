/**
 * API client for Feature 008: Automatic Time Tracking statistics
 * Fetches employee and department work statistics, time entries, and triggers batch processing
 */

import apiClient from "./apiClient";
import type {
  EmployeeStatistics,
  DepartmentStatistics,
  TimeEntryListResponse,
  BatchProcessResponse,
  TimeEntryFilterRequest,
  TimeEntry,
  ExtraHoursCreate,
} from "../types/timeTracking";

/**
 * Register extra (overtime) hours for an employee (Admin/Moderador only)
 */
export async function createExtraHours(
  body: ExtraHoursCreate
): Promise<TimeEntry> {
  try {
    const response = await apiClient.post(
      `/employee/time-tracking/extra-hours`,
      body
    );
    return response.data;
  } catch (error) {
    throw new Error(
      `Error al cargar horas extra: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get monthly work statistics for a specific employee
 */
export async function getEmployeeStatistics(
  employeeId: string,
  year: number,
  month: number,
  includeManual: boolean = false
): Promise<EmployeeStatistics> {
  try {
    const response = await apiClient.get(
      `/employee/time-tracking/statistics/employee/${employeeId}`,
      {
        params: {
          year,
          month,
          include_manual: includeManual,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      `Error al obtener estadísticas del empleado: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get monthly work statistics aggregated by department
 */
export async function getDepartmentStatistics(
  year: number,
  month: number,
  department?: string,
  includeManual: boolean = false
): Promise<DepartmentStatistics> {
  try {
    const response = await apiClient.get(
      `/employee/time-tracking/statistics/department`,
      {
        params: {
          year,
          month,
          department,
          include_manual: includeManual,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      `Error al obtener estadísticas del departamento: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get paginated time entries with optional filtering
 */
export async function getTimeEntries(
  filters: TimeEntryFilterRequest
): Promise<TimeEntryListResponse> {
  try {
    const response = await apiClient.get(`/employee/time-tracking/entries`, {
      params: {
        start_date: filters.start_date,
        end_date: filters.end_date,
        employee_id: filters.employee_id,
        department: filters.department,
        source: filters.source || "shift",
        limit: filters.limit || 100,
        offset: filters.offset || 0,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(
      `Error al obtener registros de tiempo: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Manually trigger automatic time entry generation for a specific date
 * Admin only endpoint
 */
export async function triggerBatchProcess(
  processDate: string,
  overwriteExisting: boolean = false
): Promise<BatchProcessResponse> {
  try {
    const response = await apiClient.post(
      `/employee/time-tracking/batch-process`,
      {
        process_date: processDate,
        overwrite_existing: overwriteExisting,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      `Error al iniciar procesamiento por lotes: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
