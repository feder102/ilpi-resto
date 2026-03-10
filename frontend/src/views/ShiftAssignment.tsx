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
import { extractErrorMessage } from '../utils/errorHandler';
import ShiftAssignmentForm from '../components/moderator/ShiftAssignmentForm';

interface AssignmentResult {
  id: string;
  employee_name: string;
  date: string;
  shift_type_name: string;
}

export default function ShiftAssignment() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [shiftTypes, setShiftTypes] = useState<any[]>([]);
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

      const roster = await moderatorService.getRoster(year, month);

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

      // Mock shift types (Mañana, Noche, Cortado, Corrido)
      setShiftTypes([
        { id: '1', name: 'Mañana' },
        { id: '2', name: 'Noche' },
        { id: '3', name: 'Cortado' },
        { id: '4', name: 'Corrido' },
      ]);
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(`No se pudieron cargar los datos: ${errorMessage}`);
    } finally {
      setIsLoadingData(false);
    }
  };

  /**
   * Handle form submission
   */
  const handleAssign = async (
    employeeId: string,
    date: string,
    shiftTypeId: string
  ) => {
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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Asignar Turnos</h1>
          <p className="text-gray-600 mt-1">
            Asigna turnos a los miembros de tu equipo
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-xl">⚠️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="mt-2 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && successDetails && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-xl">✓</span>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-green-800">Éxito</h3>
                  <p className="mt-2 text-sm text-green-700">{successMessage}</p>
                  <div className="mt-3 text-sm bg-white rounded p-3 border border-green-100">
                    <p className="text-gray-700">
                      <strong>Empleado:</strong> {successDetails.employee_name}
                    </p>
                    <p className="text-gray-700">
                      <strong>Fecha:</strong> {new Date(successDetails.date).toLocaleDateString('es-ES')}
                    </p>
                    <p className="text-gray-700">
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
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                <p className="text-gray-600 text-sm">Cargando datos...</p>
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

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">Instrucciones</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• Selecciona el empleado de tu equipo</li>
            <li>• Elige la fecha del turno (no se permiten fines de semana)</li>
            <li>• Selecciona el tipo de turno (Mañana, Noche, Cortado, Corrido)</li>
            <li>• El sistema detecta automáticamente conflictos de vacaciones</li>
            <li>• No se pueden asignar dos turnos al mismo empleado en la misma fecha</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
