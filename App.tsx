
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import DashboardView from './views/DashboardView';
import EmployeeListView from './views/EmployeeListView';
import RotaryView from './views/RotaryView';
import AttendanceView from './views/AttendanceView';
import VacationView from './views/VacationView';
import ReportsView from './views/ReportsView';
import SettingsView from './views/SettingsView';
import { Employee, Role, Department, StaffStatus, ShiftRecord, VacationRequest } from './types';

const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', firstName: 'Juan', lastName: 'García', email: 'juan@ilpi.es', phone: '600112233', role: Role.ADMIN, department: Department.MANAGEMENT, status: StaffStatus.ACTIVE, hireDate: '2022-01-15', profileImage: 'https://picsum.photos/seed/juan/100' },
  { id: '2', firstName: 'Elena', lastName: 'Rodríguez', email: 'elena@ilpi.es', phone: '611223344', role: Role.MODERATOR, department: Department.KITCHEN, status: StaffStatus.ACTIVE, hireDate: '2023-03-10', profileImage: 'https://picsum.photos/seed/elena/100' },
  { id: '3', firstName: 'Marco', lastName: 'Rossi', email: 'marco@ilpi.es', phone: '622334455', role: Role.EMPLOYEE, department: Department.KITCHEN, status: StaffStatus.VACATION, hireDate: '2023-06-01', profileImage: 'https://picsum.photos/seed/marco/100' },
  { id: '4', firstName: 'Sofia', lastName: 'Pérez', email: 'sofia@ilpi.es', phone: '633445566', role: Role.EMPLOYEE, department: Department.SERVICE, status: StaffStatus.ACTIVE, hireDate: '2024-02-20', profileImage: 'https://picsum.photos/seed/sofia/100' },
  { id: '5', firstName: 'Luca', lastName: 'Martín', email: 'luca@ilpi.es', phone: '644556677', role: Role.EMPLOYEE, department: Department.BAR, status: StaffStatus.ACTIVE, hireDate: '2023-11-15', profileImage: 'https://picsum.photos/seed/luca/100' },
];

const INITIAL_SHIFTS: ShiftRecord[] = [
  { id: 's1', employeeId: '4', date: '2024-05-15', entryTime: '09:00', exitTime: '17:00' },
  { id: 's2', employeeId: '5', date: '2024-05-15', entryTime: '18:00', exitTime: '01:00' },
];

const INITIAL_VACATIONS: VacationRequest[] = [
  { id: 'v1', employeeId: '3', startDate: '2024-05-10', endDate: '2024-05-20', status: 'Aprobado' },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [shifts, setShifts] = useState<ShiftRecord[]>(INITIAL_SHIFTS);
  const [vacations, setVacations] = useState<VacationRequest[]>(INITIAL_VACATIONS);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView employees={employees} shifts={shifts} vacations={vacations} />;
      case 'employees': return <EmployeeListView employees={employees} setEmployees={setEmployees} />;
      case 'rotary': return <RotaryView employees={employees} />;
      case 'attendance': return <AttendanceView employees={employees} shifts={shifts} setShifts={setShifts} />;
      case 'vacations': return <VacationView employees={employees} vacations={vacations} setVacations={setVacations} />;
      case 'reports': return <ReportsView employees={employees} shifts={shifts} />;
      case 'settings': return <SettingsView />;
      default: return <DashboardView employees={employees} shifts={shifts} vacations={vacations} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default App;
