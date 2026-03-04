// T033: Dashboard view with stat cards and today's shifts - refactored to use UI components
import { useState, useEffect } from 'react';
import { Users, Clock, Palmtree, Bell } from 'lucide-react';
import { Card, Badge } from '../components/ui';
import StatCard from '../components/StatCard';
import type { DashboardStats } from '../types/api';
import type { ShiftRecord } from '../types/models';
import { getStats } from '../services/dashboardService';
import { getShifts } from '../services/shiftService';

export default function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayShifts, setTodayShifts] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [statsData, shiftsData] = await Promise.all([
          getStats(),
          getShifts({ date_from: today, date_to: today, size: 50 }),
        ]);
        setStats(statsData);
        setTodayShifts(shiftsData.items);
      } catch {
        // Silently handle
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <p className="text-center text-slate-600 mt-10">Cargando dashboard...</p>;
  }

  return (
    <div className="max-w-7xl">
      <h1 className="text-2xl md:text-3xl font-bold mb-8 text-slate-900">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Personal" value={stats?.total_employees ?? 0} icon={<Users size={24} />} color="#3b82f6" />
        <StatCard title="En Turno" value={stats?.on_shift ?? 0} icon={<Clock size={24} />} color="#16a34a" />
        <StatCard title="De Vacaciones" value={stats?.on_vacation ?? 0} icon={<Palmtree size={24} />} color="#eab308" />
        <StatCard title="Solicitudes Pendientes" value={stats?.pending_requests ?? 0} icon={<Bell size={24} />} color="#ef4444" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-base md:text-lg font-semibold text-slate-900 mb-4">Turnos de Hoy</h2>
          {todayShifts.length === 0 ? (
            <p className="text-slate-600">No hay turnos registrados hoy</p>
          ) : (
            <div className="space-y-2">
              {todayShifts.map((s) => (
                <Card key={s.id} className="flex items-center justify-between p-3">
                  <span className="font-medium text-slate-900">{s.employee_name || 'N/A'}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600">
                      {s.entry_time ? new Date(s.entry_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''}
                      {s.exit_time ? ` - ${new Date(s.exit_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : ' — En turno...'}
                    </span>
                    {s.task_label && (
                      <Badge variant="neutral">{s.task_label}</Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <Card className="sticky top-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Resumen Rápido</h3>
            <div className="space-y-2 text-sm text-slate-700">
              <p>Personal activo: <strong className="text-slate-900">{stats?.total_employees ?? 0}</strong></p>
              <p>Turnos en curso: <strong className="text-slate-900">{stats?.on_shift ?? 0}</strong></p>
              <p>Vacaciones activas: <strong className="text-slate-900">{stats?.on_vacation ?? 0}</strong></p>
              <p>Pendientes de revisión: <strong className="text-slate-900">{stats?.pending_requests ?? 0}</strong></p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
