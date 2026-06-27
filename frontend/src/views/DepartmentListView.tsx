// T033/T034/T044-T057: DepartmentListView — ABM de departamentos, admin-only (Feature 014)
import { useState, useEffect, useCallback } from 'react';
import * as LucideIcons from 'lucide-react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button, Card, Modal, Alert, Badge } from '../components/ui';
import departmentService, {
  type DepartmentCreatePayload,
  type DepartmentUpdatePayload,
  type DepartmentDeletePreview as DeletePreview,
} from '../services/departmentService';
import { useDepartments } from '../hooks/useDepartments';
import { DEPARTMENT_COLOR_PALETTE, DEPARTMENT_ICON_CATALOG } from '../config/constants';
import type { Department } from '../types/models';

type IconName = keyof typeof LucideIcons;

function DeptIcon({ name, size = 18 }: { name: string; size?: number }) {
  const IconComp = LucideIcons[name as IconName] as React.ComponentType<{ size?: number }> | undefined;
  const Fallback = LucideIcons['Building2'] as React.ComponentType<{ size?: number }>;
  return IconComp ? <IconComp size={size} /> : <Fallback size={size} />;
}

interface DeptForm {
  name: string;
  description: string;
  color: string;
  icon: string;
  is_active: boolean;
}

const INITIAL_FORM: DeptForm = {
  name: '',
  description: '',
  color: '#6b7280',
  icon: 'Building2',
  is_active: true,
};

