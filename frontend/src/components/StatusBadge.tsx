// T029: Status badge with color coding
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Activo: { bg: '#dcfce7', text: '#16a34a' },
  Vacaciones: { bg: '#dbeafe', text: '#2563eb' },
  Ausente: { bg: '#fef3c7', text: '#d97706' },
  Inactivo: { bg: '#f3f4f6', text: '#6b7280' },
  Pendiente: { bg: '#fef3c7', text: '#d97706' },
  Aprobado: { bg: '#dcfce7', text: '#16a34a' },
  Rechazado: { bg: '#fecaca', text: '#dc2626' },
  Cancelado: { bg: '#f3f4f6', text: '#6b7280' },
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] || { bg: '#f3f4f6', text: '#6b7280' };
  return (
    <span style={{
      display: 'inline-block', padding: '4px 12px', borderRadius: 9999,
      fontSize: '0.75rem', fontWeight: 600,
      background: colors.bg, color: colors.text,
    }}>
      {status}
    </span>
  );
}
