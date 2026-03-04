// T025: Auth context provider
/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { LoginResponse } from '../types';
import { setAccessToken, getAccessToken } from '../services/apiClient';
import { API_BASE_URL } from '../config/constants';
import axios from 'axios';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  tenant_id: string;
  employee_id: string | null;
}

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: string[]) => boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hasRole = useCallback(
    (...roles: string[]) => {
      return user !== null && roles.includes(user.role);
    },
    [user],
  );

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await axios.post<LoginResponse>(
      `${API_BASE_URL}/auth/login`,
      { email, password },
      { withCredentials: true },
    );
    setAccessToken(data.access_token);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true });
    } catch {
      // Ignore logout errors
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  // Silent refresh on mount
  useEffect(() => {
    const tryRefresh = async () => {
      try {
        const { data } = await axios.post<LoginResponse>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        setAccessToken(data.access_token);
        setUser(data.user);
      } catch {
        // No valid refresh token
      } finally {
        setIsLoading(false);
      }
    };

    if (!getAccessToken()) {
      tryRefresh();
    } else {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}
