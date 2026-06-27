/**
 * T060: Shift Assignment View - Feature 006 US3
 *
 * Main view for moderators to assign shifts to employees.
 * Provides a form to select employee, date, and shift type.
 * Shows validation errors and success confirmations.
 *
 * Features:
 * - Employee dropdown (department roster)
 * - Date picker with weekend blocking
 * - Shift type selector
 * - Conflict detection (vacation, duplicate shifts)
 * - Error handling with user-friendly messages
 * - Success feedback with shift summary
 */

import { useState, useEffect } from 'react';
import { moderatorService } from '../services/moderatorService';
import { shiftTypesApi } from '../services/shiftTypesApi';
import { extractErrorMessage } from '../utils/errorHandler';
import ShiftAssignmentForm from '../components/moderator/ShiftAssignmentForm';

interface Employee {
  id: string;
  name: string;
}

interface ShiftType {
  id: string;
  name: string;
}

interface AssignmentResult {
  id: string;
  employee_name: string;
  date: string;
  shift_type_name: string;
}

export default function ShiftAssignment() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [successDetails, setSuccessDetails] = useState<AssignmentResult | null>(null);

  /**
   * Fetch roster data to populate employee dropdown
   */
  useEffect(() => {
    fetchRosterData();
  }, []);

  const fetchRosterData = async () => {
    setIsLoadingData(true);
    setError(null);
    try {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const [roster, shiftTypesData] = await Promise.all([
        moderatorService.getRoster(year, month),
        shiftTypesApi.list(1, 100),
      ]);

      // Extract unique employees from roster
      const uniqueEmployees = Array.from(
        new Map(
          roster.shifts.map(shift => [shift.employee_id, shift])
        ).values()
      ).map(shift => ({
        id: shift.employee_id,
        name: shift.employee_name,
      }));

      setEmployees(uniqueEmployees);

      // Use active shift types from API (not from roster, which may contain soft-deleted types)
      setShiftTypes(shiftTypesData.items.map(st => ({ id: st.id, name: st.name })));
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(`No se pudieron cargar los datos: ${errorMessage}`);
    } finally {
      setIsLoadingData(false);
    }
  };

  /**
   * Handle form submission (returns Promise so form can wait for completion)
   */
  const handleAssign = async (
    employeeId: string,
    date: string,
    shiftTypeId: string
  ): Promise<void> => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await moderatorService.assignShift(employeeId, date, shiftTypeId);

      // Find employee and shift type for success message
      const employee = employees.find(e => e.id === employeeId);
      const shiftType = shiftTypes.find(st => st.id === shiftTypeId);

      setSuccessDetails({
        id: result.id,
        employee_name: employee?.name || result.employee_name,
        date: result.date,
        shift_type_name: shiftType?.name || result.shift_type_name,
      });

      setSuccessMessage(
        `Turno asignado exitosamente a ${employee?.name} el ${new Date(date).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })}`
      );
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
      throw err; // Re-throw so form knows submission failed
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-base-content">Asignar Turnos</h1>
          <p className="text-base-content/60 mt-1">
            Asigna turnos a los miembros de tu equipo
          </p>
        </div>

        {/* Main Content */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            {/* Error Alert */}
            {error && (
              <div className="alert alert-error mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="text-xl">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium">Error</h3>
                    <p className="mt-2 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Alert */}
            {successMessage && successDetails && (
              <div className="alert alert-success mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="text-xl">✓</span>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium">Éxito</h3>
                    <p className="mt-2 text-sm">{successMessage}</p>
                    <div className="mt-3 text-sm bg-base-100 rounded p-3 border border-success/20">
                      <p className="text-base-content/80">
                        <strong>Empleado:</strong> {successDetails.employee_name}
                      </p>
                      <p className="text-base-content/80">
                        <strong>Fecha:</strong> {new Date(successDetails.date).toLocaleDateString('es-ES')}
                      </p>
                      <p className="text-base-content/80">
                        <strong>Turno:</strong> {successDetails.shift_type_name}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoadingData ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-center">
                  <span className="loading loading-spinner loading-lg text-primary mb-2"></span>
                  <p className="text-base-content/60 text-sm">Cargando datos...</p>
                </div>
              </div>
            ) : (
              <ShiftAssignmentForm
                employees={employees}
                shiftTypes={shiftTypes}
                isSubmitting={isSubmitting}
                onSubmit={handleAssign}
              />
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 card bg-info/10">
          <div className="card-body">
            <h3 className="font-semibold text-info-content mb-3">Instrucciones</h3>
            <ul className="text-sm text-info-content/80 space-y-2">
              <li>• Selecciona el empleado de tu equipo</li>
              <li>• Elige la fecha del turno (no se permiten fines de semana)</li>
              <li>• Selecciona el tipo de turno (Mañana, Noche, Cortado, Corrido)</li>
              <li>• El sistema detecta automáticamente conflictos de vacaciones</li>
              <li>• No se pueden asignar dos turnos al mismo empleado en la misma fecha</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
