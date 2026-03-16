// T038: Settings view — Admin only - refactored to use UI components
import { Shield, Database, Users } from 'lucide-react';
import { Card } from '../components/ui';

export default function SettingsView() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-base-content">Configuración</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Database Info */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Database size={24} className="text-info" />
            <h2 className="text-lg font-semibold text-base-content">Base de Datos</h2>
          </div>
          <div className="space-y-2 text-sm text-base-content/80">
            <div className="flex justify-between py-2 border-b border-base-200">
              <span>Motor</span>
              <span className="font-medium text-base-content">PostgreSQL 16</span>
            </div>
            <div className="flex justify-between py-2 border-b border-base-200">
              <span>Estado</span>
              <span className="font-medium text-success">Conectado</span>
            </div>
            <div className="flex justify-between py-2">
              <span>Última sincronización</span>
              <span className="font-medium text-base-content">Ahora</span>
            </div>
          </div>
        </Card>

        {/* Security & Roles */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Shield size={24} className="text-secondary" />
            <h2 className="text-lg font-semibold text-base-content">Seguridad y Roles</h2>
          </div>
          <div className="space-y-4 text-sm text-base-content/80">
            <div>
              <h4 className="font-semibold text-base-content mb-2">Roles del Sistema</h4>
              {[
                { role: 'Admin', desc: 'Acceso completo a todas las secciones', color: 'text-error' },
                { role: 'Moderador', desc: 'Todo excepto Configuración', color: 'text-warning' },
                { role: 'Empleado', desc: 'Solo perfil, turnos y vacaciones propios', color: 'text-primary' },
              ].map((r) => (
                <div key={r.role} className="flex items-center gap-2 py-1.5">
                  <Users size={14} className={r.color} />
                  <strong className={r.color}>{r.role}</strong>
                  <span className="text-base-content/60">— {r.desc}</span>
                </div>
              ))}
            </div>

            <div>
              <h4 className="font-semibold text-base-content mb-2">Políticas de Seguridad</h4>
              <ul className="space-y-1 text-xs text-base-content/60 list-disc list-inside">
                <li>Tokens JWT con expiración de 30 minutos</li>
                <li>Refresh tokens en cookies HttpOnly</li>
                <li>Rate limiting: 10 req/min en login</li>
                <li>Contraseñas: mín. 8 caracteres, mayúscula, minúscula, dígito</li>
                <li>Headers de seguridad: CSP, HSTS, X-Frame-Options</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
