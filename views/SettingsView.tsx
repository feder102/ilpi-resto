
import React from 'react';
import { Shield, UserCog, Bell, Globe, Lock } from 'lucide-react';

const SettingsView: React.FC = () => {
  return (
    <div className="max-w-4xl space-y-8">
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

      <div className="bg-slate-900 text-white rounded-3xl p-8 flex items-center justify-between">
        <div>
          <h4 className="text-lg font-bold">Plan Premium ILPI</h4>
          <p className="text-slate-400 text-sm mt-1">Soporte prioritario y almacenamiento de reportes ilimitado.</p>
        </div>
        <button className="px-6 py-2 bg-indigo-500 hover:bg-indigo-400 rounded-xl font-bold transition-colors">
          Gestionar Plan
        </button>
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
