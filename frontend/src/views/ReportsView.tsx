// T037: Reports view with charts - refactored to use UI components
import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import { Card, Button } from '../components/ui';
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
    return <p className="text-center text-base-content/60 mt-10">Cargando informes...</p>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-base-content">Informes</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Hours by day chart */}
        <Card>
          <h3 className="text-lg font-semibold text-base-content mb-4">Horas por Día de la Semana</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hoursByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="hours" stroke="#4F46E5" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Department distribution */}
        <Card>
          <h3 className="text-lg font-semibold text-base-content mb-4">Distribución por Departamento</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deptDist}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Export placeholder */}
      <Card>
        <h3 className="text-lg font-semibold text-base-content mb-4">Exportar</h3>
        <div className="flex gap-3">
          <Button
            disabled
            variant="secondary"
            title="Disponible en futuras versiones"
          >
            Exportar PDF — Próximamente
          </Button>
          <Button
            disabled
            variant="secondary"
            title="Disponible en futuras versiones"
          >
            Exportar Excel — Próximamente
          </Button>
        </div>
      </Card>
    </div>
  );
}
