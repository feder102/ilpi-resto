// T031: Application routing
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import EmployeeListView from './views/EmployeeListView';
import RotaryView from './views/RotaryView';
import AttendanceView from './views/AttendanceView';
import VacationView from './views/VacationView';
import ReportsView from './views/ReportsView';
import SettingsView from './views/SettingsView';
import { ROUTES } from './config/constants';
import { Role } from './types';

const ALL_ROLES = [Role.ADMIN, Role.MODERADOR, Role.EMPLEADO];
const ADMIN_MOD = [Role.ADMIN, Role.MODERADOR];
const ADMIN_ONLY = [Role.ADMIN];

export default function App() {
  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<LoginView />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path={ROUTES.DASHBOARD} element={<ProtectedRoute allowedRoles={ADMIN_MOD}><DashboardView /></ProtectedRoute>} />
        <Route path={ROUTES.EMPLOYEES} element={<ProtectedRoute allowedRoles={ALL_ROLES}><EmployeeListView /></ProtectedRoute>} />
        <Route path={ROUTES.TEAMS} element={<ProtectedRoute allowedRoles={ADMIN_MOD}><RotaryView /></ProtectedRoute>} />
        <Route path={ROUTES.ATTENDANCE} element={<ProtectedRoute allowedRoles={ALL_ROLES}><AttendanceView /></ProtectedRoute>} />
        <Route path={ROUTES.VACATIONS} element={<ProtectedRoute allowedRoles={ALL_ROLES}><VacationView /></ProtectedRoute>} />
        <Route path={ROUTES.REPORTS} element={<ProtectedRoute allowedRoles={ADMIN_MOD}><ReportsView /></ProtectedRoute>} />
        <Route path={ROUTES.SETTINGS} element={<ProtectedRoute allowedRoles={ADMIN_ONLY}><SettingsView /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  );
}
