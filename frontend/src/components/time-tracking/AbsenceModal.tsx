/**
 * AbsenceModal - Register an absence for an employee on a day with an assigned shift.
 * Admin/Moderador only. Validates shift assignment on the backend.
 */

import React, { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Alert from "../ui/Alert";
import { createAbsence } from "../../services/statisticsService";
import { getEmployees } from "../../services/employeeService";
import type { Employee } from "../../types/models";

interface AbsenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const todayISO = () => new Date().toISOString().split("T")[0];

export const AbsenceModal: React.FC<AbsenceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [absenceDate, setAbsenceDate] = useState(todayISO());
  const [justified, setJustified] = useState(false);
  const [reason, setReason] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSearchResults([]);
      setShowDropdown(false);
      setSelectedEmployee(null);
      setAbsenceDate(todayISO());
      setJustified(false);
      setReason("");
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2 && !selectedEmployee) {
        const fetchEmployees = async () => {
          try {
            const result = await getEmployees({ search: searchQuery, size: 10 });
            setSearchResults(result.items);
            setShowDropdown(true);
          } catch (err) {
            console.error("Search error:", err);
          }
        };
        fetchEmployees();
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedEmployee]);

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setSearchQuery(`${emp.first_name} ${emp.last_name}`);
    setShowDropdown(false);
  };

  const handleClearEmployee = () => {
    setSelectedEmployee(null);
    setSearchQuery("");
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!selectedEmployee) {
      setError("Selecciona un empleado");
      return;
    }
    if (!absenceDate) {
      setError("Selecciona una fecha");
      return;
    }

    setSubmitting(true);
    try {
      await createAbsence({
        employee_id: selectedEmployee.id,
        date: absenceDate,
        justified,
        reason: reason.trim() || undefined,
      });
      setSuccess(
        `Ausencia ${justified ? "justificada" : "injustificada"} cargada para ${selectedEmployee.first_name} ${selectedEmployee.last_name}`
      );
      onSuccess?.();
      setReason("");
      setJustified(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar la ausencia"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cargar ausencia"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cerrar
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Cargando..." : "Cargar ausencia"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <Alert variant="error" message={error} />}
        {success && <Alert variant="success" message={success} />}

        {/* Employee search */}
        <div className="relative">
          <label className="block text-sm font-medium text-base-content mb-1">
            Empleado
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
            <input
              type="text"
              className="input input-bordered w-full pl-9 pr-9"
              placeholder="Buscar por nombre o DNI..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (selectedEmployee) setSelectedEmployee(null);
              }}
              disabled={submitting}
            />
            {selectedEmployee && (
              <button
                type="button"
                onClick={handleClearEmployee}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                aria-label="Limpiar empleado"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {showDropdown && searchResults.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-48 overflow-auto">
              {searchResults.map((emp) => (
                <li key={emp.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-base-200"
                    onClick={() => handleSelectEmployee(emp)}
                  >
                    <span className="font-medium">
                      {emp.first_name} {emp.last_name}
                    </span>
                    <span className="text-base-content/60 text-sm ml-2">
                      DNI {emp.dni}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Date */}
        <div>
          <label
            htmlFor="absence-date"
            className="block text-sm font-medium text-base-content mb-1"
          >
            Fecha de ausencia
          </label>
          <input
            id="absence-date"
            type="date"
            className="input input-bordered w-full"
            value={absenceDate}
            onChange={(e) => setAbsenceDate(e.target.value)}
            disabled={submitting}
          />
        </div>

        {/* Justified toggle */}
        <div className="flex items-center gap-3">
          <input
            id="absence-justified"
            type="checkbox"
            className="toggle toggle-success"
            checked={justified}
            onChange={(e) => setJustified(e.target.checked)}
            disabled={submitting}
          />
          <label
            htmlFor="absence-justified"
            className="text-sm font-medium text-base-content cursor-pointer"
          >
            Justificada
          </label>
          <span className="text-xs text-base-content/50">
            {justified ? "Con justificación" : "Sin justificación"}
          </span>
        </div>

        {/* Reason */}
        <div>
          <label
            htmlFor="absence-reason"
            className="block text-sm font-medium text-base-content mb-1"
          >
            Motivo (opcional)
          </label>
          <input
            id="absence-reason"
            type="text"
            className="input input-bordered w-full"
            placeholder="Ej: Baja médica, asunto personal..."
            maxLength={255}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={submitting}
          />
        </div>
      </div>
    </Modal>
  );
};

export default AbsenceModal;
