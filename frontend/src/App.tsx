// T031: Application routing
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { EmployeeRoute } from './components/EmployeeRoute';
import { ModeratorRoute } from './components/ModeratorRoute';
import { PasswordSetupRoute } from './components/PasswordSetupRoute';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import EmployeeListView from './views/EmployeeListView';
import RotaryView from './views/RotaryView';
import AttendanceView from './views/AttendanceView';
import VacationView from './views/VacationView';
import ReportsView from './views/ReportsView';
import SettingsView from './views/SettingsView';
import { ShiftConfiguration } from './views/ShiftConfiguration';
import ShiftRosterCalendar from './views/ShiftRosterCalendar';
// Feature 006: Moderator Portal
import ModeratorDashboard from './views/ModeratorDashboard';
import ModeratorRoster from './views/ModeratorRoster';
import ModeratorVacations from './views/ModeratorVacations';
import ModeratorShifts from './views/ModeratorShifts';
import ModeratorReports from './views/ModeratorReports';
// Feature 005: Employee Workspace Portal
import PasswordSetup from './views/PasswordSetup';
import EmployeeDashboard from './views/EmployeeDashboard';
import EmployeeShiftCalendar from './views/EmployeeShiftCalendar';
import EmployeeVacationView from './views/EmployeeVacationView';
import { ROUTES } from './config/constants';
import { Role } from './types';

const ALL_ROLES = [Role.ADMIN, Role.MODERADOR, Role.EMPLEADO];
const ADMIN_MOD = [Role.ADMIN, Role.MODERADOR];
const ADMIN_ONLY = [Role.ADMIN];

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path={ROUTES.LOGIN} element={<LoginView />} />

      {/* Feature 005: Password Setup - CRITICAL SECURITY ROUTE */}
      <Route
        path="/auth/password-setup"
        element={
          <PasswordSetupRoute>
            <PasswordSetup />
          </PasswordSetupRoute>
        }
      />

      {/* Admin/Moderator routes with Layout */}
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
        <Route path={ROUTES.SHIFT_ROSTER} element={<ProtectedRoute allowedRoles={ALL_ROLES}><ShiftRosterCalendar /></ProtectedRoute>} />
        <Route path={ROUTES.SHIFT_CONFIGURATION} element={<ProtectedRoute allowedRoles={ADMIN_ONLY}><ShiftConfiguration /></ProtectedRoute>} />
        <Route path={ROUTES.ATTENDANCE} element={<ProtectedRoute allowedRoles={ALL_ROLES}><AttendanceView /></ProtectedRoute>} />
        <Route path={ROUTES.VACATIONS} element={<ProtectedRoute allowedRoles={ALL_ROLES}><VacationView /></ProtectedRoute>} />
        <Route path={ROUTES.REPORTS} element={<ProtectedRoute allowedRoles={ADMIN_MOD}><ReportsView /></ProtectedRoute>} />
        <Route path={ROUTES.SETTINGS} element={<ProtectedRoute allowedRoles={ADMIN_ONLY}><SettingsView /></ProtectedRoute>} />
      </Route>

      {/* Feature 005: Employee Portal - CRITICAL SECURITY ROUTES */}
      {/* All employee routes require: authenticated + Empleado role + is_active=true */}
      <Route
        path="/employee/dashboard"
        element={
          <EmployeeRoute>
            <EmployeeDashboard />
          </EmployeeRoute>
        }
      />

      {/* Feature 005: US2 - Employee Shift Calendar */}
      {/* SECURITY: EmployeeRoute enforces (authenticated + Empleado role + is_active=true) */}
      {/* Backend enforces RLS: only current employee's shifts returned */}
      <Route
        path="/employee/shifts"
        element={
          <EmployeeRoute>
            <EmployeeShiftCalendar />
          </EmployeeRoute>
        }
      />

      {/* Feature 005: US3 - Employee Vacation Requests */}
      {/* SECURITY: EmployeeRoute enforces (authenticated + Empleado role + is_active=true) */}
      {/* Backend enforces RLS: only current employee's vacation requests returned */}
      <Route
        path="/employee/vacations"
        element={
          <EmployeeRoute>
            <EmployeeVacationView />
          </EmployeeRoute>
        }
      />

      {/* Future employee routes (Time Tracking) will go here */}
      {/* <Route path="/employee/time-tracking" element={<EmployeeRoute><EmployeeTimeTracking /></EmployeeRoute>} /> */}

      {/* Feature 006: Moderator Portal - CRITICAL SECURITY ROUTES */}
      {/* All moderator routes require: authenticated + Moderador role + is_active=true */}
      <Route
        path="/moderator/dashboard"
        element={
          <ModeratorRoute>
            <ModeratorDashboard />
          </ModeratorRoute>
        }
      />

      {/* Feature 006: US1 - Moderator Roster */}
      {/* SECURITY: ModeratorRoute enforces (authenticated + Moderador role + is_active=true) */}
      {/* Backend enforces RLS: only current moderator's department shifts returned */}
      <Route
        path="/moderator/roster"
        element={
          <ModeratorRoute>
            <ModeratorRoster />
          </ModeratorRoute>
        }
      />

      {/* Feature 006: US2 - Moderator Vacation Management */}
      {/* SECURITY: ModeratorRoute enforces (authenticated + Moderador role + is_active=true) */}
      {/* Backend enforces RLS: only current moderator's department vacation requests returned */}
      <Route
        path="/moderator/vacations"
        element={
          <ModeratorRoute>
            <ModeratorVacations />
          </ModeratorRoute>
        }
      />

      {/* Feature 006: US3 - Moderator Shift Assignment */}
      {/* SECURITY: ModeratorRoute enforces (authenticated + Moderador role + is_active=true) */}
      {/* Backend enforces RLS: moderator can only assign shifts to employees in their department */}
      <Route
        path="/moderator/shifts"
        element={
          <ModeratorRoute>
            <ModeratorShifts />
          </ModeratorRoute>
        }
      />

      {/* Feature 006: US4 - Moderator Reports */}
      {/* SECURITY: ModeratorRoute enforces (authenticated + Moderador role + is_active=true) */}
      {/* Backend enforces RLS: only current moderator's department data in reports */}
      <Route
        path="/moderator/reports"
        element={
          <ModeratorRoute>
            <ModeratorReports />
          </ModeratorRoute>
        }
      />

      {/* Catch-all: redirect to appropriate dashboard based on user role */}
      <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
    </Routes>
  );
}
