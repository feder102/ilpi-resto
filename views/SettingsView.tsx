
import React, { useRef } from 'react';
import { Shield, UserCog, Bell, Globe, Lock, Database, Download, Upload, RefreshCcw } from 'lucide-react';
import { db } from '../services/db';

const SettingsView: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentDB = db.getAll();

  const handleExport = () => {
    db.exportJSON();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result;
        if (typeof content === 'string') {
          db.importJSON(content);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleReset = () => {
    if (window.confirm("¿ESTÁS SEGURO? Esto borrará todos los empleados y registros actuales de ILPI y restaurará los valores iniciales.")) {
      db.reset();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      {/* DB Management Section */}
      <div className="bg-indigo-50 rounded-3xl border border-indigo-100 p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Database size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Base de Datos Local (Versionable)</h3>
            <p className="text-slate-500 text-sm">Control de persistencia y backups para ILPI Staff.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm">
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">Versión Actual</p>
            <p className="text-3xl font-black text-slate-900">v{currentDB.version}</p>
            <p className="text-xs text-slate-400 mt-2">Última actualización: {new Date(currentDB.lastUpdate).toLocaleString()}</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-between gap-4">
            <p className="text-sm text-slate-600 font-medium">Usa estos botones para versionar tu base de datos externamente o restaurarla.</p>
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
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImport} 
                accept=".json" 
                className="hidden" 
              />
            </div>
          </div>
        </div>

        <button 
          onClick={handleReset}
          className="mt-6 flex items-center gap-2 text-red-500 text-xs font-bold hover:bg-red-50 px-4 py-2 rounded-lg transition-all"
        >
          <RefreshCcw size={14} /> RESTAURAR ESTADO DE FÁBRICA
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100">
          <h3 className="text-2xl font-bold text-slate-900">Configuración del Sistema</h3>
          <p className="text-slate-500 mt-1">Administra los roles, permisos y parámetros globales de ILPI.</p>
        </div>

        <div className="divide-y divide-slate-100">
          <SettingsItem 
            icon={<Shield className="text-indigo-600" />} 
            title="Roles y Permisos" 
            desc="Configura qué puede hacer cada Admin, Moderador y Empleado."
            action={<button className="text-sm font-bold text-indigo-600">Configurar</button>}
          />
          <SettingsItem 
            icon={<UserCog className="text-blue-600" />} 
            title="Perfiles de Empleado" 
            desc="Campos requeridos y validaciones para la ficha personal."
            action={<button className="text-sm font-bold text-indigo-600">Gestionar</button>}
          />
          <SettingsItem 
            icon={<Bell className="text-orange-600" />} 
            title="Notificaciones" 
            desc="Alertas de entrada tardía, ausencias y nuevas vacaciones."
            action={<button className="text-sm font-bold text-indigo-600">Personalizar</button>}
          />
          <SettingsItem 
            icon={<Globe className="text-green-600" />} 
            title="Localización" 
            desc="Radio permitido para el fichaje QR y geolocalización de Villa Joyosa."
            action={<button className="text-sm font-bold text-indigo-600">Ver Mapa</button>}
          />
          <SettingsItem 
            icon={<Lock className="text-red-600" />} 
            title="Seguridad" 
            desc="Autenticación de dos pasos y registros de auditoría."
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
