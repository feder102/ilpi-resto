/**
 * VacationBalanceCard - Display Employee Vacation Balance
 * Feature 005: Employee Workspace Portal (US3)
 *
 * Shows:
 * - Circular progress indicator with remaining days prominently displayed
 * - Total days available
 * - Used days
 * - Remaining days percentage
 */

import { AlertCircle } from 'lucide-react';
import type { VacationBalance } from '../../types/models';

interface VacationBalanceCardProps {
  balance: VacationBalance | null;
  loading: boolean;
}

export default function VacationBalanceCard({ balance, loading }: VacationBalanceCardProps) {
  if (loading) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body items-center justify-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <span className="ml-3 text-base-content/60">Cargando saldo de vacaciones...</span>
        </div>
      </div>
    );
  }

  if (!balance) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <div className="flex items-center gap-3 text-warning">
            <AlertCircle className="w-5 h-5" />
            <p>No se pudo cargar el saldo de vacaciones</p>
          </div>
        </div>
      </div>
    );
  }

  const remainingPercentage = (balance.remaining_days / balance.total_days) * 100;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (remainingPercentage / 100) * circumference;

  // Color based on remaining days
  const getColor = () => {
    if (balance.remaining_days >= 15) return 'var(--color-success)';
    if (balance.remaining_days >= 5) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  const getColorClass = () => {
    if (balance.remaining_days >= 15) return 'text-success';
    if (balance.remaining_days >= 5) return 'text-warning';
    return 'text-error';
  };

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title text-2xl">Mi Saldo de Vacaciones</h2>

        <div className="flex items-center justify-center gap-12 mt-4">
          {/* Circular Progress */}
          <div className="flex flex-col items-center">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full" viewBox="0 0 120 120">
                {/* Background circle */}
                <circle cx="60" cy="60" r="45" fill="none" stroke="var(--color-base-300)" strokeWidth="8" />

                {/* Progress circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="45"
                  fill="none"
                  stroke={getColor()}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                  className="transition-all duration-500"
                />
              </svg>

              {/* Center text - Remaining days */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={`text-4xl font-bold ${getColorClass()}`}>
                  {balance.remaining_days}
                </div>
                <div className="text-xs text-base-content/60 mt-1">días disponibles</div>
              </div>
            </div>

            {/* Percentage below circle */}
            <p className="mt-4 text-sm text-base-content/60">
              {remainingPercentage.toFixed(0)}% del total
            </p>
          </div>

          {/* Details */}
          <div className="flex flex-col gap-6">
            {/* Total Days */}
            <div className="bg-base-200 rounded-lg p-4">
              <p className="text-xs text-base-content/60 uppercase tracking-wide mb-1">Total Disponible</p>
              <p className="text-2xl font-bold text-base-content">{balance.total_days} días</p>
            </div>

            {/* Used Days */}
            <div className="bg-warning/10 rounded-lg p-4">
              <p className="text-xs text-base-content/60 uppercase tracking-wide mb-1">Días Utilizados</p>
              <p className="text-2xl font-bold text-warning">{balance.used_days} días</p>
            </div>

            {/* Year */}
            <div className="bg-info/10 rounded-lg p-4">
              <p className="text-xs text-base-content/60 uppercase tracking-wide mb-1">Año</p>
              <p className="text-2xl font-bold text-info">{balance.year}</p>
            </div>
          </div>
        </div>

        {/* Status indicator */}
        {balance.remaining_days === 0 && (
          <div role="alert" className="alert alert-error mt-8">
            <span>No tienes días de vacaciones disponibles</span>
          </div>
        )}

        {balance.remaining_days <= 5 && balance.remaining_days > 0 && (
          <div role="alert" className="alert alert-warning mt-8">
            <span>Te quedan pocos días de vacaciones ({balance.remaining_days})</span>
          </div>
        )}

        {balance.remaining_days > 15 && (
          <div role="alert" className="alert alert-success mt-8">
            <span>Tienes suficientes días para disfrutar tus vacaciones</span>
          </div>
        )}
      </div>
    </div>
  );
}
