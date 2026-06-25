// T034: Employee list view with card grid, search/filter, create/edit modal - refactored to use UI components
import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Edit2, Trash2, User, RotateCcw } from 'lucide-react';
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
  reactivateEmployee,
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
  const [customVacationDays, setCustomVacationDays] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState('');

  // Reactivate confirm
  const [reactivateId, setReactivateId] = useState<string | null>(null);
  const [reactivateName, setReactivateName] = useState('');
  const [reactivating, setReactivating] = useState(false);

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
    setCustomVacationDays(emp.custom_vacation_days != null ? String(emp.custom_vacation_days) : '');
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
    if (customVacationDays !== '') {
      const val = parseInt(customVacationDays, 10);
      if (isNaN(val) || val < 1 || val > 365) {
        errs.custom_vacation_days = 'Debe ser un número entre 1 y 365';
      }
    }
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
        const updatePayload: EmployeeUpdateData = {
          ...(payload as EmployeeUpdateData),
          custom_vacation_days: customVacationDays !== ''
            ? parseInt(customVacationDays, 10)
            : null,
        };
        await updateEmployee(editingId, updatePayload);
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

  const handleReactivate = async () => {
    if (!reactivateId) return;
    setReactivating(true);
    try {
      await reactivateEmployee(reactivateId);
      setReactivateId(null);
      fetchEmployees();
    } catch {
      setError('Error al reactivar empleado');
      setReactivateId(null);
    } finally {
      setReactivating(false);
    }
  };

  const updateField = (field: keyof EmployeeCreateData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-base-content m-0">Empleados</h1>
          <p className="text-sm text-base-content/60 mt-1">{total} empleados registrados</p>
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
        <p className="text-center text-base-content/60 mt-10">Cargando...</p>
      ) : employees.length === 0 ? (
        <p className="text-center text-base-content/60 mt-10">No se encontraron empleados</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {employees.map((emp) => (
              <Card key={emp.id} className="flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-base-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {emp.profile_image ? (
                      <img src={emp.profile_image} alt={emp.first_name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={24} className="text-base-content/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base-content">
                      {emp.first_name} {emp.last_name}
                    </h3>
                    <p className="text-xs text-base-content/60">{emp.department}</p>
                  </div>
                  <Badge variant={getStatusVariant(emp.status)}>{emp.status}</Badge>
                </div>

                <div className="text-sm text-base-content/80 space-y-1 mb-3">
                  <p>DNI: {emp.dni}</p>
                  <p>{emp.email}</p>
                </div>

                {isAdminOrMod && (
                  <div className="flex gap-2 mt-auto pt-3 border-t border-base-300">
                    {emp.status === 'Inactivo' ? (
                      isAdmin && (
                        <Button
                          onClick={() => { setReactivateId(emp.id); setReactivateName(`${emp.first_name} ${emp.last_name}`); }}
                          variant="primary"
                          size="sm"
                          className="flex-1 flex items-center justify-center gap-1"
                        >
                          <RotateCcw size={14} /> Reactivar
                        </Button>
                      )
                    ) : (
                      <>
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
                      </>
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
              <span className="text-sm text-base-content/60">
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
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-base-content">Nombre {formErrors.first_name && <span className="text-error">*</span>}</label>
            <input className="input input-bordered w-full" value={form.first_name} onChange={(e) => updateField('first_name', e.target.value)} />
            {formErrors.first_name && <p className="mt-1 text-xs text-error">{formErrors.first_name}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-base-content">Apellidos {formErrors.last_name && <span className="text-error">*</span>}</label>
            <input className="input input-bordered w-full" value={form.last_name} onChange={(e) => updateField('last_name', e.target.value)} />
            {formErrors.last_name && <p className="mt-1 text-xs text-error">{formErrors.last_name}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-base-content">Email {formErrors.email && <span className="text-error">*</span>}</label>
            <input type="email" className="input input-bordered w-full" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
            {formErrors.email && <p className="mt-1 text-xs text-error">{formErrors.email}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-base-content">Teléfono</label>
            <input className="input input-bordered w-full" value={form.phone || ''} onChange={(e) => updateField('phone', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-base-content">DNI {formErrors.dni && <span className="text-error">*</span>}</label>
            <input className="input input-bordered w-full" value={form.dni} onChange={(e) => updateField('dni', e.target.value)} />
            {formErrors.dni && <p className="mt-1 text-xs text-error">{formErrors.dni}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-base-content">Fecha de nacimiento</label>
            <input type="date" className="input input-bordered w-full" value={form.birth_date || ''} onChange={(e) => updateField('birth_date', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-base-content">Dirección</label>
            <input className="input input-bordered w-full" value={form.address || ''} onChange={(e) => updateField('address', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-base-content">Género</label>
            <select className="select select-bordered w-full" value={form.gender || ''} onChange={(e) => updateField('gender', e.target.value)}>
              <option value="">Seleccionar...</option>
              {Object.values(Gender).map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-base-content">Estado civil</label>
            <select className="select select-bordered w-full" value={form.marital_status || ''} onChange={(e) => updateField('marital_status', e.target.value)}>
              <option value="">Seleccionar...</option>
              {Object.values(MaritalStatus).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Company Info */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-base-content">Departamento {formErrors.department && <span className="text-error">*</span>}</label>
            <select className="select select-bordered w-full" value={form.department} onChange={(e) => updateField('department', e.target.value)}>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {formErrors.department && <p className="mt-1 text-xs text-error">{formErrors.department}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-base-content">Rol {formErrors.role && <span className="text-error">*</span>}</label>
            <select className="select select-bordered w-full" value={form.role} onChange={(e) => updateField('role', e.target.value)}>
              {Object.values(Role).map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {formErrors.role && <p className="mt-1 text-xs text-error">{formErrors.role}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-base-content">Fecha de contratación {formErrors.hire_date && <span className="text-error">*</span>}</label>
            <input type="date" className="input input-bordered w-full" value={form.hire_date} onChange={(e) => updateField('hire_date', e.target.value)} />
            {formErrors.hire_date && <p className="mt-1 text-xs text-error">{formErrors.hire_date}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-base-content">Contacto de emergencia</label>
            <input className="input input-bordered w-full" value={form.emergency_contact || ''} onChange={(e) => updateField('emergency_contact', e.target.value)} />
          </div>
          {editingId && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-base-content">Días de vacaciones personalizados</label>
              <input
                type="number"
                min={1}
                max={365}
                className="input input-bordered w-full"
                value={customVacationDays}
                placeholder="Usar valor por defecto de la organización"
                onChange={(e) => {
                  setCustomVacationDays(e.target.value);
                  setFormErrors((prev) => ({ ...prev, custom_vacation_days: '' }));
                }}
              />
              <p className="text-xs text-base-content/60 mt-1">Dejar vacío para usar el valor por defecto de la organización</p>
              {formErrors.custom_vacation_days && (
                <p className="text-error text-xs mt-1">{formErrors.custom_vacation_days}</p>
              )}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-base-content">URL imagen de perfil</label>
            <input className="input input-bordered w-full" value={form.profile_image || ''} onChange={(e) => updateField('profile_image', e.target.value)} />
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
        <p className="text-base-content/80">
          ¿Está seguro de que desea eliminar a {deleteName}? Esta acción desactivará al empleado y rechazará sus solicitudes de vacaciones pendientes.
        </p>
      </Modal>

      {/* Reactivate Confirmation */}
      <Modal
        isOpen={!!reactivateId}
        onClose={() => setReactivateId(null)}
        title="Reactivar empleado"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setReactivateId(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              loading={reactivating}
              onClick={handleReactivate}
            >
              {reactivating ? 'Reactivando...' : 'Reactivar'}
            </Button>
          </div>
        }
      >
        <p className="text-base-content/80">
          ¿Está seguro de que desea reactivar a {reactivateName}? El empleado podrá volver a iniciar sesión y acceder al sistema.
        </p>
      </Modal>
    </div>
  );
}
