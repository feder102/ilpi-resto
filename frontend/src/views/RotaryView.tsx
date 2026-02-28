// T071: Rotary view — Team management with member assignment
import { useState, useEffect, useCallback } from 'react';
import { Plus, Users, X, User } from 'lucide-react';
import FormField from '../components/FormField';
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

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid #e2e8f0', fontSize: '0.9rem',
};

export default function RotaryView() {
  const { hasRole } = useAuth();
  const isAdminOrMod = hasRole(Role.ADMIN, Role.MODERADOR);

  const [activeDept, setActiveDept] = useState<string>(Department.COCINA);
  const [teams, setTeams] = useState<Team[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Create team modal
  const [showCreate, setShowCreate] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [shiftTypes, setShiftTypes] = useState<ShiftTypeResponse[]>([]);
  const [selectedShiftTypeId, setSelectedShiftTypeId] = useState('');
  const [formError, setFormError] = useState('');

  // Add member
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

      // Available = employees not in any team (of this dept)
      const assignedIds = new Set(teamsData.items.flatMap((t) => t.members.map((m) => m.id)));
      setAvailableEmployees(empsData.items.filter((e) => !assignedIds.has(e.id)));
    } catch {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [activeDept]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!selectedShiftTypeId && shiftTypes.length > 0) {
      setSelectedShiftTypeId(shiftTypes[0].id);
    }
  }, [selectedShiftTypeId, shiftTypes]);

  const handleCreateTeam = async () => {
    if (!teamName.trim()) { setFormError('Nombre requerido'); return; }
    if (!selectedShiftTypeId) { setFormError('Selecciona un tipo de turno'); return; }
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
    if (!selectedEmpId) return;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Rotación de Equipos</h1>
        {isAdminOrMod && (
          <button onClick={() => { setShowCreate(true); setFormError(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
              borderRadius: 8, border: 'none', background: '#2563eb', color: 'white',
              fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
            }}>
            <Plus size={18} /> Nuevo Equipo
          </button>
        )}
      </div>

      {/* Department tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid #e2e8f0', paddingBottom: 0 }}>
        {DEPARTMENTS.map((dept) => (
          <button key={dept} onClick={() => setActiveDept(dept)}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
              background: activeDept === dept ? '#2563eb' : 'transparent',
              color: activeDept === dept ? 'white' : '#64748b',
              borderRadius: '8px 8px 0 0',
            }}>
            {dept}
          </button>
        ))}
      </div>

      {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}

      {loading ? (
        <p style={{ textAlign: 'center', color: '#64748b', marginTop: 40 }}>Cargando...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
          {/* Teams */}
          <div>
            {teams.length === 0 ? (
              <p style={{ color: '#64748b' }}>No hay equipos en {activeDept}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {teams.map((team) => (
                  <div key={team.id} style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                          <Users size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                          {team.name}
                        </h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                          {team.shift_type?.name || 'Sin tipo de turno'}
                          {team.shift_type?.time_windows?.length
                            ? ` · ${team.shift_type.time_windows.map((window) => `${window.start} - ${window.end}`).join(' / ')}`
                            : ''}
                        </p>
                      </div>
                      {isAdminOrMod && (
                        <button onClick={() => { setAddingToTeam(team.id); setSelectedEmpId(''); }}
                          style={{
                            padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0',
                            background: 'white', cursor: 'pointer', fontSize: '0.8rem', color: '#2563eb',
                          }}>
                          + Añadir
                        </button>
                      )}
                    </div>

                    {/* Add member inline */}
                    {addingToTeam === team.id && (
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <select style={{ ...inputStyle, flex: 1 }} value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)}>
                          <option value="">Seleccionar empleado...</option>
                          {availableEmployees.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                          ))}
                        </select>
                        <button onClick={() => handleAddMember(team.id)}
                          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>
                          Añadir
                        </button>
                        <button onClick={() => setAddingToTeam(null)}
                          style={{ padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>
                          <X size={16} />
                        </button>
                      </div>
                    )}

                    {/* Members */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {team.members.length === 0 ? (
                        <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Sin miembros asignados</p>
                      ) : team.members.map((m) => (
                        <div key={m.id} style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                          background: '#f1f5f9', borderRadius: 20, fontSize: '0.85rem',
                        }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%', background: '#e2e8f0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                          }}>
                            {m.profile_image
                              ? <img src={m.profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <User size={14} color="#94a3b8" />}
                          </div>
                          {m.first_name} {m.last_name}
                          {isAdminOrMod && (
                            <button onClick={() => handleRemoveMember(team.id, m.id)}
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, color: '#94a3b8' }}>
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available pool */}
          <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0', alignSelf: 'start' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 600 }}>Disponibles</h3>
            {availableEmployees.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Todos asignados</p>
            ) : availableEmployees.map((emp) => (
              <div key={emp.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
                borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: '#e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
                }}>
                  {emp.profile_image
                    ? <img src={emp.profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <User size={16} color="#94a3b8" />}
                </div>
                <span>{emp.first_name} {emp.last_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 32, maxWidth: 440, width: '95%' }}>
            <h2 style={{ margin: '0 0 24px' }}>Nuevo Equipo</h2>
            {formError && <p style={{ color: '#dc2626', marginBottom: 16 }}>{formError}</p>}

            <FormField label="Nombre" required>
              <input style={inputStyle} value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Ej: Equipo A" />
            </FormField>
            <FormField label="Tipo de turno">
              <select style={inputStyle} value={selectedShiftTypeId} onChange={(e) => setSelectedShiftTypeId(e.target.value)}>
                {shiftTypes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </FormField>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
              <button onClick={() => setShowCreate(false)}
                style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleCreateTeam}
                style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#2563eb', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                Crear equipo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
