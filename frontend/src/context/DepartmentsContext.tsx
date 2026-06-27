// T025: DepartmentsContext — caches department catalog, shared across views (Feature 014)
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import departmentService from '../services/departmentService';
import type { Department } from '../types/models';
import { useAuth } from '../hooks/useAuth';

interface DepartmentsContextValue {
  departments: Department[];
  loading: boolean;
  error: string | null;
  refresh: (opts?: { includeInactive?: boolean }) => Promise<void>;
}

const DepartmentsContext = createContext<DepartmentsContextValue | null>(null);

export function DepartmentsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (opts: { includeInactive?: boolean } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await departmentService.getDepartments({
        includeInactive: opts.includeInactive ?? false,
      });
      setDepartments(res.items);
    } catch (err) {
      setError('Error al cargar departamentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      refresh();
    }
  }, [user, refresh]);

  return (
    <DepartmentsContext.Provider value={{ departments, loading, error, refresh }}>
      {children}
    </DepartmentsContext.Provider>
  );
}

export function useDepartmentsContext(): DepartmentsContextValue {
  const ctx = useContext(DepartmentsContext);
  if (!ctx) {
    throw new Error('useDepartmentsContext must be used inside DepartmentsProvider');
  }
  return ctx;
}
