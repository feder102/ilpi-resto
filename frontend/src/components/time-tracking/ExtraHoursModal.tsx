/**
 * ExtraHoursModal - Feature 010
 * Allows Admin/Moderador to register extra (overtime) hours for an employee.
 * Extra hours are stored as a separate category (source="extra").
 */

import React, { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Alert from "../ui/Alert";
import { createExtraHours } from "../../services/statisticsService";
import { getEmployees } from "../../services/employeeService";
import type { Employee } from "../../types/models";

interface ExtraHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const todayISO = () => new Date().toISOString().split("T")[0];

export const ExtraHoursModal: React.FC<ExtraHoursModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [workDate, setWorkDate] = useState(todayISO());
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset the form whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSearchResults([]);
      setShowDropdown(false);
      setSelectedEmployee(null);
      setWorkDate(todayISO());
      setHours("");
      setNote("");
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  // Search employees by name or DNI
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
    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
      setError("Las horas deben ser mayores que 0 y como máximo 24");
      return;
    }

    setSubmitting(true);
    try {
      await createExtraHours({
        employee_id: selectedEmployee.id,
        work_date: workDate,
        hours: hoursNum,
        note: note.trim() || undefined,
      });
      setSuccess(
        `Se cargaron ${hoursNum} horas extra a ${selectedEmployee.first_name} ${selectedEmployee.last_name}`
      );
      onSuccess?.();
      // Reset for a potential next entry
      setHours("");
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar horas extra");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cargar horas extra"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cerrar
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Cargando..." : "Cargar horas extra"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <Alert variant="error" message={error} />}
        {success && <Alert variant="success" message={success} />}

        {/* Employee search */}
        <div className="relative">
          <label className="block text-sm font-medium text-base-content mb-1">Empleado</label>
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
                    <span className="font-medium">{emp.first_name} {emp.last_name}</span>
                    <span className="text-base-content/60 text-sm ml-2">DNI {emp.dni}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Date */}
        <div>
          <label htmlFor="extra-date" className="block text-sm font-medium text-base-content mb-1">
            Fecha
          </label>
          <input
            id="extra-date"
            type="date"
            className="input input-bordered w-full"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
          />
        </div>

        {/* Hours */}
        <div>
          <label htmlFor="extra-hours" className="block text-sm font-medium text-base-content mb-1">
            Horas extra
          </label>
          <input
            id="extra-hours"
            type="number"
            className="input input-bordered w-full"
            placeholder="Ej: 2.5"
            min={0.25}
            max={24}
            step={0.25}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </div>

        {/* Note */}
        <div>
          <label htmlFor="extra-note" className="block text-sm font-medium text-base-content mb-1">
            Motivo (opcional)
          </label>
          <input
            id="extra-note"
            type="text"
            className="input input-bordered w-full"
            placeholder="Ej: Cobertura por ausencia"
            maxLength={255}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
};

export default ExtraHoursModal;
