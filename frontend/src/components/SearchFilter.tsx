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
      <label className="input input-bordered flex items-center gap-2 flex-1 min-w-[200px]">
        <Search size={18} className="opacity-50" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="grow"
        />
      </label>
      <select
        value={department}
        onChange={(e) => onDepartmentChange(e.target.value)}
        className="select select-bordered"
      >
        <option value="">Todos los departamentos</option>
        {DEPARTMENTS.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
    </div>
  );
}
