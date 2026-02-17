
import React, { useState } from 'react';
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
  { 
    id: '1', 
    firstName: 'Juan', 
    lastName: 'García', 
    email: 'juan@ilpi.es', 
    phone: '600112233', 
    dni: '12345678X',
    address: 'Calle Mayor 12, Villa Joyosa',
    birthDate: '1985-05-20',
    maritalStatus: 'Casado/a',
    gender: 'Masculino',
    role: Role.ADMIN, 
    department: Department.MANAGEMENT, 
    status: StaffStatus.ACTIVE, 
    hireDate: '2022-01-15', 
    profileImage: 'https://picsum.photos/seed/juan/100' 
  },
  { 
    id: '2', 
    firstName: 'Elena', 
    lastName: 'Rodríguez', 
    email: 'elena@ilpi.es', 
    phone: '611223344', 
    dni: '87654321Y',
    address: 'Av. Mediterraneo 5, Benidorm',
    birthDate: '1992-11-03',
    maritalStatus: 'Soltero/a',
    gender: 'Femenino',
    role: Role.MODERATOR, 
    department: Department.KITCHEN, 
    status: StaffStatus.ACTIVE, 
    hireDate: '2023-03-10', 
    profileImage: 'https://picsum.photos/seed/elena/100' 
  },
  { 
    id: '3', 
    firstName: 'Marco', 
    lastName: 'Rossi', 
    email: 'marco@ilpi.es', 
    phone: '622334455', 
    dni: 'AABBCCDDE',
    address: 'Calle Colon 45, Villa Joyosa',
    birthDate: '1988-08-15',
    maritalStatus: 'Pareja de hecho',
    gender: 'Masculino',
    role: Role.EMPLOYEE, 
    department: Department.KITCHEN, 
    status: StaffStatus.VACATION, 
    hireDate: '2023-06-01', 
    profileImage: 'https://picsum.photos/seed/marco/100' 
  }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [vacations, setVacations] = useState<VacationRequest[]>([]);

  const handleAddEmployee = (newEmp: Employee) => {
    setEmployees(prev => [...prev, newEmp]);
  };

  const handleUpdateEmployee = (updatedEmp: Employee) => {
    setEmployees(prev => prev.map(emp => emp.id === updatedEmp.id ? updatedEmp : emp));
  };

  const handleDeleteEmployee = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar a este empleado?')) {
      setEmployees(prev => prev.filter(emp => emp.id !== id));
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView employees={employees} shifts={shifts} vacations={vacations} />;
      case 'employees': return (
        <EmployeeListView 
          employees={employees} 
          onAdd={handleAddEmployee} 
          onUpdate={handleUpdateEmployee} 
          onDelete={handleDeleteEmployee} 
        />
      );
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
