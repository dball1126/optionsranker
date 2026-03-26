import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercent = true,
  size = 'md',
  className,
}: ProgressBarProps) {
  const percent = Math.min(Math.round((value / max) * 100), 100);

  const heightStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-sm text-slate-400">{label}</span>}
          {showPercent && (
            <span className="text-sm font-medium text-slate-300">{percent}%</span>
          )}
        </div>
      )}
      <div className={cn('w-full bg-slate-700/50 rounded-full overflow-hidden', heightStyles[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            percent >= 100
              ? 'bg-emerald-500'
              : percent >= 50
              ? 'bg-emerald-600'
              : percent >= 25
              ? 'bg-amber-500'
              : 'bg-blue-500',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
