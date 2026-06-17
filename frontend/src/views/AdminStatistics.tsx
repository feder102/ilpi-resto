/**
 * AdminStatistics - Professional Time Tracking Analytics Dashboard
 * Features: Employee stats, department analytics, time entries, batch processing
 * Accessible to Admin and Moderador roles only
 *
 * Styled with daisyUI 5 dark luxury theme (gold/purple/navy palette)
 */

import React, { useState, useMemo } from "react";
import { Card, Button } from "../components/ui";
import Alert from "../components/ui/Alert";
import { BarChart3, Users, Clock, RefreshCw, ChevronDown, Plus, UserX } from "lucide-react";
import { EmployeeStatisticsCard } from "../components/time-tracking/EmployeeStatisticsCard";
import { DepartmentStatisticsCard } from "../components/time-tracking/DepartmentStatisticsCard";
import { TimeEntriesTable } from "../components/time-tracking/TimeEntriesTable";
import { ExtraHoursModal } from "../components/time-tracking/ExtraHoursModal";
import { AbsenceModal } from "../components/time-tracking/AbsenceModal";
import { triggerBatchProcess } from "../services/statisticsService";
import { useAuth } from "../hooks/useAuth";

interface AdminUser {
  id: string;
  role: "Admin" | "Moderador";
  tenant_id: string;
}

interface TabConfig {
  id: "employee" | "department" | "entries" | "batch";
  label: string;
  icon: React.ReactNode;
  description: string;
}

const TABS: TabConfig[] = [
  {
    id: "employee",
    label: "Estadísticas de Empleados",
    icon: <Users className="w-4 h-4" />,
    description: "Ver estadísticas de trabajo de empleados individuales",
  },
  {
    id: "department",
    label: "Estadísticas de Departamentos",
    icon: <BarChart3 className="w-4 h-4" />,
    description: "Análisis de rendimiento por departamento",
  },
  {
    id: "entries",
    label: "Registros de Tiempo",
    icon: <Clock className="w-4 h-4" />,
    description: "Registros detallados de entradas de tiempo",
  },
  {
    id: "batch",
    label: "Procesamiento por Lotes",
    icon: <RefreshCw className="w-4 h-4" />,
    description: "Generación manual de entradas de tiempo (Solo Admin)",
  },
];

