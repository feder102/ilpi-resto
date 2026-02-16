
import React, { useState } from 'react';
import { QrCode, LogIn, LogOut, Search, MapPin } from 'lucide-react';
import { Employee, ShiftRecord } from '../types';

interface AttendanceViewProps {
  employees: Employee[];
  shifts: ShiftRecord[];
  setShifts: (shifts: ShiftRecord[]) => void;
}

const AttendanceView: React.FC<AttendanceViewProps> = ({ employees, shifts, setShifts }) => {
  const [showQR, setShowQR] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  const simulateClockIn = () => {
    if (!selectedEmployee) return;
    const newShift: ShiftRecord = {
      id: Math.random().toString(36).substr(2, 9),
      employeeId: selectedEmployee,
      date: new Date().toISOString().split('T')[0],
      entryTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setShifts([newShift, ...shifts]);
    setShowQR(false);
    setSelectedEmployee(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Simulation Toggle */}
      <div className="bg-indigo-900 text-white rounded-3xl p-8 overflow-hidden relative shadow-2xl shadow-indigo-200">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl font-bold mb-4">Registro con QR</h2>
            <p className="text-indigo-100 opacity-80 mb-6">Escanea tu código personal en la tablet de entrada para registrar tu ingreso o egreso de ILPI.</p>
            <button 
              onClick={() => setShowQR(true)}
              className="px-8 py-3 bg-white text-indigo-900 font-bold rounded-xl hover:bg-indigo-50 transition-colors flex items-center gap-2 mx-auto md:mx-0 shadow-lg"
            >
              <QrCode size={20} />
              Iniciar Escaneo
            </button>
          </div>
          <div className="w-48 h-48 bg-white/10 rounded-3xl backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <QrCode size={100} className="text-white opacity-40" />
          </div>
        </div>
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-sky-400 rounded-full blur-2xl -ml-16 -mb-16 opacity-30" />
      </div>

      {/* QR Scanner Simulation Overlay */}
      {showQR && (
        <div className="fixed inset-0 z-[60] bg-slate-900/90 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center space-y-6">
            <h3 className="text-xl font-bold">Simulador de Lector QR</h3>
            <p className="text-slate-500">Selecciona un empleado para simular el escaneo de entrada.</p>
            <select 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              value={selectedEmployee || ''}
              onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              <option value="">Seleccionar Empleado...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
            </select>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowQR(false)}
                className="flex-1 py-3 text-slate-600 font-semibold hover:bg-slate-50 rounded-xl"
              >
                Cancelar
              </button>
              <button 
                onClick={simulateClockIn}
                disabled={!selectedEmployee}
                className="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                Simular Entrada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-lg">Registros Recientes</h3>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <MapPin size={14} /> Villa Joyosa Main Entrance
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Empleado</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Entrada</th>
                <th className="px-6 py-4">Salida</th>
                <th className="px-6 py-4">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shifts.map(shift => {
                const emp = employees.find(e => e.id === shift.employeeId);
                return (
                  <tr key={shift.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={emp?.profileImage} className="w-8 h-8 rounded-full" alt="" />
                        <span className="text-sm font-semibold">{emp?.firstName} {emp?.lastName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{shift.date}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                        <LogIn size={12} /> {shift.entryTime}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {shift.exitTime ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-100">
                          <LogOut size={12} /> {shift.exitTime}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">En turno...</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-indigo-600 hover:text-indigo-800 text-sm font-bold">Ver GPS</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceView;
