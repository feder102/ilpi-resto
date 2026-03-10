/**
 * T069: Moderator Dashboard - Integration point for all moderator features
 * Feature 006: Moderator Portal
 *
 * Main landing page for moderators with navigation to:
 * - Shift Roster (view team shifts)
 * - Vacation Management (approve/reject requests)
 * - Shift Assignment (assign shifts to employees)
 * - Reports (vacation and attendance summaries)
 */

import { useNavigate } from 'react-router-dom';

interface DashboardCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
  color: string;
}

export default function ModeratorDashboard() {
  const navigate = useNavigate();

  const dashboardCards: DashboardCard[] = [
    {
      id: 'roster',
      title: 'Horarios del Equipo',
      description: 'Ver el calendario de turnos de tu equipo por mes',
      icon: '📅',
      path: '/moderator/roster',
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'vacations',
      title: 'Solicitudes de Vacaciones',
      description: 'Aprobar o rechazar solicitudes de vacaciones pendientes',
      icon: '🏖️',
      path: '/moderator/vacations',
      color: 'from-green-500 to-green-600',
    },
    {
      id: 'shifts',
      title: 'Asignar Turnos',
      description: 'Asignar nuevos turnos a los miembros de tu equipo',
      icon: '⏰',
      path: '/moderator/shifts',
      color: 'from-orange-500 to-orange-600',
    },
    {
      id: 'reports',
      title: 'Reportes',
      description: 'Ver resumen de vacaciones y reportes de asistencia',
      icon: '📊',
      path: '/moderator/reports',
      color: 'from-purple-500 to-purple-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Panel del Moderador</h1>
          <p className="mt-2 text-gray-600">
            Gestiona los turnos y solicitudes de tu equipo
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {dashboardCards.map(card => (
            <button
              key={card.id}
              onClick={() => navigate(card.path)}
              className="group relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow"
            >
              {/* Card Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-90 group-hover:opacity-100 transition-opacity`} />

              {/* Card Content */}
              <div className="relative p-6 flex flex-col h-full text-white">
                <div className="text-4xl mb-4">{card.icon}</div>
                <h3 className="text-lg font-bold mb-2">{card.title}</h3>
                <p className="text-sm opacity-90 flex-1">{card.description}</p>
                <div className="mt-4 flex items-center text-sm font-semibold">
                  Ir <span className="ml-2">→</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Quick Stats Section */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Resumen Rápido</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Team Size */}
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">-</div>
              <p className="text-gray-600 text-sm">Miembros del Equipo</p>
              <p className="text-xs text-gray-500 mt-1">Cargando...</p>
            </div>

            {/* Pending Requests */}
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">-</div>
              <p className="text-gray-600 text-sm">Solicitudes Pendientes</p>
              <p className="text-xs text-gray-500 mt-1">Vacaciones y cambios</p>
            </div>

            {/* This Month's Shifts */}
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600 mb-2">-</div>
              <p className="text-gray-600 text-sm">Turnos Este Mes</p>
              <p className="text-xs text-gray-500 mt-1">Total asignados</p>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">💡 Guía Rápida</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p className="font-semibold mb-1">📅 Horarios</p>
              <p className="text-xs">Ver y gestionar turnos de tu equipo por mes</p>
            </div>
            <div>
              <p className="font-semibold mb-1">🏖️ Vacaciones</p>
              <p className="text-xs">Revisar y aprobar solicitudes de tiempo libre</p>
            </div>
            <div>
              <p className="font-semibold mb-1">⏰ Asignar Turnos</p>
              <p className="text-xs">Crear nuevos turnos para tus empleados</p>
            </div>
            <div>
              <p className="font-semibold mb-1">📊 Reportes</p>
              <p className="text-xs">Analizar datos de vacaciones y asistencia</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
