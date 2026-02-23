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
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
        <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', padding: '10px 12px 10px 40px', borderRadius: 8,
            border: '1px solid #e2e8f0', fontSize: '0.9rem',
          }}
        />
      </div>
      <select
        value={department}
        onChange={(e) => onDepartmentChange(e.target.value)}
        style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.9rem' }}
      >
        <option value="">Todos los departamentos</option>
        {DEPARTMENTS.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
    </div>
  );
}