export default function DepartmentListView() {
  const { refresh: refreshContext } = useDepartments();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [form, setForm] = useState<DeptForm>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deletePreview, setDeletePreview] = useState<DeletePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    setToast({ message, variant });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await departmentService.getDepartments({ includeInactive: showInactive });
      setDepartments(res.items);
    } catch {
      setError('Error al cargar departamentos');
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditTarget(dept);
    setForm({
      name: dept.name,
      description: dept.description ?? '',
      color: dept.color,
      icon: dept.icon,
      is_active: dept.isActive,
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Requerido';
    if (form.name.trim().length > 60) errs.name = 'Máximo 60 caracteres';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    setFormErrors({});
    try {
      if (editTarget) {
        const payload: DepartmentUpdatePayload = {
          name: form.name.trim(),
          description: form.description.trim() || null,
          color: form.color,
          icon: form.icon,
          is_active: form.is_active,
        };
        await departmentService.updateDepartment(editTarget.id, payload);
        showToast('Departamento actualizado correctamente');
      } else {
        const payload: DepartmentCreatePayload = {
          name: form.name.trim(),
          description: form.description.trim() || null,
          color: form.color,
          icon: form.icon,
        };
        await departmentService.createDepartment(payload);
        showToast('Departamento creado correctamente');
      }
      setFormOpen(false);
      await fetchDepartments();
      await refreshContext();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { code?: string; message?: string } } } };
      const code = axiosErr.response?.data?.error?.code;
      const msg = axiosErr.response?.data?.error?.message || 'Error al guardar';
      if (code === 'DUPLICATE_NAME' || code === 'CONFLICT') {
        setFormErrors({ name: 'Ya existe un departamento con ese nombre' });
      } else {
        setFormErrors({ _general: msg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (dept: Department) => {
    try {
      await departmentService.updateDepartment(dept.id, { is_active: !dept.isActive });
      showToast(dept.isActive ? 'Departamento desactivado' : 'Departamento activado');
      await fetchDepartments();
      await refreshContext();
    } catch {
      showToast('Error al actualizar el departamento', 'error');
    }
  };

  const openDeletePreview = async (dept: Department) => {
    setDeleteTarget(dept);
    setDeletePreview(null);
    setPreviewLoading(true);
    try {
      const preview = await departmentService.getDeletePreview(dept.id);
      setDeletePreview(preview);
    } catch {
      showToast('Error al cargar la vista previa', 'error');
      setDeleteTarget(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await departmentService.deleteDepartment(deleteTarget.id);
      const summary = `${result.employees_reassigned} empleados y ${result.teams_reassigned} equipos reasignados a "${result.target_department.name}"`;
      showToast(`Departamento eliminado. ${summary}`);
      setDeleteTarget(null);
      setDeletePreview(null);
      await fetchDepartments();
      await refreshContext();
    } catch {
      showToast('Error al eliminar el departamento', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const updateField = <K extends keyof DeptForm>(field: K, value: DeptForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 w-80">
          <Alert variant={toast.variant} message={toast.message} />
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-base-content m-0">Departamentos</h1>
          <p className="text-sm text-base-content/60 mt-1">{departments.length} departamentos</p>
        </div>
        <Button onClick={openCreate} variant="primary" className="flex items-center gap-2">
          <Plus size={18} /> Nuevo Departamento
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <input
          id="show-inactive"
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
        />
        <label htmlFor="show-inactive" className="text-sm text-base-content/70 cursor-pointer select-none">
          Mostrar inactivos
        </label>
      </div>

      {error && <Alert variant="error" message={error} className="mb-4" />}

      {loading ? (
        <p className="text-center text-base-content/60 mt-10">Cargando...</p>
      ) : departments.length === 0 ? (
        <p className="text-center text-base-content/60 mt-10">No hay departamentos</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <Card key={dept.id} className={`flex flex-col ${!dept.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
                  style={{ backgroundColor: dept.color }}
                >
                  <DeptIcon name={dept.icon} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-base-content">{dept.name}</h3>
                    {dept.isSystem && <Badge variant="info">Sistema</Badge>}
                    {!dept.isActive && <Badge variant="neutral">Inactivo</Badge>}
                  </div>
                  {dept.description && (
                    <p className="text-xs text-base-content/60 truncate">{dept.description}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-4 text-xs text-base-content/60 mb-3">
                <span>{dept.employeeCount ?? 0} empleados</span>
                <span>{dept.teamCount ?? 0} equipos</span>
              </div>

              {!dept.isSystem && (
                <div className="flex gap-2 mt-auto pt-3 border-t border-base-300">
                  <Button
                    onClick={() => openEdit(dept)}
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Edit2 size={14} /> Editar
                  </Button>
                  <Button
                    onClick={() => handleToggleActive(dept)}
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-1"
                    title={dept.isActive ? 'Desactivar' : 'Activar'}
                  >
                    {dept.isActive
                      ? <><ToggleRight size={14} /> Desactivar</>
                      : <><ToggleLeft size={14} /> Activar</>}
                  </Button>
                  {dept.isActive && (
                    <Button
                      onClick={() => openDeletePreview(dept)}
                      variant="danger"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Trash2 size={14} /> Eliminar
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? 'Editar Departamento' : 'Nuevo Departamento'}
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={submitting} onClick={handleSubmit}>
              {submitting ? 'Guardando...' : editTarget ? 'Guardar cambios' : 'Crear departamento'}
            </Button>
          </div>
        }
      >
        {formErrors._general && (
          <Alert variant="error" message={formErrors._general} className="mb-4" />
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-base-content">
              Nombre {formErrors.name && <span className="text-error">*</span>}
            </label>
            <input
              className="input input-bordered w-full"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              disabled={editTarget?.isSystem}
              maxLength={60}
            />
            {formErrors.name && <p className="text-error text-xs mt-1">{formErrors.name}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-base-content">Descripción</label>
            <textarea
              className="textarea textarea-bordered w-full"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={2}
              maxLength={255}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-base-content">Color</label>
            <div className="flex flex-wrap gap-2">
              {DEPARTMENT_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => updateField('color', c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    form.color === c ? 'border-base-content scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-base-content">Icono</label>
            <div className="flex flex-wrap gap-2">
              {DEPARTMENT_ICON_CATALOG.map((iconName) => (
                <button
                  key={iconName}
                  type="button"
                  title={iconName}
                  onClick={() => updateField('icon', iconName)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors ${
                    form.icon === iconName
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-base-300 bg-base-100 text-base-content/60 hover:border-primary/50'
                  }`}
                >
                  <DeptIcon name={iconName} size={18} />
                </button>
              ))}
            </div>
          </div>

          {editTarget && !editTarget.isSystem && (
            <div className="flex items-center gap-2">
              <input
                id="dept-active"
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={form.is_active}
                onChange={(e) => updateField('is_active', e.target.checked)}
              />
              <label htmlFor="dept-active" className="text-sm text-base-content cursor-pointer">
                Departamento activo
              </label>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Preview Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeletePreview(null); }}
        title="Eliminar departamento"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => { setDeleteTarget(null); setDeletePreview(null); }}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              disabled={previewLoading || !deletePreview}
              onClick={handleDelete}
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        }
      >
        {previewLoading ? (
          <p className="text-base-content/60">Consultando datos afectados...</p>
        ) : deletePreview ? (
          <div className="flex flex-col gap-3">
            <p className="text-base-content/80">
              ¿Deseas eliminar el departamento{' '}
              <strong>{deletePreview.department.name}</strong>?
            </p>
            <div className="alert alert-warning">
              <p className="text-sm">
                Se reasignarán{' '}
                <strong>{deletePreview.employees_to_reassign} empleados</strong> y{' '}
                <strong>{deletePreview.teams_to_reassign} equipos</strong> al departamento{' '}
                <strong>"{deletePreview.target_department.name}"</strong>.
                Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
