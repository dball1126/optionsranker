import { cn } from '@/lib/utils';

type BadgeVariant = 'profit' | 'loss' | 'neutral' | 'info' | 'warning' | 'success' | 'destructive' | 'secondary' | 'default' | 'outline';

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
  success: 'bg-green-500/10 text-green-400 border-green-500/20',
  destructive: 'bg-red-500/10 text-red-400 border-red-500/20',
  secondary: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  default: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  outline: 'bg-transparent text-gray-600 border-gray-300',
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
