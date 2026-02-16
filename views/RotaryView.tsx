
import React, { useState } from 'react';
import { Users, LayoutGrid, List, Sparkles, MoveRight } from 'lucide-react';
import { Employee, Department, Team } from '../types';

interface RotaryViewProps {
  employees: Employee[];
}

const RotaryView: React.FC<RotaryViewProps> = ({ employees }) => {
  const [selectedDept, setSelectedDept] = useState(Department.KITCHEN);
  
  const deptEmployees = employees.filter(e => e.department === selectedDept);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex bg-white p-1 rounded-xl border border-slate-200">
          {Object.values(Department).map(dept => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedDept === dept 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
        
        <button className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-medium hover:bg-indigo-100 transition-colors">
          <Sparkles size={18} />
          Autogenerar Rotary
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Teams Management */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <LayoutGrid size={20} className="text-indigo-600" />
              Equipos de {selectedDept}
            </h3>

            <div className="space-y-6">
              <TeamSection title="Equipo A - Mañana" shift="09:00 - 17:00" members={deptEmployees.slice(0, 2)} />
              <TeamSection title="Equipo B - Tarde/Noche" shift="18:00 - 02:00" members={deptEmployees.slice(2, 4)} />
            </div>
          </div>
        </div>

        {/* Staff Availability Pool */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 h-fit sticky top-24">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Users size={20} className="text-indigo-600" />
            Disponible
          </h3>
          <p className="text-xs text-slate-500 mb-6">Arrastra empleados para asignarlos a un equipo o rotary.</p>
          
          <div className="space-y-3">
            {deptEmployees.map(emp => (
              <div key={emp.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl cursor-move hover:border-indigo-300 transition-colors group">
                <div className="flex items-center gap-3">
                  <img src={emp.profileImage} alt="" className="w-8 h-8 rounded-full" />
                  <span className="text-sm font-medium text-slate-700">{emp.firstName}</span>
                </div>
                <MoveRight size={16} className="text-slate-300 group-hover:text-indigo-500" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const TeamSection = ({ title, shift, members }: { title: string, shift: string, members: Employee[] }) => (
  <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/50">
    <div className="flex justify-between items-center mb-4">
      <div>
        <h4 className="font-bold text-slate-900">{title}</h4>
        <span className="text-xs text-slate-500 font-medium">{shift}</span>
      </div>
      <button className="text-xs font-bold text-indigo-600 hover:underline">Editar</button>
    </div>
    <div className="flex flex-wrap gap-2">
      {members.length > 0 ? (
        members.map(m => (
          <div key={m.id} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm">
            <img src={m.profileImage} alt="" className="w-6 h-6 rounded-full" />
            <span className="text-xs font-medium">{m.firstName}</span>
          </div>
        ))
      ) : (
        <p className="text-xs text-slate-400 italic">Sin miembros asignados</p>
      )}
      <button className="w-8 h-8 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-all">
        +
      </button>
    </div>
  </div>
);

export default RotaryView;
