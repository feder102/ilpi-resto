
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download, Calendar, Filter } from 'lucide-react';
import { Employee, ShiftRecord } from '../types';

interface ReportsViewProps {
  employees: Employee[];
  shifts: ShiftRecord[];
}

const ReportsView: React.FC<ReportsViewProps> = ({ employees, shifts }) => {
  // Mock data for charts
  const monthlyData = [
    { name: 'Lun', horas: 42 },
    { name: 'Mar', horas: 38 },
    { name: 'Mie', horas: 45 },
    { name: 'Jue', horas: 52 },
    { name: 'Vie', horas: 65 },
    { name: 'Sab', horas: 78 },
    { name: 'Dom', horas: 72 },
  ];

  const deptData = [
    { name: 'Cocina', horas: 120 },
    { name: 'Sala', horas: 150 },
    { name: 'Barra', horas: 60 },
    { name: 'Admin', horas: 40 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Resumen de Horas Trabajadas</h3>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">
            <Calendar size={16} /> Mayo 2024
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100">
            <Download size={16} /> Exportar PDF/Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Horas por Día (Semana Actual)</h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  cursor={{stroke: '#6366f1', strokeWidth: 2}}
                />
                <Line type="monotone" dataKey="horas" stroke="#6366f1" strokeWidth={4} dot={{r: 4, fill: '#6366f1'}} activeDot={{r: 8}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Distribución por Departamento</h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="horas" fill="#818cf8" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Worked Employees Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-lg">Top Horas Mensual</h3>
          <Filter size={20} className="text-slate-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Empleado</th>
                <th className="px-6 py-4">Departamento</th>
                <th className="px-6 py-4">Horas Totales</th>
                <th className="px-6 py-4">Extra</th>
                <th className="px-6 py-4">Cumplimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.slice(0, 5).map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={emp.profileImage} className="w-8 h-8 rounded-full" alt="" />
                      <span className="text-sm font-semibold">{emp.firstName} {emp.lastName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{emp.department}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">160h</td>
                  <td className="px-6 py-4 text-green-600 font-bold">+4h</td>
                  <td className="px-6 py-4">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-green-500 h-full w-[95%]" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
