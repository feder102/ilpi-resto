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
} from "../types/timeTracking";

/**
 * Get monthly work statistics for a specific employee
 * @param employeeId Employee UUID
 * @param year Year (e.g., 2026)
 * @param month Month (1-12)
 * @param includeManual Include manual time entries (default: false)
 * @returns EmployeeStatistics with total hours, days worked, avg, breakdown by shift type
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
      `Failed to fetch employee statistics: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get monthly work statistics aggregated by department
 * @param year Year (e.g., 2026)
 * @param month Month (1-12)
 * @param department Department filter (optional)
 * @param includeManual Include manual time entries (default: false)
 * @returns DepartmentStatistics for each department
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
      `Failed to fetch department statistics: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get paginated time entries with optional filtering
 * @param filters TimeEntryFilterRequest with start/end dates and optional filters
 * @returns TimeEntryListResponse with paginated entries
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
      `Failed to fetch time entries: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Manually trigger automatic time entry generation for a specific date
 * Admin only endpoint
 * @param processDate Date to process (YYYY-MM-DD)
 * @param overwriteExisting Force reprocessing existing entries (default: false)
 * @returns BatchProcessResponse with job status and entry count
 */
export async function triggerBatchProcess(
  processDate: string,
  overwriteExisting: boolean = false
): Promise<BatchProcessResponse> {
  try {
    console.log('[Statistics Service] Triggering batch process for date:', processDate);
    const response = await apiClient.post(
      `/employee/time-tracking/batch-process`,
      {
        process_date: processDate,
        overwrite_existing: overwriteExisting,
      }
    );
    return response.data;
  } catch (error) {
    console.error('[Statistics Service] Batch process error:', error);
    throw new Error(
      `Failed to trigger batch process: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
