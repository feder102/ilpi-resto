/**
 * EmployeeColleagues - Display Colleagues Working Same Shifts
 * Feature: Employee Workspace Portal
 *
 * SECURITY ARCHITECTURE:
 * 1. Frontend: Wrapped in EmployeeRoute component (checks: authenticated + Empleado role + is_active=true)
 * 2. Backend: API endpoint requires require_role_and_active("Empleado") dependency
 * 3. RLS: Service layer filters to only colleagues in same shifts as current employee
 *
 * This component displays a list of colleagues working in the same shifts as the current user,
 * grouped by date and shift type. It handles loading, empty states, and errors gracefully.
 */

import { useEffect, useState } from 'react';
import { AlertCircle, Users } from 'lucide-react';
import { Card, Table, Alert, Spinner, Badge } from '../components/ui';
import apiClient from '../services/apiClient';

interface Colleague {
  employee_id: string;
  name: string;
  department: string;
  role: string;
}

interface ShiftWithColleagues {
  shift_date: string; // YYYY-MM-DD
  shift_type: string;
  colleagues: Colleague[];
}

interface ColleaguesResponse {
  shifts_with_colleagues: ShiftWithColleagues[];
}

/**
 * Format date to Spanish locale (DD/MM/YYYY)
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format shift type for display
 */
function formatShiftType(shiftType: string): string {
  const typeMap: Record<string, string> = {
    morning: 'Mañana',
    afternoon: 'Tarde',
    night: 'Noche',
    madrugada: 'Madrugada',
  };
  return typeMap[shiftType.toLowerCase()] || shiftType;
}

/**
 * Get department display name (handle cases where it's an enum code)
 */
function formatDepartment(dept: string): string {
  const deptMap: Record<string, string> = {
    cocina: 'Cocina',
    pasteleria: 'Pastelería',
    almacen: 'Almacén',
    recepcion: 'Recepción',
    limpieza: 'Limpieza',
  };
  return deptMap[dept.toLowerCase()] || dept;
}

/**
 * Get badge color based on department
 */
function getDepartmentBadgeColor(
  dept: string
): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  const colorMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
    cocina: 'info',
    pasteleria: 'success',
    almacen: 'warning',
    recepcion: 'neutral',
    limpieza: 'warning',
  };
  return colorMap[dept.toLowerCase()] || 'neutral';
}

export default function EmployeeColleagues() {
  const [data, setData] = useState<ShiftWithColleagues[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchColleagues = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get<ColleaguesResponse>('/employee/colleagues');
        setData(response.data.shifts_with_colleagues || []);
      } catch (err) {
        console.error('[EmployeeColleagues] Error fetching colleagues:', err);
        const message =
          err && typeof err === 'object' && 'response' in err
            ? (err as any).response?.data?.error?.message ||
              'No se pudieron cargar los compañeros de turno'
            : 'Error de conexión';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchColleagues();
  }, []);

  const handleDismissError = () => {
    setError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-base-content mb-2">
            Compañeros de Turno
          </h1>
          <p className="text-lg text-base-content/60 mb-8">
            Consulta quién trabaja contigo en cada turno
          </p>
          <Spinner size="lg" label="Cargando compañeros de turno..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-base-content flex items-center gap-2 mb-2">
            <Users className="w-8 h-8 text-primary" />
            Compañeros de Turno
          </h1>
          <p className="text-lg text-base-content/60">
            Consulta quién trabaja contigo en cada turno
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert
            variant="error"
            title="Error al cargar"
            message={error}
            onClose={handleDismissError}
            className="mb-6 animate-in fade-in"
          />
        )}

        {/* Empty State */}
        {!error && data.length === 0 && (
          <Card className="bg-info/10 border-2 border-info/30 p-8 text-center mb-8">
            <Users className="w-12 h-12 text-info mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-semibold text-base-content mb-2">
              Sin turnos programados
            </h2>
            <p className="text-base-content/60">
              No tienes turnos programados en los próximos días. Consulta tu calendario de turnos para más detalles.
            </p>
          </Card>
        )}

        {/* Colleagues Grouped by Shift */}
        {!error && data.length > 0 && (
          <div className="space-y-6">
            {data.map((shift, idx) => (
              <Card
                key={`${shift.shift_date}-${shift.shift_type}-${idx}`}
                className="border-l-4 border-l-primary"
              >
                {/* Shift Header */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-base-300">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm text-base-content/60 font-medium">
                        {formatDate(shift.shift_date)}
                      </p>
                      <h3 className="text-lg font-bold text-base-content">
                        Turno {formatShiftType(shift.shift_type)}
                      </h3>
                    </div>
                  </div>
                  <Badge variant="info">{shift.colleagues.length} compañeros</Badge>
                </div>

                {/* Colleagues Table */}
                {shift.colleagues.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <thead>
                        <tr>
                          <Table.Head className="font-semibold">Nombre</Table.Head>
                          <Table.Head className="font-semibold">Departamento</Table.Head>
                          <Table.Head className="font-semibold">Rol</Table.Head>
                        </tr>
                      </thead>
                      <tbody>
                        {shift.colleagues.map((colleague) => (
                          <Table.Row
                            key={colleague.employee_id}
                            className="hover:bg-base-200 transition"
                          >
                            <Table.Cell>
                              <div className="font-medium text-base-content">
                                {colleague.name}
                              </div>
                            </Table.Cell>
                            <Table.Cell>
                              <Badge variant={getDepartmentBadgeColor(colleague.department)}>
                                {formatDepartment(colleague.department)}
                              </Badge>
                            </Table.Cell>
                            <Table.Cell>
                              <span className="text-sm text-base-content/70 capitalize">
                                {colleague.role === 'Empleado'
                                  ? 'Empleado'
                                  : colleague.role === 'Moderador'
                                    ? 'Moderador'
                                    : 'Admin'}
                              </span>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-base-content/60 text-sm italic">
                    No hay compañeros programados para este turno
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Info Section */}
        <Card className="bg-warning/10 border-2 border-warning/30 p-6 mt-8">
          <h3 className="font-semibold text-warning mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Información
          </h3>
          <ul className="space-y-2 text-sm text-base-content/70">
            <li>
              • Esta lista muestra todos los compañeros que trabajan contigo en los mismos turnos
            </li>
            <li>• Los turnos se actualizan automáticamente según tu calendario</li>
            <li>
              • Solo puedes ver a compañeros que están activos en el sistema
            </li>
            <li>• Consulta tu calendario de turnos para más detalles</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
