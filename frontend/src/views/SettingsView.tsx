// T079: Settings view — Admin only
import { Shield, Database, Users } from 'lucide-react';

export default function SettingsView() {
  return (
    <div>
      <h1 style={{ margin: '0 0 24px', fontSize: '1.5rem', fontWeight: 700 }}>Configuración</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Database Info */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Database size={24} color="#3b82f6" />
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Base de Datos</h2>
          </div>
          <div style={{ fontSize: '0.9rem', color: '#475569' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span>Motor</span><span style={{ fontWeight: 500 }}>PostgreSQL 16</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span>Estado</span>
              <span style={{ color: '#16a34a', fontWeight: 500 }}>Conectado</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span>Última sincronización</span><span style={{ fontWeight: 500 }}>Ahora</span>
            </div>
          </div>
        </div>

        {/* Security & Roles */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Shield size={24} color="#8b5cf6" />
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Seguridad y Roles</h2>
          </div>
          <div style={{ fontSize: '0.9rem', color: '#475569' }}>
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 8px', fontWeight: 600 }}>Roles del Sistema</h4>
              {[
                { role: 'Admin', desc: 'Acceso completo a todas las secciones', color: '#dc2626' },
                { role: 'Moderador', desc: 'Todo excepto Configuración', color: '#ea580c' },
                { role: 'Empleado', desc: 'Solo perfil, turnos y vacaciones propios', color: '#2563eb' },
              ].map((r) => (
                <div key={r.role} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                  <Users size={14} color={r.color} />
                  <strong style={{ color: r.color }}>{r.role}</strong>
                  <span style={{ color: '#94a3b8' }}>— {r.desc}</span>
                </div>
              ))}
            </div>

            <div>
              <h4 style={{ margin: '0 0 8px', fontWeight: 600 }}>Políticas de Seguridad</h4>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#64748b', fontSize: '0.85rem' }}>
                <li>Tokens JWT con expiración de 30 minutos</li>
                <li>Refresh tokens en cookies HttpOnly</li>
                <li>Rate limiting: 10 req/min en login</li>
                <li>Contraseñas: mín. 8 caracteres, mayúscula, minúscula, dígito</li>
                <li>Headers de seguridad: CSP, HSTS, X-Frame-Options</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
