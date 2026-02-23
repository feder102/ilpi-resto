// T077: Dashboard view with stat cards and today's shifts
import { useState, useEffect } from 'react';
import { Users, Clock, Palmtree, Bell } from 'lucide-react';
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
    return <p style={{ textAlign: 'center', color: '#64748b', marginTop: 40 }}>Cargando dashboard...</p>;
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 24px', fontSize: '1.5rem', fontWeight: 700 }}>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard title="Total Personal" value={stats?.total_employees ?? 0} icon={<Users size={24} />} color="#3b82f6" />
        <StatCard title="En Turno" value={stats?.on_shift ?? 0} icon={<Clock size={24} />} color="#16a34a" />
        <StatCard title="De Vacaciones" value={stats?.on_vacation ?? 0} icon={<Palmtree size={24} />} color="#eab308" />
        <StatCard title="Solicitudes Pendientes" value={stats?.pending_requests ?? 0} icon={<Bell size={24} />} color="#ef4444" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>Turnos de Hoy</h2>
          {todayShifts.length === 0 ? (
            <p style={{ color: '#64748b' }}>No hay turnos registrados hoy</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayShifts.map((s) => (
                <div key={s.id} style={{
                  background: 'white', borderRadius: 8, padding: '12px 16px',
                  border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontWeight: 500 }}>{s.employee_name || 'N/A'}</span>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {s.entry_time ? new Date(s.entry_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''}
                    {s.exit_time ? ` - ${new Date(s.exit_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : ' — En turno...'}
                  </span>
                  {s.task_label && (
                    <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem' }}>
                      {s.task_label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0', alignSelf: 'start' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 600 }}>Resumen Rápido</h3>
          <div style={{ fontSize: '0.9rem', color: '#475569' }}>
            <p>Personal activo: <strong>{stats?.total_employees ?? 0}</strong></p>
            <p>Turnos en curso: <strong>{stats?.on_shift ?? 0}</strong></p>
            <p>Vacaciones activas: <strong>{stats?.on_vacation ?? 0}</strong></p>
            <p>Pendientes de revisión: <strong>{stats?.pending_requests ?? 0}</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}
