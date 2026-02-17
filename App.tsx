
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import DashboardView from './views/DashboardView';
import EmployeeListView from './views/EmployeeListView';
import RotaryView from './views/RotaryView';
import AttendanceView from './views/AttendanceView';
import VacationView from './views/VacationView';
import ReportsView from './views/ReportsView';
import SettingsView from './views/SettingsView';
import { Employee, ShiftRecord, VacationRequest } from './types';
import { db } from './services/db';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [vacations, setVacations] = useState<VacationRequest[]>([]);

  // Cargar datos al iniciar
  useEffect(() => {
    const data = db.init();
    setEmployees(data.employees);
    setShifts(data.shifts);
    setVacations(data.vacations);
  }, []);

  // Persistir cambios cuando el estado de empleados cambie
  const handleAddEmployee = (newEmp: Employee) => {
    const updated = [...employees, newEmp];
    setEmployees(updated);
    db.saveAll({ employees: updated });
  };

  const handleUpdateEmployee = (updatedEmp: Employee) => {
    const updated = employees.map(emp => emp.id === updatedEmp.id ? updatedEmp : emp);
    setEmployees(updated);
    db.saveAll({ employees: updated });
  };

  const handleDeleteEmployee = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar a este empleado?')) {
      const updated = employees.filter(emp => emp.id !== id);
      setEmployees(updated);
      db.saveAll({ employees: updated });
    }
  };

  const handleSetShifts = (newShifts: ShiftRecord[]) => {
    setShifts(newShifts);
    db.saveAll({ shifts: newShifts });
  };

  const handleSetVacations = (newVacations: VacationRequest[]) => {
    setVacations(newVacations);
    db.saveAll({ vacations: newVacations });
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
      case 'attendance': return <AttendanceView employees={employees} shifts={shifts} setShifts={handleSetShifts} />;
      case 'vacations': return <VacationView employees={employees} vacations={vacations} setVacations={handleSetVacations} />;
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
