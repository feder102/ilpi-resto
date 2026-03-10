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

import { AlertCircle, Loader } from 'lucide-react';
import type { VacationBalance } from '../../types/models';

interface VacationBalanceCardProps {
  balance: VacationBalance | null;
  loading: boolean;
}

export default function VacationBalanceCard({ balance, loading }: VacationBalanceCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="ml-3 text-gray-600">Cargando saldo de vacaciones...</span>
      </div>
    );
  }

  if (!balance) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center gap-3 text-amber-600">
          <AlertCircle className="w-5 h-5" />
          <p>No se pudo cargar el saldo de vacaciones</p>
        </div>
      </div>
    );
  }

  const remainingPercentage = (balance.remaining_days / balance.total_days) * 100;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (remainingPercentage / 100) * circumference;

  // Color based on remaining days
  const getColor = () => {
    if (balance.remaining_days >= 15) return '#10b981'; // green-500
    if (balance.remaining_days >= 5) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  const getColorClass = () => {
    if (balance.remaining_days >= 15) return 'text-green-600';
    if (balance.remaining_days >= 5) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-8">Mi Saldo de Vacaciones</h2>

      <div className="flex items-center justify-center gap-12">
        {/* Circular Progress */}
        <div className="flex flex-col items-center">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full" viewBox="0 0 120 120">
              {/* Background circle */}
              <circle cx="60" cy="60" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />

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
              <div className="text-xs text-gray-500 mt-1">días disponibles</div>
            </div>
          </div>

          {/* Percentage below circle */}
          <p className="mt-4 text-sm text-gray-600">
            {remainingPercentage.toFixed(0)}% del total
          </p>
        </div>

        {/* Details */}
        <div className="flex flex-col gap-6">
          {/* Total Days */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Disponible</p>
            <p className="text-2xl font-bold text-gray-800">{balance.total_days} días</p>
          </div>

          {/* Used Days */}
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Días Utilizados</p>
            <p className="text-2xl font-bold text-orange-600">{balance.used_days} días</p>
          </div>

          {/* Year */}
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Año</p>
            <p className="text-2xl font-bold text-blue-600">{balance.year}</p>
          </div>
        </div>
      </div>

      {/* Status indicator */}
      {balance.remaining_days === 0 && (
        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 font-medium">
            ⚠️ No tienes días de vacaciones disponibles
          </p>
        </div>
      )}

      {balance.remaining_days <= 5 && balance.remaining_days > 0 && (
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700 font-medium">
            ⚠️ Te quedan pocos días de vacaciones ({balance.remaining_days})
          </p>
        </div>
      )}

      {balance.remaining_days > 15 && (
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700 font-medium">
            ✓ Tienes suficientes días para disfrutar tus vacaciones
          </p>
        </div>
      )}
    </div>
  );
}
