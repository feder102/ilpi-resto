import { Search } from 'lucide-react';
import type { Department } from '../types/models';

interface SearchFilterProps {
  search: string;
  onSearchChange: (value: string) => void;
  departmentId: string;
  onDepartmentIdChange: (id: string) => void;
  departments: Department[];
  placeholder?: string;
}

export default function SearchFilter({
  search, onSearchChange, departmentId, onDepartmentIdChange, departments, placeholder = 'Buscar...',
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
        value={departmentId}
        onChange={(e) => onDepartmentIdChange(e.target.value)}
        className="select select-bordered"
      >
        <option value="">Todos los departamentos</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
    </div>
  );
}
