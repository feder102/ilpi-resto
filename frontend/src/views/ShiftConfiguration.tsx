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

  const shiftTypeLabels: Record<string, string> = {
    MAÑANA: 'Mañana',
    NOCHE: 'Noche',
    CORTADO: 'Cortado',
    CORRIDO: 'Corrido',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Configuración de Turnos
          </h1>
          <p className="text-gray-600 mt-1">
            Define los horarios predefinidos para los turnos de tu cocina
          </p>
        </div>
        <button
          onClick={() => {
            setEditingShift(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nuevo Turno
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-600 hover:text-red-800 font-semibold"
          >
            Descartar
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}

      {/* Shift Types Table */}
      {!loading && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {shiftTypes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No hay turnos configurados
              </p>
              <p className="text-gray-400 text-sm">
                Crea tu primer turno haciendo clic en "Nuevo Turno"
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Horarios
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Horas
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {shiftTypes.map((shift) => (
                  <tr key={shift.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {shift.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                        {shiftTypeLabels[shift.type]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="space-y-1">
                        {shift.time_windows.map((window, idx) => (
                          <div key={idx} className="font-mono">
                            {window.start} - {window.end}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-semibold">
                      {shift.total_hours}h
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {shift.is_active ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                          Activo
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-semibold">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm space-x-2">
                      <button
                        onClick={() => {
                          setEditingShift(shift);
                          setShowForm(true);
                        }}
                        disabled={deleting === shift.id}
                        className="inline-flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                      >
                        <Edit2 className="w-4 h-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(shift.id)}
                        disabled={deleting === shift.id}
                        className="inline-flex items-center gap-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
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
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && shiftTypes.length > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Mostrando {shiftTypes.length} de {total} turnos
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="px-3 py-1 text-sm">Página {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={shiftTypes.length < 20}
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
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
