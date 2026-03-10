/**
 * useTimeTracking Hook for Feature 005: Employee Time Tracking
 *
 * Manages clock-in/out state and provides functions for time record operations.
 */

import { useState, useEffect, useCallback } from "react";
import { timeTrackingService } from "../services/timeTrackingService";
import type { TimeRecord, TimeRecordListResponse, TimeTrackingContextType } from "../types/employee";

export function useTimeTracking(): TimeTrackingContextType {
  const [clockStatus, setClockStatus] = useState<"not-clocked-in" | "clocked-in" | "clocked-out">("not-clocked-in");
  const [currentRecord, setCurrentRecord] = useState<TimeRecord | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize on mount - check if already clocked in today
  useEffect(() => {
    const initializeStatus = async () => {
      try {
        setIsLoading(true);
        const records = await getRecords(new Date().toISOString().split('T')[0]);

        if (records.items.length > 0) {
          const lastRecord = records.items[0];
          setCurrentRecord(lastRecord);

          if (lastRecord.clock_out_timestamp) {
            setClockStatus("clocked-out");
          } else {
            setClockStatus("clocked-in");
          }
        } else {
          setClockStatus("not-clocked-in");
        }
      } catch (err) {
        console.error("Failed to initialize time tracking status:", err);
        setError("Failed to load time tracking status");
      } finally {
        setIsLoading(false);
      }
    };

    initializeStatus();
  }, []);

  // Update elapsed time every minute if clocked in
  useEffect(() => {
    if (clockStatus !== "clocked-in" || !currentRecord) return;

    const timer = setInterval(() => {
      const clockInTime = new Date(currentRecord.clock_in_timestamp).getTime();
      const now = new Date().getTime();
      const elapsed = Math.floor((now - clockInTime) / 1000); // seconds
      setElapsedTime(elapsed);
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [clockStatus, currentRecord]);

  const clockIn = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await timeTrackingService.clockIn();
      setCurrentRecord(response.time_record);
      setClockStatus("clocked-in");
      setElapsedTime(0);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || "Failed to clock in";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clockOut = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await timeTrackingService.clockOut();
      setCurrentRecord(response.time_record);
      setClockStatus("clocked-out");
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || "Failed to clock out";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getRecords = useCallback(
    async (dateFrom?: string, dateTo?: string, page?: number, size?: number): Promise<TimeRecordListResponse> => {
      try {
        setError(null);
        return await timeTrackingService.getTimeRecords(dateFrom, dateTo, page, size);
      } catch (err: any) {
        const errorMessage = err.response?.data?.error?.message || "Failed to fetch time records";
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    clockStatus,
    currentRecord,
    elapsedTime,
    isLoading,
    error,
    clockIn,
    clockOut,
    getRecords,
    clearError,
  };
}
