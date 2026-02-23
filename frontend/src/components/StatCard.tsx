// T029: Reusable stat card
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: string;
}

export default function StatCard({ title, value, icon, color = '#3b82f6' }: StatCardProps) {
  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{ background: `${color}20`, borderRadius: 12, padding: 12, color }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{title}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>{value}</div>
      </div>
    </div>
  );
}
