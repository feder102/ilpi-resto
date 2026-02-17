
import React, { useRef, useState, useEffect } from 'react';
import { Shield, UserCog, Bell, Globe, Lock, Database, Download, Upload, RefreshCcw } from 'lucide-react';
import { ilpiApi } from '../services/api';

const SettingsView: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dbInfo, setDbInfo] = useState({ version: 0, lastUpdate: '' });

  useEffect(() => {
    const fetchDbInfo = async () => {
      const data = await ilpiApi.fetchAllData();
      setDbInfo({ version: data.version, lastUpdate: data.lastUpdate });
    };
    fetchDbInfo();
  }, []);

  const handleExport = async () => {
    const data = await ilpiApi.fetchAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ilpi_db_v${data.version}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const content = ev.target?.result;
        if (typeof content === 'string') {
          try {
            await ilpiApi.importData(content);
            window.location.reload();
          } catch (err) {
            alert("Error al importar datos");
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleReset = async () => {
    if (window.confirm("¿ESTÁS SEGURO? Esto borrará todos los empleados y registros actuales de ILPI y restaurará los valores iniciales.")) {
      await ilpiApi.resetSystem();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      <div className="bg-indigo-50 rounded-3xl border border-indigo-100 p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Database size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Base de Datos Centralizada</h3>
            <p className="text-slate-500 text-sm">Organización por capas: Backend y Frontend desacoplados.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm">
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">Estado del Servidor</p>
            <p className="text-3xl font-black text-slate-900">v{dbInfo.version}</p>
            <p className="text-xs text-slate-400 mt-2">Sincronizado: {dbInfo.lastUpdate ? new Date(dbInfo.lastUpdate).toLocaleString() : 'Cargando...'}</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-between gap-4">
            <p className="text-sm text-slate-600 font-medium">Gestiona la persistencia de datos del restaurante mediante la API.</p>
            <div className="flex gap-2">
              <button 
                onClick={handleExport}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all"
              >
                <Download size={16} /> Exportar JSON
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
              >
                <Upload size={16} /> Importar
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
            </div>
          </div>
        </div>

        <button onClick={handleReset} className="mt-6 flex items-center gap-2 text-red-500 text-xs font-bold hover:bg-red-50 px-4 py-2 rounded-lg transition-all">
          <RefreshCcw size={14} /> REINICIALIZAR BACKEND (DATOS DE FÁBRICA)
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100">
          <h3 className="text-2xl font-bold text-slate-900">Seguridad y Roles</h3>
          <p className="text-slate-500 mt-1">Configuración de perfiles de acceso.</p>
        </div>
        <div className="divide-y divide-slate-100">
          <SettingsItem 
            icon={<Shield className="text-indigo-600" />} 
            title="Control de Acceso" 
            desc="Administra quién puede ver reportes o modificar el personal."
            action={<button className="text-sm font-bold text-indigo-600">Configurar</button>}
          />
          <SettingsItem 
            icon={<Lock className="text-red-600" />} 
            title="Seguridad de Fichaje" 
            desc="Validación de IP y coordenadas para el escaneo QR."
            action={<button className="text-sm font-bold text-indigo-600">Ajustes</button>}
          />
        </div>
      </div>
    </div>
  );
};

const SettingsItem = ({ icon, title, desc, action }: { icon: React.ReactNode, title: string, desc: string, action: React.ReactNode }) => (
  <div className="p-8 flex items-center gap-6 hover:bg-slate-50/50 transition-colors">
    <div className="p-3 bg-slate-50 rounded-2xl">{icon}</div>
    <div className="flex-1">
      <h4 className="font-bold text-slate-900">{title}</h4>
      <p className="text-sm text-slate-500 mt-1">{desc}</p>
    </div>
    {action}
  </div>
);

export default SettingsView;
