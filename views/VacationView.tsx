
import React, { useState } from 'react';
import { Calendar as CalendarIcon, Filter, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Employee, VacationRequest } from '../types';

interface VacationViewProps {
  employees: Employee[];
  vacations: VacationRequest[];
  setVacations: (vacations: VacationRequest[]) => void;
}

const VacationView: React.FC<VacationViewProps> = ({ employees, vacations, setVacations }) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'calendar'>('requests');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex bg-white p-1 rounded-xl border border-slate-200">
          <button 
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'requests' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Solicitudes
          </button>
          <button 
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'calendar' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Calendario Anual
          </button>
        </div>
        <button className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
          Crear Solicitud
        </button>
      </div>

      {activeTab === 'requests' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vacations.map(req => {
            const emp = employees.find(e => e.id === req.employeeId);
            return (
              <div key={req.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <img src={emp?.profileImage} alt="" className="w-10 h-10 rounded-full" />
                    <div>
                      <h4 className="font-bold text-slate-900">{emp?.firstName} {emp?.lastName}</h4>
                      <p className="text-xs text-slate-500">{emp?.department}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50 mb-4">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Inicio</p>
                      <p className="text-sm font-semibold">{req.startDate}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Fin</p>
                      <p className="text-sm font-semibold">{req.endDate}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                    req.status === 'Aprobado' ? 'bg-green-50 text-green-600' : 
                    req.status === 'Rechazado' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                  }`}>
                    {req.status === 'Pendiente' && <Clock size={12} />}
                    {req.status === 'Aprobado' && <CheckCircle2 size={12} />}
                    {req.status === 'Rechazado' && <XCircle size={12} />}
                    {req.status}
                  </span>

                  {req.status === 'Pendiente' && (
                    <div className="flex gap-2">
                      <button className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                        <XCircle size={18} />
                      </button>
                      <button className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors">
                        <CheckCircle2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[400px]">
          <CalendarIcon size={64} className="text-slate-200 mb-4" />
          <h3 className="text-xl font-bold text-slate-900">Vista de Calendario Completa</h3>
          <p className="text-slate-500 max-w-sm text-center mt-2">Próximamente: Visualización interactiva de todos los turnos y ausencias mensuales de ILPI.</p>
        </div>
      )}
    </div>
  );
};

export default VacationView;
