import Card from './ui/Card';

// T029: Reusable stat card
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: string;
}

export default function StatCard({ title, value, icon, color = 'indigo' }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    indigo: 'text-indigo-600 bg-indigo-50',
    green: 'text-green-600 bg-green-50',
    red: 'text-red-600 bg-red-50',
    yellow: 'text-yellow-600 bg-yellow-50',
  };

  const bgColor = colorClasses[color] || colorClasses.indigo;

  return (
    <Card variant="elevated" className="flex items-center gap-4">
      <div className={`${bgColor} rounded-lg p-3`}>
        {icon}
      </div>
      <div>
        <div className="text-xs text-slate-600">{title}</div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
      </div>
    </Card>
  );
}
