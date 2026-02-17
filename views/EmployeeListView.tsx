
import React, { useState } from 'react';
// Fix: Removed IdentificationIcon (not exported by lucide-react) and other unused imports
import { 
  Search, Plus, Mail, Phone, Edit2, Trash2, X, 
  MapPin, CreditCard, UserCircle
} from 'lucide-react';
import { Employee, StaffStatus, Role, Department, MaritalStatus, Gender } from '../types';

interface EmployeeListViewProps {
  employees: Employee[];
  onAdd: (emp: Employee) => void;
  onUpdate: (emp: Employee) => void;
  onDelete: (id: string) => void;
}

const EmployeeListView: React.FC<EmployeeListViewProps> = ({ employees, onAdd, onUpdate, onDelete }) => {
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [formData, setFormData] = useState<Partial<Employee>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dni: '',
    address: '',
    birthDate: '',
    maritalStatus: 'Soltero/a',
    gender: 'Masculino',
    role: Role.EMPLOYEE,
    department: Department.SERVICE,
    status: StaffStatus.ACTIVE,
    hireDate: new Date().toISOString().split('T')[0],
    profileImage: `https://picsum.photos/seed/${Math.random()}/100`
  });

  const filtered = employees.filter(emp => {
    const matchesSearch = `${emp.firstName} ${emp.lastName} ${emp.dni}`.toLowerCase().includes(search.toLowerCase());
    const matchesDept = filterDept === 'All' || emp.department === filterDept;
    return matchesSearch && matchesDept;
  });

  const handleOpenModal = (emp?: Employee) => {
    if (emp) {
      setEditingEmployee(emp);
      setFormData(emp);
    } else {
      setEditingEmployee(null);
      setFormData({
        id: Math.random().toString(36).substr(2, 9),
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dni: '',
        address: '',
        birthDate: '',
        maritalStatus: 'Soltero/a',
        gender: 'Masculino',
        role: Role.EMPLOYEE,
        department: Department.SERVICE,
        status: StaffStatus.ACTIVE,
        hireDate: new Date().toISOString().split('T')[0],
        profileImage: `https://picsum.photos/seed/${Math.random()}/100`
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmployee) {
      onUpdate(formData as Employee);
    } else {
      onAdd(formData as Employee);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, DNI..."
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
          <button 
            onClick={() => handleOpenModal()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
          >
            <Plus size={18} />
            <span>Nuevo Empleado</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(emp => (
          <div key={emp.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div className="relative">
                <img src={emp.profileImage} alt="" className="w-20 h-20 rounded-2xl object-cover shadow-inner ring-4 ring-slate-50" />
                <div className={`absolute -bottom-2 -right-2 px-2 py-0.5 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider ${
                  emp.status === StaffStatus.ACTIVE ? 'bg-green-500' : 'bg-orange-500'
                }`}>
                  {emp.status}
                </div>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => handleOpenModal(emp)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => onDelete(emp.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-bold text-xl text-slate-900 leading-tight">{emp.firstName} {emp.lastName}</h4>
              <p className="text-sm font-semibold text-indigo-600 bg-indigo-50/50 inline-block px-2 py-0.5 rounded-md mt-1">
                {emp.department} • {emp.role}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <Mail size={14} />
                </div>
                <span className="truncate flex-1">{emp.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <Phone size={14} />
                </div>
                <span>{emp.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <CreditCard size={14} />
                </div>
                <span className="font-mono text-xs font-bold">{emp.dni}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <MapPin size={14} />
                </div>
                <span className="truncate text-xs">{emp.address}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Desde {emp.hireDate}</span>
              </div>
              <div className="flex items-center -space-x-1">
                 <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{emp.gender}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                  <UserCircle size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado ILPI'}</h3>
                  <p className="text-slate-500 text-sm">Completa todos los campos para el registro oficial.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-all border border-transparent hover:border-slate-100">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Section 1: Basic Info */}
                <div className="space-y-6">
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-500 mb-4">Información Personal</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Nombre" value={formData.firstName} onChange={v => setFormData({...formData, firstName: v})} required />
                    <FormField label="Apellido" value={formData.lastName} onChange={v => setFormData({...formData, lastName: v})} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Email" type="email" value={formData.email} onChange={v => setFormData({...formData, email: v})} required />
                    <FormField label="Teléfono" value={formData.phone} onChange={v => setFormData({...formData, phone: v})} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="DNI / Pasaporte" value={formData.dni} onChange={v => setFormData({...formData, dni: v})} required />
                    <FormField label="Fecha de Nacimiento" type="date" value={formData.birthDate} onChange={v => setFormData({...formData, birthDate: v})} />
                  </div>
                  <FormField label="Dirección Completa" value={formData.address} onChange={v => setFormData({...formData, address: v})} placeholder="Calle, Portal, CP, Ciudad" />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <SelectField 
                      label="Sexo" 
                      value={formData.gender} 
                      options={['Masculino', 'Femenino', 'Otro']} 
                      onChange={v => setFormData({...formData, gender: v as Gender})} 
                    />
                    <SelectField 
                      label="Estado Civil" 
                      value={formData.maritalStatus} 
                      options={['Soltero/a', 'Casado/a', 'Divorciado/a', 'Viudo/a', 'Pareja de hecho']} 
                      onChange={v => setFormData({...formData, maritalStatus: v as MaritalStatus})} 
                    />
                  </div>
                </div>

                {/* Section 2: Work Info */}
                <div className="space-y-6">
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-500 mb-4">Datos de Empresa</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <SelectField 
                      label="Departamento" 
                      value={formData.department} 
                      options={Object.values(Department)} 
                      onChange={v => setFormData({...formData, department: v as Department})} 
                    />
                    <SelectField 
                      label="Rol" 
                      value={formData.role} 
                      options={Object.values(Role)} 
                      onChange={v => setFormData({...formData, role: v as Role})} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <SelectField 
                      label="Estado" 
                      value={formData.status} 
                      options={Object.values(StaffStatus)} 
                      onChange={v => setFormData({...formData, status: v as StaffStatus})} 
                    />
                    <FormField label="Fecha Contratación" type="date" value={formData.hireDate} onChange={v => setFormData({...formData, hireDate: v})} />
                  </div>

                  <FormField label="Contacto Emergencia" placeholder="Nombre y Teléfono" value={formData.emergencyContact} onChange={v => setFormData({...formData, emergencyContact: v})} />
                  
                  <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-4">Imagen de Perfil</p>
                    <div className="flex items-center gap-4">
                      <img src={formData.profileImage} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white shadow-md" alt="" />
                      <button type="button" onClick={() => setFormData({...formData, profileImage: `https://picsum.photos/seed/${Math.random()}/100`})} className="text-xs font-bold text-indigo-600 bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-indigo-50 transition-all">
                        Cambiar Aleatorio
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-12 flex gap-4 pt-8 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 text-slate-600 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                >
                  Descartar
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                >
                  {editingEmployee ? 'Guardar Cambios' : 'Registrar Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const FormField = ({ label, value, onChange, type = "text", required = false, placeholder = "" }: { label: string, value?: string, onChange: (v: string) => void, type?: string, required?: boolean, placeholder?: string }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 ml-1">{label} {required && '*'}</label>
    <input 
      type={type}
      placeholder={placeholder}
      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      required={required}
    />
  </div>
);

const SelectField = ({ label, value, options, onChange }: { label: string, value?: string, options: string[], onChange: (v: string) => void }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 ml-1">{label}</label>
    <select 
      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium appearance-none cursor-pointer"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

export default EmployeeListView;
