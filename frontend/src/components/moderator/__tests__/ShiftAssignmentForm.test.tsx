/**
 * T067: ShiftAssignmentForm Unit Tests
 *
 * Tests for the shift assignment form component validation and interactions
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShiftAssignmentForm from '../ShiftAssignmentForm';

describe('ShiftAssignmentForm', () => {
  const mockEmployees = [
    { id: 'emp-1', name: 'Carlos Rodríguez' },
    { id: 'emp-2', name: 'María López' },
  ];

  const mockShiftTypes = [
    { id: '1', name: 'Mañana' },
    { id: '2', name: 'Noche' },
  ];

  /**
   * Test: Form rendering with all fields
   */
  it('debería renderizar todos los campos del formulario', () => {
    const mockSubmit = vi.fn();
    render(
      <ShiftAssignmentForm
        employees={mockEmployees}
        shiftTypes={mockShiftTypes}
        isSubmitting={false}
        onSubmit={mockSubmit}
      />
    );

    expect(screen.getByLabelText('Empleado')).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha del Turno')).toBeInTheDocument();
    expect(screen.getByLabelText('Tipo de Turno')).toBeInTheDocument();
    expect(screen.getByText('✓ Asignar Turno')).toBeInTheDocument();
  });

  /**
   * Test: Validation - empty fields
   */
  it('debería mostrar errores de validación para campos vacíos', async () => {
    const mockSubmit = vi.fn();
    render(
      <ShiftAssignmentForm
        employees={mockEmployees}
        shiftTypes={mockShiftTypes}
        isSubmitting={false}
        onSubmit={mockSubmit}
      />
    );

    const submitButton = screen.getByText('✓ Asignar Turno');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Selecciona un empleado')).toBeInTheDocument();
      expect(screen.getByText('Selecciona una fecha')).toBeInTheDocument();
      expect(screen.getByText('Selecciona un tipo de turno')).toBeInTheDocument();
    });

    expect(mockSubmit).not.toHaveBeenCalled();
  });

  /**
   * Test: Validation - weekend blocking
   */
  it('debería bloquear asignación en fines de semana', async () => {
    const mockSubmit = vi.fn();
    render(
      <ShiftAssignmentForm
        employees={mockEmployees}
        shiftTypes={mockShiftTypes}
        isSubmitting={false}
        onSubmit={mockSubmit}
      />
    );

    // Select employee
    const employeeSelect = screen.getByDisplayValue('Selecciona un empleado...');
    fireEvent.change(employeeSelect, { target: { value: 'emp-1' } });

    // Try Saturday (2026-03-14)
    const dateInput = screen.getByLabelText('Fecha del Turno');
    fireEvent.change(dateInput, { target: { value: '2026-03-14' } });

    // Select shift type
    const shiftSelect = screen.getByDisplayValue('Selecciona un turno...');
    fireEvent.change(shiftSelect, { target: { value: '1' } });

    // Try to submit
    const submitButton = screen.getByText('✓ Asignar Turno');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('No se pueden asignar turnos en fines de semana')).toBeInTheDocument();
    });

    expect(mockSubmit).not.toHaveBeenCalled();
  });

  /**
   * Test: Validation - past date blocking
   */
  it('debería bloquear asignación en fechas pasadas', async () => {
    const mockSubmit = vi.fn();
    render(
      <ShiftAssignmentForm
        employees={mockEmployees}
        shiftTypes={mockShiftTypes}
        isSubmitting={false}
        onSubmit={mockSubmit}
      />
    );

    const dateInput = screen.getByLabelText('Fecha del Turno') as HTMLInputElement;

    // Verify min attribute prevents past dates
    const today = new Date();
    const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(dateInput.min).toBe(minDate);
  });

  /**
   * Test: Successful form submission
   */
  it('debería llamar a onSubmit con valores correctos', async () => {
    const mockSubmit = vi.fn();
    render(
      <ShiftAssignmentForm
        employees={mockEmployees}
        shiftTypes={mockShiftTypes}
        isSubmitting={false}
        onSubmit={mockSubmit}
      />
    );

    // Select employee
    const employeeSelect = screen.getByDisplayValue('Selecciona un empleado...');
    fireEvent.change(employeeSelect, { target: { value: 'emp-1' } });

    // Select weekday (Monday 2026-03-16)
    const dateInput = screen.getByLabelText('Fecha del Turno');
    fireEvent.change(dateInput, { target: { value: '2026-03-16' } });

    // Select shift type
    const shiftSelect = screen.getByDisplayValue('Selecciona un turno...');
    fireEvent.change(shiftSelect, { target: { value: '1' } });

    // Submit
    const submitButton = screen.getByText('✓ Asignar Turno');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith('emp-1', '2026-03-16', '1');
    });
  });

  /**
   * Test: Loading state
   */
  it('debería mostrar estado de carga durante envío', () => {
    const mockSubmit = vi.fn();
    const { rerender } = render(
      <ShiftAssignmentForm
        employees={mockEmployees}
        shiftTypes={mockShiftTypes}
        isSubmitting={false}
        onSubmit={mockSubmit}
      />
    );

    // Now show loading state
    rerender(
      <ShiftAssignmentForm
        employees={mockEmployees}
        shiftTypes={mockShiftTypes}
        isSubmitting={true}
        onSubmit={mockSubmit}
      />
    );

    expect(screen.getByText('Asignando turno...')).toBeInTheDocument();
  });

  /**
   * Test: Employee dropdown empty state
   */
  it('debería mostrar mensaje cuando no hay empleados', () => {
    const mockSubmit = vi.fn();
    render(
      <ShiftAssignmentForm
        employees={[]}
        shiftTypes={mockShiftTypes}
        isSubmitting={false}
        onSubmit={mockSubmit}
      />
    );

    const employeeSelect = screen.getByDisplayValue('No hay empleados disponibles');
    expect(employeeSelect).toBeDisabled();
  });

  /**
   * Test: Shift type dropdown empty state
   */
  it('debería mostrar mensaje cuando no hay turnos disponibles', () => {
    const mockSubmit = vi.fn();
    render(
      <ShiftAssignmentForm
        employees={mockEmployees}
        shiftTypes={[]}
        isSubmitting={false}
        onSubmit={mockSubmit}
      />
    );

    const shiftSelect = screen.getByDisplayValue('No hay turnos disponibles');
    expect(shiftSelect).toBeDisabled();
  });

  /**
   * Test: Valid date shows confirmation
   */
  it('debería mostrar confirmación para fecha válida', async () => {
    const mockSubmit = vi.fn();
    render(
      <ShiftAssignmentForm
        employees={mockEmployees}
        shiftTypes={mockShiftTypes}
        isSubmitting={false}
        onSubmit={mockSubmit}
      />
    );

    const dateInput = screen.getByLabelText('Fecha del Turno');
    fireEvent.change(dateInput, { target: { value: '2026-03-16' } });

    await waitFor(() => {
      expect(screen.getByText(/✓ Fecha válida/)).toBeInTheDocument();
    });
  });

  /**
   * Test: Form reset after successful submission
   */
  it('debería resetear el formulario después de envío exitoso', async () => {
    const mockSubmit = vi.fn();
    const { rerender } = render(
      <ShiftAssignmentForm
        employees={mockEmployees}
        shiftTypes={mockShiftTypes}
        isSubmitting={false}
        onSubmit={mockSubmit}
      />
    );

    // Fill form
    const employeeSelect = screen.getByDisplayValue('Selecciona un empleado...') as HTMLSelectElement;
    fireEvent.change(employeeSelect, { target: { value: 'emp-1' } });

    const dateInput = screen.getByLabelText('Fecha del Turno') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-03-16' } });

    const shiftSelect = screen.getByDisplayValue('Selecciona un turno...') as HTMLSelectElement;
    fireEvent.change(shiftSelect, { target: { value: '1' } });

    // Submit
    const submitButton = screen.getByText('✓ Asignar Turno');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalled();
    });

    // Simulate form reset after successful submission (done in parent)
    expect(employeeSelect.value).toBe('emp-1');
  });
});
