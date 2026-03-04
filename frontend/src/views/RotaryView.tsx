// T035: Rotary view — Team management with member assignment
import { useState, useEffect, useCallback } from 'react';
import { Plus, Users, X, User } from 'lucide-react';
import { Button, Card, Modal, Alert } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { DEPARTMENTS } from '../config/constants';
import { Role, Department } from '../types/models';
import type { Team, Employee } from '../types/models';
import type { ShiftTypeResponse } from '../types/shift-types';
import {
  getTeams,
  createTeam,
  addMember,
  removeMember,
  getShiftTypesForTeams,
} from '../services/teamService';
import { getEmployees } from '../services/employeeService';

export default function RotaryView() {
  const { hasRole } = useAuth();
  const isAdminOrMod = hasRole(Role.ADMIN, Role.MODERADOR);

  const [activeDept, setActiveDept] = useState<string>(Department.COCINA);
  const [teams, setTeams] = useState<Team[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [shiftTypes, setShiftTypes] = useState<ShiftTypeResponse[]>([]);
  const [selectedShiftTypeId, setSelectedShiftTypeId] = useState('');
  const [formError, setFormError] = useState('');

  const [addingToTeam, setAddingToTeam] = useState<string | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [teamsData, empsData, shiftTypesData] = await Promise.all([
        getTeams({ department: activeDept, size: 50 }),
        getEmployees({ department: activeDept, size: 100 }),
        getShiftTypesForTeams(),
      ]);

      setTeams(teamsData.items);
      setShiftTypes(shiftTypesData);

      const assignedIds = new Set(teamsData.items.flatMap((t) => t.members.map((m) => m.id)));
      setAvailableEmployees(empsData.items.filter((e) => !assignedIds.has(e.id)));
    } catch {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [activeDept]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!selectedShiftTypeId && shiftTypes.length > 0) {
      setSelectedShiftTypeId(shiftTypes[0].id);
    }
  }, [selectedShiftTypeId, shiftTypes]);

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      setFormError('Nombre requerido');
      return;
    }
    if (!selectedShiftTypeId) {
      setFormError('Selecciona un tipo de turno');
      return;
    }

    setFormError('');
    try {
      await createTeam({
        name: teamName,
        department: activeDept,
        shift_type_id: selectedShiftTypeId,
      });
      setShowCreate(false);
      setTeamName('');
      fetchData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setFormError(axiosErr.response?.data?.error?.message || 'Error al crear equipo');
    }
  };

  const handleAddMember = async (teamId: string) => {
    if (!selectedEmpId) {
      return;
    }

    try {
      await addMember(teamId, selectedEmpId);
      setAddingToTeam(null);
      setSelectedEmpId('');
      fetchData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message || 'Error al añadir miembro');
    }
  };

  const handleRemoveMember = async (teamId: string, employeeId: string) => {
    try {
      await removeMember(teamId, employeeId);
      fetchData();
    } catch {
      setError('Error al quitar miembro');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 m-0">Rotación de Equipos</h1>
        {isAdminOrMod && (
          <Button
            onClick={() => {
              setShowCreate(true);
              setFormError('');
            }}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus size={18} /> Nuevo Equipo
          </Button>
        )}
      </div>

      <div className="flex gap-1 mb-8 border-b-2 border-slate-200 pb-0">
        {DEPARTMENTS.map((dept) => (
          <button
            key={dept}
            onClick={() => setActiveDept(dept)}
            className={`px-5 py-2.5 border-b-2 -mb-0.5 text-sm font-semibold transition-colors ${
              activeDept === dept
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {dept}
          </button>
        ))}
      </div>

      {error && <Alert variant="error" message={error} className="mb-4" />}

      {loading ? (
        <p className="text-center text-slate-600 mt-10">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {teams.length === 0 ? (
              <p className="text-slate-600">No hay equipos en {activeDept}</p>
            ) : (
              <div className="space-y-4">
                {teams.map((team) => (
                  <Card key={team.id}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                          <Users size={16} />
                          {team.name}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {team.shift_type?.name || 'Sin tipo de turno'}
                          {team.shift_type?.time_windows?.length
                            ? ` · ${team.shift_type.time_windows.map((window) => `${window.start} - ${window.end}`).join(' / ')}`
                            : ''}
                        </p>
                      </div>
                      {isAdminOrMod && (
                        <Button
                          onClick={() => {
                            setAddingToTeam(team.id);
                            setSelectedEmpId('');
                          }}
                          variant="secondary"
                          size="sm"
                        >
                          + Añadir
                        </Button>
                      )}
                    </div>

                    {addingToTeam === team.id && (
                      <div className="flex gap-2 mb-3">
                        <select
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                          value={selectedEmpId}
                          onChange={(e) => setSelectedEmpId(e.target.value)}
                        >
                          <option value="">Seleccionar empleado...</option>
                          {availableEmployees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.first_name} {emp.last_name}
                            </option>
                          ))}
                        </select>
                        <Button onClick={() => handleAddMember(team.id)} variant="primary" size="sm">
                          Añadir
                        </Button>
                        <button
                          onClick={() => setAddingToTeam(null)}
                          className="px-2 py-2 border border-slate-200 rounded-md hover:bg-slate-50"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {team.members.length === 0 ? (
                        <p className="text-xs text-slate-400">Sin miembros asignados</p>
                      ) : (
                        team.members.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-xs"
                          >
                            <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center overflow-hidden">
                              {m.profile_image ? (
                                <img
                                  src={m.profile_image}
                                  alt={m.first_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User size={14} className="text-slate-400" />
                              )}
                            </div>
                            <span>
                              {m.first_name} {m.last_name}
                            </span>
                            {isAdminOrMod && (
                              <button
                                onClick={() => handleRemoveMember(team.id, m.id)}
                                className="ml-1 hover:text-red-600"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Card className="lg:col-span-1 h-fit sticky top-6">
            <h3 className="font-semibold text-slate-900 mb-3">Disponibles</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {availableEmployees.length === 0 ? (
                <p className="text-xs text-slate-400">Todos asignados</p>
              ) : (
                availableEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center gap-2 pb-2 border-b border-slate-100 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {emp.profile_image ? (
                        <img
                          src={emp.profile_image}
                          alt={emp.first_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={16} className="text-slate-400" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-700">
                      {emp.first_name} {emp.last_name}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nuevo Equipo"
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleCreateTeam}>
              Crear equipo
            </Button>
          </div>
        }
      >
        {formError && <Alert variant="error" message={formError} className="mb-4" />}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nombre *
            </label>
            <input
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Ej: Equipo A"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipo de turno
            </label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              value={selectedShiftTypeId}
              onChange={(e) => setSelectedShiftTypeId(e.target.value)}
            >
              {shiftTypes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
