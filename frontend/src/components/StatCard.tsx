// T029: Reusable stat card
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: string;
}

const colorClasses: Record<string, string> = {
  indigo: 'text-primary bg-primary/10',
  green: 'text-success bg-success/10',
  red: 'text-error bg-error/10',
  yellow: 'text-warning bg-warning/10',
};

export default function StatCard({ title, value, icon, color = 'indigo' }: StatCardProps) {
  const bgColor = colorClasses[color] || colorClasses.indigo;

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body flex-row items-center gap-4 p-4">
        <div className={`${bgColor} rounded-lg p-3`}>
          {icon}
        </div>
        <div>
          <div className="text-xs opacity-60">{title}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </div>
    </div>
  );
}
