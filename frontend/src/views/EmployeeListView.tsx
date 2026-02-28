// T049+T050: Employee list view with card grid, search/filter, create/edit modal
import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Edit2, Trash2, User } from 'lucide-react';
import SearchFilter from '../components/SearchFilter';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import FormField from '../components/FormField';
import { useAuth } from '../hooks/useAuth';
import { DEPARTMENTS } from '../config/constants';
import { Role, Department, MaritalStatus, Gender } from '../types/models';
import type { Employee } from '../types/models';
import type { PaginatedResponse } from '../types/api';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  type EmployeeCreateData,
  type EmployeeUpdateData,
} from '../services/employeeService';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  fontSize: '0.9rem',
};

const INITIAL_FORM: EmployeeCreateData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  dni: '',
  address: '',
  birth_date: '',
  marital_status: '',
  gender: '',
  role: Role.EMPLEADO,
  department: Department.COCINA,
  hire_date: new Date().toISOString().split('T')[0],
  profile_image: '',
  emergency_contact: '',
};

export default function EmployeeListView() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(Role.ADMIN);
  const isAdminOrMod = hasRole(Role.ADMIN, Role.MODERADOR);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeCreateData>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState('');

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data: PaginatedResponse<Employee> = await getEmployees({
        search: search || undefined,
        department: department || undefined,
        page,
        size: 20,
      });
      setEmployees(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      setError('Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  }, [search, department, page]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Debounce search
  const [searchDebounce, setSearchDebounce] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchDebounce);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDebounce]);

  const handleDepartmentChange = (val: string) => {
    setDepartment(val);
    setPage(1);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setForm({
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email,
      phone: emp.phone || '',
      dni: emp.dni,
      address: emp.address || '',
      birth_date: emp.birth_date || '',
      marital_status: emp.marital_status || '',
      gender: emp.gender || '',
      role: emp.role,
      department: emp.department,
      hire_date: emp.hire_date,
      profile_image: emp.profile_image || '',
      emergency_contact: emp.emergency_contact || '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.first_name.trim()) errs.first_name = 'Requerido';
    if (!form.last_name.trim()) errs.last_name = 'Requerido';
    if (!form.email.trim()) errs.email = 'Requerido';
    if (!form.dni.trim()) errs.dni = 'Requerido';
    if (!form.department) errs.department = 'Requerido';
    if (!form.role) errs.role = 'Requerido';
    if (!form.hire_date) errs.hire_date = 'Requerido';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    setFormErrors({});
    try {
      const payload = {
        ...form,
        phone: form.phone || null,
        address: form.address || null,
        birth_date: form.birth_date || null,
        marital_status: form.marital_status || null,
        gender: form.gender || null,
        profile_image: form.profile_image || null,
        emergency_contact: form.emergency_contact || null,
      };

      if (editingId) {
        await updateEmployee(editingId, payload as EmployeeUpdateData);
      } else {
        await createEmployee(payload);
      }
      setModalOpen(false);
      fetchEmployees();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { code?: string; message?: string } } } };
      const code = axiosErr.response?.data?.error?.code;
      const msg = axiosErr.response?.data?.error?.message || 'Error al guardar';
      if (code === 'DUPLICATE_DNI') {
        setFormErrors({ dni: msg });
      } else if (code === 'DUPLICATE_EMAIL') {
        setFormErrors({ email: msg });
      } else {
        setFormErrors({ _general: msg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteEmployee(deleteId);
      setDeleteId(null);
      fetchEmployees();
    } catch {
      setError('Error al eliminar empleado');
      setDeleteId(null);
    }
  };

  const updateField = (field: keyof EmployeeCreateData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Empleados</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>{total} empleados registrados</p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
              borderRadius: 8, border: 'none', background: '#2563eb', color: 'white',
              fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
            }}
          >
            <UserPlus size={18} />
            Nuevo Empleado
          </button>
        )}
      </div>

      <SearchFilter
        search={searchDebounce}
        onSearchChange={setSearchDebounce}
        department={department}
        onDepartmentChange={handleDepartmentChange}
        placeholder="Buscar por nombre o DNI..."
      />

      {error && (
        <p style={{ color: '#dc2626', marginTop: 12 }}>{error}</p>
      )}

      {loading ? (
        <p style={{ textAlign: 'center', color: '#64748b', marginTop: 40 }}>Cargando...</p>
      ) : employees.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#64748b', marginTop: 40 }}>No se encontraron empleados</p>
      ) : (
        <>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16, marginTop: 20,
          }}>
            {employees.map((emp) => (
              <div
                key={emp.id}
                style={{
                  background: 'white', borderRadius: 12, padding: 20,
                  border: '1px solid #e2e8f0', position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', background: '#e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', flexShrink: 0,
                  }}>
                    {emp.profile_image ? (
                      <img src={emp.profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={24} color="#94a3b8" />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                      {emp.first_name} {emp.last_name}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{emp.department}</p>
                  </div>
                  <StatusBadge status={emp.status} />
                </div>

                <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                  <p style={{ margin: '4px 0' }}>DNI: {emp.dni}</p>
                  <p style={{ margin: '4px 0' }}>{emp.email}</p>
                </div>

                {isAdminOrMod && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => openEdit(emp)}
                      style={{
                        padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0',
                        background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: '0.8rem', color: '#475569',
                      }}
                    >
                      <Edit2 size={14} /> Editar
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => { setDeleteId(emp.id); setDeleteName(`${emp.first_name} ${emp.last_name}`); }}
                        style={{
                          padding: '6px 12px', borderRadius: 6, border: '1px solid #fecaca',
                          background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: '0.8rem', color: '#dc2626',
                        }}
                      >
                        <Trash2 size={14} /> Eliminar
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: page > 1 ? 'pointer' : 'default' }}
              >
                Anterior
              </button>
              <span style={{ padding: '8px 16px', fontSize: '0.9rem', color: '#64748b' }}>
                Página {page} de {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: page < pages ? 'pointer' : 'default' }}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100, overflow: 'auto',
        }}>
          <div style={{
            background: 'white', borderRadius: 12, padding: 32, maxWidth: 700, width: '95%',
            maxHeight: '90vh', overflow: 'auto', margin: '20px 0',
          }}>
            <h2 style={{ margin: '0 0 24px 0' }}>
              {editingId ? 'Editar Empleado' : 'Nuevo Empleado'}
            </h2>

            {formErrors._general && (
              <p style={{ color: '#dc2626', marginBottom: 16 }}>{formErrors._general}</p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              {/* Personal Info */}
              <FormField label="Nombre" required error={formErrors.first_name}>
                <input style={inputStyle} value={form.first_name} onChange={(e) => updateField('first_name', e.target.value)} />
              </FormField>
              <FormField label="Apellidos" required error={formErrors.last_name}>
                <input style={inputStyle} value={form.last_name} onChange={(e) => updateField('last_name', e.target.value)} />
              </FormField>
              <FormField label="Email" required error={formErrors.email}>
                <input style={inputStyle} type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
              </FormField>
              <FormField label="Teléfono">
                <input style={inputStyle} value={form.phone || ''} onChange={(e) => updateField('phone', e.target.value)} />
              </FormField>
              <FormField label="DNI" required error={formErrors.dni}>
                <input style={inputStyle} value={form.dni} onChange={(e) => updateField('dni', e.target.value)} />
              </FormField>
              <FormField label="Fecha de nacimiento">
                <input style={inputStyle} type="date" value={form.birth_date || ''} onChange={(e) => updateField('birth_date', e.target.value)} />
              </FormField>
              <FormField label="Dirección">
                <input style={inputStyle} value={form.address || ''} onChange={(e) => updateField('address', e.target.value)} />
              </FormField>
              <FormField label="Género">
                <select style={inputStyle} value={form.gender || ''} onChange={(e) => updateField('gender', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {Object.values(Gender).map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </FormField>
              <FormField label="Estado civil">
                <select style={inputStyle} value={form.marital_status || ''} onChange={(e) => updateField('marital_status', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {Object.values(MaritalStatus).map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </FormField>

              {/* Company Info */}
              <FormField label="Departamento" required error={formErrors.department}>
                <select style={inputStyle} value={form.department} onChange={(e) => updateField('department', e.target.value)}>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </FormField>
              <FormField label="Rol" required error={formErrors.role}>
                <select style={inputStyle} value={form.role} onChange={(e) => updateField('role', e.target.value)}>
                  {Object.values(Role).map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </FormField>
              <FormField label="Fecha de contratación" required error={formErrors.hire_date}>
                <input style={inputStyle} type="date" value={form.hire_date} onChange={(e) => updateField('hire_date', e.target.value)} />
              </FormField>
              <FormField label="Contacto de emergencia">
                <input style={inputStyle} value={form.emergency_contact || ''} onChange={(e) => updateField('emergency_contact', e.target.value)} />
              </FormField>
              <FormField label="URL imagen de perfil">
                <input style={inputStyle} value={form.profile_image || ''} onChange={(e) => updateField('profile_image', e.target.value)} />
              </FormField>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: submitting ? '#93c5fd' : '#2563eb', color: 'white',
                  fontWeight: 600, cursor: submitting ? 'default' : 'pointer',
                }}
              >
                {submitting ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear empleado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar empleado"
        message={`¿Está seguro de que desea eliminar a ${deleteName}? Esta acción desactivará al empleado y rechazará sus solicitudes de vacaciones pendientes.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
