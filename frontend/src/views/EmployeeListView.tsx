// T034: Employee list view with card grid, search/filter, create/edit modal - refactored to use UI components
import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Edit2, Trash2, User } from 'lucide-react';
import { Button, Card, Modal, Alert, Badge } from '../components/ui';
import SearchFilter from '../components/SearchFilter';
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

// Status to Badge variant mapping
function getStatusVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  switch (status) {
    case 'Activo':
      return 'success';
    case 'Vacaciones':
      return 'info';
    case 'Ausente':
      return 'warning';
    case 'Inactivo':
      return 'neutral';
    default:
      return 'neutral';
  }
}

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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 m-0">Empleados</h1>
          <p className="text-sm text-slate-600 mt-1">{total} empleados registrados</p>
        </div>
        {isAdmin && (
          <Button
            onClick={openCreate}
            variant="primary"
            className="flex items-center gap-2"
          >
            <UserPlus size={18} />
            Nuevo Empleado
          </Button>
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
        <Alert variant="error" message={error} />
      )}

      {loading ? (
        <p className="text-center text-slate-600 mt-10">Cargando...</p>
      ) : employees.length === 0 ? (
        <p className="text-center text-slate-600 mt-10">No se encontraron empleados</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {employees.map((emp) => (
              <Card key={emp.id} className="flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {emp.profile_image ? (
                      <img src={emp.profile_image} alt={emp.first_name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={24} className="text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900">
                      {emp.first_name} {emp.last_name}
                    </h3>
                    <p className="text-xs text-slate-600">{emp.department}</p>
                  </div>
                  <Badge variant={getStatusVariant(emp.status)}>{emp.status}</Badge>
                </div>

                <div className="text-sm text-slate-700 space-y-1 mb-3">
                  <p>DNI: {emp.dni}</p>
                  <p>{emp.email}</p>
                </div>

                {isAdminOrMod && (
                  <div className="flex gap-2 mt-auto pt-3 border-t border-slate-200">
                    <Button
                      onClick={() => openEdit(emp)}
                      variant="secondary"
                      size="sm"
                      className="flex-1 flex items-center justify-center gap-1"
                    >
                      <Edit2 size={14} /> Editar
                    </Button>
                    {isAdmin && (
                      <Button
                        onClick={() => { setDeleteId(emp.id); setDeleteName(`${emp.first_name} ${emp.last_name}`); }}
                        variant="danger"
                        size="sm"
                        className="flex-1 flex items-center justify-center gap-1"
                      >
                        <Trash2 size={14} /> Eliminar
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                variant="secondary"
                size="sm"
              >
                Anterior
              </Button>
              <span className="text-sm text-slate-600">
                Página {page} de {pages}
              </span>
              <Button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                variant="secondary"
                size="sm"
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Empleado' : 'Nuevo Empleado'}
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              loading={submitting}
              onClick={handleSubmit}
            >
              {submitting ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear empleado'}
            </Button>
          </div>
        }
      >
        {formErrors._general && (
          <Alert variant="error" message={formErrors._general} className="mb-4" />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Info */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nombre {formErrors.first_name && <span className="text-red-600">*</span>}
            </label>
            <input className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={form.first_name} onChange={(e) => updateField('first_name', e.target.value)} />
            {formErrors.first_name && <p className="mt-1 text-xs text-red-600">{formErrors.first_name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Apellidos {formErrors.last_name && <span className="text-red-600">*</span>}
            </label>
            <input className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={form.last_name} onChange={(e) => updateField('last_name', e.target.value)} />
            {formErrors.last_name && <p className="mt-1 text-xs text-red-600">{formErrors.last_name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email {formErrors.email && <span className="text-red-600">*</span>}
            </label>
            <input type="email" className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
            {formErrors.email && <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Teléfono
            </label>
            <input className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={form.phone || ''} onChange={(e) => updateField('phone', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              DNI {formErrors.dni && <span className="text-red-600">*</span>}
            </label>
            <input className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={form.dni} onChange={(e) => updateField('dni', e.target.value)} />
            {formErrors.dni && <p className="mt-1 text-xs text-red-600">{formErrors.dni}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Fecha de nacimiento
            </label>
            <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={form.birth_date || ''} onChange={(e) => updateField('birth_date', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Dirección
            </label>
            <input className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={form.address || ''} onChange={(e) => updateField('address', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Género
            </label>
            <select className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={form.gender || ''} onChange={(e) => updateField('gender', e.target.value)}>
              <option value="">Seleccionar...</option>
              {Object.values(Gender).map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Estado civil
            </label>
            <select className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={form.marital_status || ''} onChange={(e) => updateField('marital_status', e.target.value)}>
              <option value="">Seleccionar...</option>
              {Object.values(MaritalStatus).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Company Info */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Departamento {formErrors.department && <span className="text-red-600">*</span>}
            </label>
            <select className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={form.department} onChange={(e) => updateField('department', e.target.value)}>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {formErrors.department && <p className="mt-1 text-xs text-red-600">{formErrors.department}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Rol {formErrors.role && <span className="text-red-600">*</span>}
            </label>
            <select className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={form.role} onChange={(e) => updateField('role', e.target.value)}>
              {Object.values(Role).map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {formErrors.role && <p className="mt-1 text-xs text-red-600">{formErrors.role}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Fecha de contratación {formErrors.hire_date && <span className="text-red-600">*</span>}
            </label>
            <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={form.hire_date} onChange={(e) => updateField('hire_date', e.target.value)} />
            {formErrors.hire_date && <p className="mt-1 text-xs text-red-600">{formErrors.hire_date}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Contacto de emergencia
            </label>
            <input className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={form.emergency_contact || ''} onChange={(e) => updateField('emergency_contact', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              URL imagen de perfil
            </label>
            <input className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={form.profile_image || ''} onChange={(e) => updateField('profile_image', e.target.value)} />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Eliminar empleado"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setDeleteId(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
            >
              Eliminar
            </Button>
          </div>
        }
      >
        <p className="text-slate-700">
          ¿Está seguro de que desea eliminar a {deleteName}? Esta acción desactivará al empleado y rechazará sus solicitudes de vacaciones pendientes.
        </p>
      </Modal>
    </div>
  );
}
