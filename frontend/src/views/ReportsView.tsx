// T078: Reports view with charts
import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import type { HoursByDayItem, DepartmentDistItem } from '../types/api';
import { getHoursByDay, getDepartmentDistribution } from '../services/dashboardService';

export default function ReportsView() {
  const [hoursByDay, setHoursByDay] = useState<HoursByDayItem[]>([]);
  const [deptDist, setDeptDist] = useState<DepartmentDistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [hours, dept] = await Promise.all([
          getHoursByDay(),
          getDepartmentDistribution(),
        ]);
        setHoursByDay(hours);
        setDeptDist(dept);
      } catch {
        // handle silently
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <p style={{ textAlign: 'center', color: '#64748b', marginTop: 40 }}>Cargando informes...</p>;
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 24px', fontSize: '1.5rem', fontWeight: 700 }}>Informes</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* Hours by day chart */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 600 }}>Horas por Día de la Semana</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hoursByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Department distribution */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 600 }}>Distribución por Departamento</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deptDist}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Export placeholder */}
      <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 600 }}>Exportar</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            disabled
            style={{
              padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0',
              background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed', fontSize: '0.9rem',
            }}
          >
            Exportar PDF — Próximamente
          </button>
          <button
            disabled
            style={{
              padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0',
              background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed', fontSize: '0.9rem',
            }}
          >
            Exportar Excel — Próximamente
          </button>
        </div>
      </div>
    </div>
  );
}
