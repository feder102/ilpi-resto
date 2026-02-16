
import React, { useState } from 'react';
import { Search, Plus, Mail, Phone, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { Employee, StaffStatus, Role, Department } from '../types';

interface EmployeeListViewProps {
  employees: Employee[];
  setEmployees: (employees: Employee[]) => void;
}

const EmployeeListView: React.FC<EmployeeListViewProps> = ({ employees, setEmployees }) => {
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('All');

  const filtered = employees.filter(emp => {
    const matchesSearch = `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(search.toLowerCase());
    const matchesDept = filterDept === 'All' || emp.department === filterDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o email..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select 
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none text-sm"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="All">Todos los Dptos</option>
            {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors">
            <Plus size={18} />
            <span>Nuevo Empleado</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(emp => (
          <div key={emp.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <div className="relative">
                <img src={emp.profileImage} alt="" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-slate-100" />
                <span className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${
                  emp.status === StaffStatus.ACTIVE ? 'bg-green-500' : 'bg-orange-500'
                }`} />
              </div>
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg">
                <MoreVertical size={20} />
              </button>
            </div>

            <div className="mb-4">
              <h4 className="font-bold text-lg text-slate-900">{emp.firstName} {emp.lastName}</h4>
              <p className="text-sm text-slate-500">{emp.department} • {emp.role}</p>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail size={14} className="text-slate-400" />
                <span className="truncate">{emp.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone size={14} className="text-slate-400" />
                <span>{emp.phone}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-50">
              <button className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                <Edit2 size={16} />
                Editar
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                <Trash2 size={16} />
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmployeeListView;
