
import React, { useEffect, useState } from 'react';
import { Users, Clock, Calendar, AlertCircle, Sparkles } from 'lucide-react';
import { Employee, ShiftRecord, VacationRequest, StaffStatus } from '../types';
import { getShiftInsights } from '../services/geminiService';

interface DashboardViewProps {
  employees: Employee[];
  shifts: ShiftRecord[];
  vacations: VacationRequest[];
}

const DashboardView: React.FC<DashboardViewProps> = ({ employees, shifts, vacations }) => {
  const [insights, setInsights] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoadingInsights(true);
      const text = await getShiftInsights(employees, shifts);
      setInsights(text);
      setLoadingInsights(false);
    };
    fetchInsights();
  }, []);

  const activeNow = employees.filter(e => e.status === StaffStatus.ACTIVE).length;
  const onVacation = employees.filter(e => e.status === StaffStatus.VACATION).length;
  const pendingVacations = vacations.filter(v => v.status === 'Pendiente').length;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<Users className="text-blue-600" />} 
          title="Total Personal" 
          value={employees.length.toString()} 
          subtitle="En plantilla activa"
        />
        <StatCard 
          icon={<Clock className="text-green-600" />} 
          title="En Turno" 
          value={activeNow.toString()} 
          subtitle="Actualmente presentes"
        />
        <StatCard 
          icon={<Calendar className="text-orange-600" />} 
          title="En Vacaciones" 
          value={onVacation.toString()} 
          subtitle="Fuera temporalmente"
        />
        <StatCard 
          icon={<AlertCircle className="text-red-600" />} 
          title="Solicitudes" 
          value={pendingVacations.toString()} 
          subtitle="Pendientes de revisión"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gemini Insights */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-indigo-600" size={20} />
            <h3 className="font-bold text-lg">IA Staff Insights</h3>
          </div>
          <div className="prose prose-slate max-w-none min-h-[150px]">
            {loadingInsights ? (
              <div className="flex flex-col gap-3 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                <div className="h-4 bg-slate-100 rounded w-full"></div>
                <div className="h-4 bg-slate-100 rounded w-5/6"></div>
              </div>
            ) : (
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {insights || "Cargando sugerencias de optimización para ILPI..."}
              </p>
            )}
          </div>
        </div>

        {/* Next Shifts */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="font-bold text-lg mb-4">Turnos de Hoy</h3>
          <div className="space-y-4">
            {employees.slice(0, 5).map(emp => (
              <div key={emp.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <img src={emp.profileImage} alt="" className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{emp.firstName} {emp.lastName}</p>
                  <p className="text-xs text-slate-500">{emp.department}</p>
                </div>
                <div className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                  09:00 - 17:00
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, subtitle }: { icon: React.ReactNode, title: string, value: string, subtitle: string }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
    <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
    <div>
      <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
      <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
    </div>
  </div>
);

export default DashboardView;
