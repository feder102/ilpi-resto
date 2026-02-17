
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
import { ilpiApi } from './services/api';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [vacations, setVacations] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Inicialización: Carga desde la API
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await ilpiApi.fetchAllData();
        setEmployees(data.employees);
        setShifts(data.shifts);
        setVacations(data.vacations);
      } catch (error) {
        console.error("Error cargando datos de ILPI:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleAddEmployee = async (newEmp: Employee) => {
    const updated = [...employees, newEmp];
    setEmployees(updated);
    await ilpiApi.syncEmployees(updated);
  };

  const handleUpdateEmployee = async (updatedEmp: Employee) => {
    const updated = employees.map(emp => emp.id === updatedEmp.id ? updatedEmp : emp);
    setEmployees(updated);
    await ilpiApi.syncEmployees(updated);
  };

  const handleDeleteEmployee = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar a este empleado?')) {
      const updated = employees.filter(emp => emp.id !== id);
      setEmployees(updated);
      await ilpiApi.syncEmployees(updated);
    }
  };

  const handleSetShifts = async (newShifts: ShiftRecord[]) => {
    setShifts(newShifts);
    await ilpiApi.syncShifts(newShifts);
  };

  const handleSetVacations = async (newVacations: VacationRequest[]) => {
    setVacations(newVacations);
    await ilpiApi.syncVacations(newVacations);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Cargando ILPI Staff...</p>
        </div>
      </div>
    );
  }

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
