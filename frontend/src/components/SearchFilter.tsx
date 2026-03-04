// T029: Search input + department filter
import { Search } from 'lucide-react';
import { DEPARTMENTS } from '../config/constants';

interface SearchFilterProps {
  search: string;
  onSearchChange: (value: string) => void;
  department: string;
  onDepartmentChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchFilter({
  search, onSearchChange, department, onDepartmentChange, placeholder = 'Buscar...',
}: SearchFilterProps) {
  return (
    <div className="flex gap-3 flex-wrap">
      <div className="flex-1 min-w-[200px] relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-md text-base text-slate-700 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
        />
      </div>
      <select
        value={department}
        onChange={(e) => onDepartmentChange(e.target.value)}
        className="px-3 py-2 border border-slate-200 rounded-md text-base text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
      >
        <option value="">Todos los departamentos</option>
        {DEPARTMENTS.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
    </div>
  );
}
