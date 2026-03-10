/**
 * Time Tracking API Service for Feature 005
 * Handles clock-in/out and time record operations
 */

import apiClient from './apiClient';
import type {
  ClockInResponse,
  ClockOutResponse,
  TimeRecordListResponse,
} from '../types/employee';

class TimeTrackingService {
  /**
   * Clock in employee for their shift
   */
  async clockIn(): Promise<ClockInResponse> {
    console.log('[TimeTrackingService] Attempting clock-in');
    try {
      const { data } = await apiClient.post<ClockInResponse>(
        '/employee/time-tracking/clock-in'
      );
      console.log('[TimeTrackingService] Clock-in successful');
      return data;
    } catch (error) {
      console.error('[TimeTrackingService] Clock-in failed:', error);
      throw error;
    }
  }

  /**
   * Clock out employee from their shift
   */
  async clockOut(): Promise<ClockOutResponse> {
    console.log('[TimeTrackingService] Attempting clock-out');
    try {
      const { data } = await apiClient.post<ClockOutResponse>(
        '/employee/time-tracking/clock-out'
      );
      console.log('[TimeTrackingService] Clock-out successful');
      return data;
    } catch (error) {
      console.error('[TimeTrackingService] Clock-out failed:', error);
      throw error;
    }
  }

  /**
   * Get current clock-in/out status for today
   * Used by dashboard widget to show live clock status
   */
  async getTodayStatus(): Promise<{
    status: 'clocked_in' | 'clocked_out' | 'not_clocked_in';
    record: any | null;
    elapsed_seconds: number;
    summary?: any;
    message: string;
  }> {
    console.log('[TimeTrackingService] Fetching today status');
    try {
      const { data } = await apiClient.get<any>(
        '/employee/time-tracking/today'
      );
      console.log('[TimeTrackingService] Today status fetched successfully');
      return data;
    } catch (error) {
      console.error('[TimeTrackingService] Failed to fetch today status:', error);
      throw error;
    }
  }

  /**
   * Get employee's time records for a date range
   */
  async getTimeRecords(
    dateFrom?: string,
    dateTo?: string,
    page: number = 1,
    size: number = 20
  ): Promise<TimeRecordListResponse> {
    console.log('[TimeTrackingService] Fetching time records');
    try {
      const params: Record<string, string | number> = { page, size };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const { data } = await apiClient.get<TimeRecordListResponse>(
        '/employee/time-tracking/records',
        { params }
      );
      console.log('[TimeTrackingService] Time records fetched successfully');
      return data;
    } catch (error) {
      console.error('[TimeTrackingService] Failed to fetch time records:', error);
      throw error;
    }
  }
}

export const timeTrackingService = new TimeTrackingService();