export const AdminStatistics: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"employee" | "department" | "entries" | "batch">("employee");
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [extraModalOpen, setExtraModalOpen] = useState(false);
  const [absenceModalOpen, setAbsenceModalOpen] = useState(false);
  const [entriesRefreshKey, setEntriesRefreshKey] = useState(0);

  // Time Entries tab filter state
  const today = new Date().toISOString().split("T")[0];
  const monthAgoDefault = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [entriesStartDate, setEntriesStartDate] = useState(monthAgoDefault);
  const [entriesEndDate, setEntriesEndDate] = useState(today);
  const [entriesEmployee, setEntriesEmployee] = useState("");
  const [entriesDepartment, setEntriesDepartment] = useState("");

  const currentUser = useMemo<AdminUser | null>(() => {
    if (!user) return null;
    return {
      id: user.id,
      role: user.role as "Admin" | "Moderador",
      tenant_id: user.tenant_id,
    };
  }, [user]);

  const isAuthorized = currentUser && ["Admin", "Moderador"].includes(currentUser.role);
  const isAdmin = currentUser?.role === "Admin";

  const timeEntriesFilters = useMemo(() => ({
    start_date: entriesStartDate,
    end_date: entriesEndDate,
    employee_id: entriesEmployee || undefined,
    department: entriesDepartment || undefined,
  }), [entriesStartDate, entriesEndDate, entriesEmployee, entriesDepartment]);

  const handleBatchProcess = async () => {
    setBatchProcessing(true);
    setBatchMessage(null);
    setBatchError(null);

    try {
      const result = await triggerBatchProcess(batchDate);
      setBatchMessage(
        `✓ Se procesaron exitosamente ${result.estimated_entries} entradas de tiempo para ${batchDate}`
      );
    } catch (error) {
      setBatchError(
        error instanceof Error ? error.message : "Error al iniciar el procesamiento por lotes"
      );
    } finally {
      setBatchProcessing(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-base-200 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Alert
            variant="error"
            title="Acceso Denegado"
            message="No tienes permiso para acceder a esta página. Se requiere rol de Administrador o Moderador."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 py-8 px-4 sm:px-6 lg:px-8">
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-xl">
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-4xl font-bold text-base-content">Análisis de Seguimiento de Tiempo</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" className="btn-outline" onClick={() => setAbsenceModalOpen(true)}>
                <UserX className="w-4 h-4 mr-1" />
                Cargar ausencia
              </Button>
              <Button variant="primary" onClick={() => setExtraModalOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Cargar horas extra
              </Button>
            </div>
          </div>
          <p className="text-base-content/70 text-lg max-w-2xl">
            Monitorea horas de trabajo, productividad de empleados y generación automática de entradas de tiempo
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-col sm:flex-row gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-primary text-primary-content shadow-lg"
                  : "bg-base-100 text-base-content/70 hover:bg-base-300 border border-base-300/50"
              }`}
              title={tab.description}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {/* Employee Statistics Tab */}
          {activeTab === "employee" && (
            <div className="space-y-6">
              <Card className="bg-primary/10 border-2 border-primary/30">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/20 rounded-lg">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-base-content">Estadísticas de Empleados</h2>
                    <p className="text-sm text-base-content/70 mt-1">
                      Busca un empleado para ver sus estadísticas de trabajo mensuales
                    </p>
                  </div>
                </div>
              </Card>
              <EmployeeStatisticsCard />
            </div>
          )}

          {/* Department Statistics Tab */}
          {activeTab === "department" && (
            <div className="space-y-6">
              <Card className="bg-secondary/10 border-2 border-secondary/30">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-secondary/20 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-base-content">Análisis de Departamentos</h2>
                    <p className="text-sm text-base-content/70 mt-1">
                      Ver estadísticas agregadas por departamento
                    </p>
                  </div>
                </div>
              </Card>
              <DepartmentStatisticsCard />
            </div>
          )}

          {/* Time Entries Tab */}
          {activeTab === "entries" && (
            <div className="space-y-6">
              <Card className="bg-accent/10 border-2 border-accent/30">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-accent/20 rounded-lg">
                    <Clock className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-base-content">Registros de Entradas de Tiempo</h2>
                    <p className="text-sm text-base-content/70 mt-1">
                      Explora y filtra todas las entradas de tiempo por fecha, empleado o departamento
                    </p>
                  </div>
                </div>
              </Card>

              {/* Filters Card */}
              <Card>
                <div className="p-6">
                  <h3 className="font-semibold text-base-content mb-4 flex items-center gap-2">
                    <ChevronDown className="w-4 h-4" />
                    Filtros
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-base-content mb-2">
                        Fecha de Inicio
                      </label>
                      <input
                        type="date"
                        value={entriesStartDate}
                        onChange={(e) => setEntriesStartDate(e.target.value)}
                        className="input input-bordered w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content mb-2">
                        Fecha de Fin
                      </label>
                      <input
                        type="date"
                        value={entriesEndDate}
                        onChange={(e) => setEntriesEndDate(e.target.value)}
                        className="input input-bordered w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content mb-2">
                        Empleado (Opcional)
                      </label>
                      <input
                        type="text"
                        value={entriesEmployee}
                        onChange={(e) => setEntriesEmployee(e.target.value)}
                        placeholder="ID del empleado..."
                        className="input input-bordered w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-base-content mb-2">
                        Departamento
                      </label>
                      <select
                        value={entriesDepartment}
                        onChange={(e) => setEntriesDepartment(e.target.value)}
                        className="select select-bordered w-full text-sm"
                      >
                        <option value="">Todos los Departamentos</option>
                        <option value="Cocina">Cocina</option>
                        <option value="Atención al Público">Atención al Público</option>
                        <option value="Barra">Barra</option>
                        <option value="Dirección">Dirección</option>
                      </select>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Time Entries Table */}
              <TimeEntriesTable
                key={entriesRefreshKey}
                filters={timeEntriesFilters}
                pageSize={20}
              />
            </div>
          )}

          {/* Batch Process Tab */}
          {activeTab === "batch" && (
            <div className="space-y-6">
              {!isAdmin && (
                <Alert
                  variant="warning"
                  title="Solo Administrador"
                  message="El procesamiento por lotes está restringido a usuarios Administrador. Tu rol: Moderador"
                />
              )}

              {isAdmin && (
                <>
                  <Card className="bg-warning/10 border-2 border-warning/30">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-warning/20 rounded-lg">
                        <RefreshCw className="w-6 h-6 text-warning" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-base-content">Procesamiento por Lotes</h2>
                        <p className="text-sm text-base-content/70 mt-1">
                          Genera manualmente entradas de tiempo automáticas para una fecha específica
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <div className="p-6 space-y-6">
                      {/* Info Alert */}
                      <Alert
                        variant="info"
                        message="Las entradas de tiempo se generan normalmente diariamente a la 1:00 AM. Usa esto para regenerar manualmente entradas para una fecha específica."
                      />

                      {/* Date Selection */}
                      <div>
                        <label className="block text-sm font-semibold text-base-content mb-2">
                          Fecha a Procesar
                        </label>
                        <input
                          type="date"
                          value={batchDate}
                          onChange={(e) => setBatchDate(e.target.value)}
                          className="input input-bordered w-full md:w-64 text-sm"
                        />
                        <p className="text-xs text-base-content/50 mt-2">
                          Típicamente se establece a la fecha de ayer para turnos completados
                        </p>
                      </div>

                      {/* Action Button */}
                      <div className="flex gap-3">
                        <Button
                          onClick={handleBatchProcess}
                          disabled={batchProcessing}
                          className="btn-primary gap-2"
                        >
                          <RefreshCw className={`w-4 h-4 ${batchProcessing ? "animate-spin" : ""}`} />
                          {batchProcessing ? "Procesando..." : "Generar Entradas"}
                        </Button>
                      </div>

                      {/* Result Messages */}
                      {batchMessage && (
                        <Alert variant="success" message={batchMessage} />
                      )}

                      {batchError && (
                        <Alert variant="error" message={batchError} />
                      )}
                    </div>
                  </Card>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="pt-6 border-t border-base-300 text-sm text-base-content/50">
          <p>
            Última actualización: {new Date().toLocaleDateString("es-ES", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* Extra hours modal */}
      <ExtraHoursModal
        isOpen={extraModalOpen}
        onClose={() => setExtraModalOpen(false)}
        onSuccess={() => setEntriesRefreshKey((k) => k + 1)}
      />

      {/* Absence modal */}
      <AbsenceModal
        isOpen={absenceModalOpen}
        onClose={() => setAbsenceModalOpen(false)}
        onSuccess={() => setEntriesRefreshKey((k) => k + 1)}
      />
    </div>
  );
};

export default AdminStatistics;
