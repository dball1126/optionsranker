import { cn } from '@/lib/utils';

type BadgeVariant = 'profit' | 'loss' | 'neutral' | 'info' | 'warning';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  profit: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  loss: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  neutral: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
