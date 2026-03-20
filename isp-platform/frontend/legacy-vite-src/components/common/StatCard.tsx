import { ReactNode } from 'react';
import clsx from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  className?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  trend,
  subtitle,
  className,
}: StatCardProps) {
  return (
    <div className={clsx('card', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-dark-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-dark-500">{subtitle}</p>
          )}
          {trend && (
            <div
              className={clsx(
                'mt-2 flex items-center text-sm',
                trend.isPositive ? 'text-success-500' : 'text-danger-500'
              )}
            >
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 mr-1" />
              )}
              <span>{Math.abs(trend.value)}%</span>
              <span className="ml-1 text-dark-400">vs last week</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-primary-600/10 rounded-lg">
            <div className="w-6 h-6 text-primary-400">{icon}</div>
          </div>
        )}
      </div>
    </div>
  );
}