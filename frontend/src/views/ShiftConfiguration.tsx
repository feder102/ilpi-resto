/**
 * T055: ShiftConfiguration Page
 * Admin UI for managing shift type configurations
 */

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Loader } from 'lucide-react';
import { ShiftTypeForm } from '../components/ShiftTypeForm';
import { shiftTypesApi } from '../services/shiftTypesApi';
import type {
  ShiftType,
  ShiftTypeCreate,
  ShiftTypeUpdate,
  PaginatedShiftTypes,
} from '../types/shift-types';

export function ShiftConfiguration() {
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftType | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Load shift types
  async function loadShiftTypes() {
    setLoading(true);
    setError(null);
    try {
      const data: PaginatedShiftTypes = await shiftTypesApi.list(page, 20);
      setShiftTypes(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar los turnos',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadShiftTypes();
  }, [page]);

  async function handleCreate(data: ShiftTypeCreate) {
    try {
      await shiftTypesApi.create(data);
      setShowForm(false);
      await loadShiftTypes();
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : 'Error al crear el turno',
      );
    }
  }

  async function handleUpdate(data: ShiftTypeUpdate) {
    if (!editingShift) return;
    try {
      await shiftTypesApi.update(editingShift.id, data);
      setEditingShift(null);
      await loadShiftTypes();
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : 'Error al actualizar el turno',
      );
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Está seguro de que desea eliminar este turno?')) {
      return;
    }
    setDeleting(id);
    try {
      await shiftTypesApi.delete(id);
      await loadShiftTypes();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al eliminar el turno',
      );
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-base-content">
            Configuración de Turnos
          </h1>
          <p className="text-base-content/60 mt-1">
            Define los horarios predefinidos para los turnos de tu cocina
          </p>
        </div>
        <button
          onClick={() => {
            setEditingShift(null);
            setShowForm(true);
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo Turno
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="btn btn-sm btn-ghost"
          >
            Descartar
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      )}

      {/* Shift Types Table */}
      {!loading && (
        <div className="card bg-base-100 shadow-sm overflow-hidden">
          {shiftTypes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-base-content/60 text-lg">
                No hay turnos configurados
              </p>
              <p className="text-base-content/40 text-sm">
                Crea tu primer turno haciendo clic en "Nuevo Turno"
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Horarios</th>
                    <th>Horas</th>
                    <th>Estado</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftTypes.map((shift) => (
                    <tr key={shift.id} className="hover">
                      <td className="font-medium text-base-content">
                        {shift.name}
                      </td>
                      <td>
                        <div className="space-y-1">
                          {shift.time_windows.map((window, idx) => (
                            <div key={idx} className="font-mono text-sm">
                              {window.start} - {window.end}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="font-semibold">
                        {shift.total_hours}h
                      </td>
                      <td>
                        {shift.is_active ? (
                          <span className="badge badge-success badge-sm">
                            Activo
                          </span>
                        ) : (
                          <span className="badge badge-neutral badge-sm">
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingShift(shift);
                            setShowForm(true);
                          }}
                          disabled={deleting === shift.id}
                          className="btn btn-ghost btn-sm text-primary"
                        >
                          <Edit2 className="w-4 h-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(shift.id)}
                          disabled={deleting === shift.id}
                          className="btn btn-ghost btn-sm text-error"
                        >
                          {deleting === shift.id ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          {deleting === shift.id ? 'Eliminando...' : 'Eliminar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && shiftTypes.length > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-base-content/60">
            Mostrando {shiftTypes.length} de {total} turnos
          </p>
          <div className="join">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="join-item btn btn-sm"
            >
              Anterior
            </button>
            <span className="join-item btn btn-sm btn-disabled">Página {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={shiftTypes.length < 20}
              className="join-item btn btn-sm"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Shift Type Form Modal */}
      {showForm && (
        <ShiftTypeForm
          shiftType={editingShift || undefined}
          onSubmit={async (data) => {
            if (editingShift) {
              await handleUpdate(data as ShiftTypeUpdate);
            } else {
              await handleCreate(data as ShiftTypeCreate);
            }
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingShift(null);
          }}
        />
      )}
    </div>
  );
}
