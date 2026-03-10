/**
 * ModeratorContext - Feature 006 State Management
 *
 * Provides moderator-specific state:
 * - Current moderator's department
 * - Filter preferences (date ranges, status filters)
 * - Loading states for async operations
 *
 * Derived from AuthContext (moderator info via JWT)
 * Does NOT replace AuthContext; extends it with moderator-specific data
 */

import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

interface ModeratorFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  employeeId?: string;
}

interface ModeratorContextType {
  moderator: {
    userId: string;
    employeeId: string;
    department: string;
  } | null;
  filters: ModeratorFilters;
  setFilters: (filters: ModeratorFilters) => void;
  resetFilters: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const ModeratorContext = createContext<ModeratorContextType | undefined>(undefined);

export interface ModeratorProviderProps {
  children: ReactNode;
}

/**
 * ModeratorProvider - Wraps moderator portal views
 *
 * Extracts moderator info from JWT (via AuthContext)
 * Manages moderator-specific filters and state
 */
export function ModeratorProvider({ children }: ModeratorProviderProps) {
  const { user } = useAuth();
  const [filters, setFilters] = useState<ModeratorFilters>({});
  const [isLoading, setIsLoading] = useState(false);

  // Derive moderator info from AuthContext
  // Note: Department will be fetched from employee record via API in Phase 2
  const moderator = user && user.role === 'Moderador' && user.employee_id
    ? {
        userId: user.id,
        employeeId: user.employee_id,
        department: '', // Will be populated from employee record
      }
    : null;

  const resetFilters = () => {
    setFilters({});
  };

  const value: ModeratorContextType = {
    moderator,
    filters,
    setFilters,
    resetFilters,
    isLoading,
    setIsLoading,
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
