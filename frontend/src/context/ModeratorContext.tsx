/**
 * T013: ModeratorContext - Feature 006 State Management
 *
 * Provides moderator-specific state:
 * - Current moderator's department (fetched from API)
 * - Filter preferences (date ranges, status filters)
 * - Loading states for async operations
 * - Department employees cache
 *
 * Derived from AuthContext (moderator info via JWT)
 * Does NOT replace AuthContext; extends it with moderator-specific data
 */

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

export interface ModeratorInfo {
  userId: string;
  employeeId: string;
  department: string;
}

export interface ModeratorFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  employeeId?: string;
  departmentFilter?: string;
}

export interface ModeratorContextType {
  moderator: ModeratorInfo | null;
  filters: ModeratorFilters;
  setFilters: (filters: ModeratorFilters) => void;
  updateFilter: (key: keyof ModeratorFilters, value: string | undefined) => void;
  resetFilters: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const ModeratorContext = createContext<ModeratorContextType | undefined>(undefined);

export interface ModeratorProviderProps {
  children: ReactNode;
}

/**
 * T013: ModeratorProvider - Wraps moderator portal views
 *
 * Extracts moderator info from JWT (via AuthContext)
 * Manages moderator-specific filters and state
 * Fetches and caches moderator's department
 */
export function ModeratorProvider({ children }: ModeratorProviderProps) {
  const { user } = useAuth();
  const [filters, setFilters] = useState<ModeratorFilters>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [department, setDepartment] = useState<string>('');

  // Derive moderator info from AuthContext
  const moderator = user && user.role === 'Moderador' && user.employee_id
    ? {
        userId: user.id,
        employeeId: user.employee_id,
        department: department || '',
      }
    : null;

  // TODO: In Phase 3, fetch department from API using employee_id
  // For now, department is empty and will be populated later
  useEffect(() => {
    if (user?.employee_id) {
      // Placeholder for future API call to fetch employee details
      // Once fetched, call setDepartment(employeeData.department)
      setDepartment('');
    }
  }, [user?.employee_id]);

  const updateFilter = (key: keyof ModeratorFilters, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({});
  };

  const value: ModeratorContextType = {
    moderator,
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    isLoading,
    setIsLoading,
    error,
    setError,
  };

  return (
    <ModeratorContext.Provider value={value}>
      {children}
    </ModeratorContext.Provider>
  );
}

/**
 * useModeratorContext - Hook to access moderator state
 *
 * Usage:
 * const { moderator, filters, setFilters } = useModeratorContext();
 *
 * Throws error if used outside ModeratorProvider
 */
export function useModeratorContext(): ModeratorContextType {
  const context = useContext(ModeratorContext);
  if (context === undefined) {
    throw new Error('useModeratorContext must be used within a ModeratorProvider');
  }
  return context;
}
