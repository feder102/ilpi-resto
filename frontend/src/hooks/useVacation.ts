/**
 * useVacation Hook - Employee Vacation State Management
 * Feature 005: Employee Workspace Portal (US3)
 *
 * Manages:
 * - Current year vacation balance (total, used, remaining days)
 * - List of vacation requests with pagination
 * - Form submission and error handling
 * - Request cancellation
 */

import { useState, useCallback, useEffect } from 'react';
import {
  getEmployeeVacationBalance,
  getEmployeeVacationRequests,
  createEmployeeVacationRequest,
  cancelEmployeeVacationRequest,
} from '../services/vacationService';
import type { VacationBalance, VacationRequest } from '../types/models';
import type { PaginatedResponse } from '../types/api';

export interface UseVacationState {
  balance: VacationBalance | null;
  requests: VacationRequest[];
  loading: boolean;
  submitting: boolean;
  error: string;
  success: string;
  page: number;
  totalPages: number;
  statusFilter: string | null;
}

export function useVacation() {
  const [state, setState] = useState<UseVacationState>({
    balance: null,
    requests: [],
    loading: false,
    submitting: false,
    error: '',
    success: '',
    page: 1,
    totalPages: 1,
    statusFilter: null,
  });

  // Fetch vacation balance for current year
  const loadBalance = useCallback(async (year?: number) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: '' }));
      const balance = await getEmployeeVacationBalance(year);
      setState(prev => ({ ...prev, balance }));
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Error al cargar el saldo de vacaciones';
      setState(prev => ({ ...prev, error: message }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // Fetch vacation requests with optional filters
  const loadRequests = useCallback(
    async (page: number = 1, status?: string) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: '' }));
        const response = (await getEmployeeVacationRequests(
          status,
          page,
          20
        )) as PaginatedResponse<VacationRequest>;
        setState(prev => ({
          ...prev,
          requests: response.items || [],
          page: response.page,
          totalPages: response.pages,
          statusFilter: status || null,
        }));
      } catch (err: any) {
        const message = err.response?.data?.detail || 'Error al cargar las solicitudes';
        setState(prev => ({ ...prev, error: message }));
      } finally {
        setState(prev => ({ ...prev, loading: false }));
      }
    },
    []
  );

  // Submit new vacation request
  const submitRequest = useCallback(async (startDate: string, endDate: string) => {
    try {
      setState(prev => ({ ...prev, submitting: true, error: '', success: '' }));
      const newRequest = await createEmployeeVacationRequest(
        startDate,
        endDate
      );
      setState(prev => ({
        ...prev,
        success: 'Solicitud de vacaciones creada exitosamente',
        requests: [newRequest, ...prev.requests],
      }));
      // Reload balance since the request was created
      await loadBalance();
      // Clear success message after 5 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, success: '' }));
      }, 5000);
      return newRequest;
    } catch (err: any) {
      const message =
        err.response?.data?.detail || 'Error al crear la solicitud de vacaciones';
      setState(prev => ({ ...prev, error: message }));
      throw err;
    } finally {
      setState(prev => ({ ...prev, submitting: false }));
    }
  }, [loadBalance]);

  // Cancel pending vacation request
  const cancelRequest = useCallback(async (requestId: string, version: number) => {
    try {
      setState(prev => ({ ...prev, submitting: true, error: '', success: '' }));
      const cancelledRequest = await cancelEmployeeVacationRequest(
        requestId,
        version
      );
      setState(prev => ({
        ...prev,
        requests: prev.requests.map(r =>
          r.id === requestId ? { ...r, status: 'Cancelado', version: version + 1 } : r
        ),
        success: 'Solicitud cancelada exitosamente',
      }));
      // Reload balance since the request was cancelled
      await loadBalance();
      // Clear success message after 5 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, success: '' }));
      }, 5000);
      return cancelledRequest;
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Error al cancelar la solicitud';
      setState(prev => ({ ...prev, error: message }));
      throw err;
    } finally {
      setState(prev => ({ ...prev, submitting: false }));
    }
  }, [loadBalance]);

  // Filter requests by status
  const filterByStatus = useCallback(
    (status: string | null) => {
      loadRequests(1, status || undefined);
    },
    [loadRequests]
  );

  // Clear error message
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: '' }));
  }, []);

  // Clear success message
  const clearSuccess = useCallback(() => {
    setState(prev => ({ ...prev, success: '' }));
  }, []);

  // Initial load on mount
  useEffect(() => {
    loadBalance();
    loadRequests();
  }, [loadBalance, loadRequests]);

  return {
    // State
    balance: state.balance,
    requests: state.requests,
    loading: state.loading,
    submitting: state.submitting,
    error: state.error,
    success: state.success,
    page: state.page,
    totalPages: state.totalPages,
    statusFilter: state.statusFilter,

    // Methods
    loadBalance,
    loadRequests,
    submitRequest,
    cancelRequest,
    filterByStatus,
    clearError,
    clearSuccess,
  };
}
