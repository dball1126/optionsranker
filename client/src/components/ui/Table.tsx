import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TableProps {
  children: ReactNode;
  className?: string;
  colSpan?: number;
  rowSpan?: number;
  onClick?: () => void;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-slate-700/50', className)}>
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  );
}

export function TableHead({ children, className }: TableProps) {
  return (
    <thead className={cn('bg-slate-800/80 text-xs text-slate-400 uppercase tracking-wider', className)}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className }: TableProps) {
  return <tbody className={cn('divide-y divide-slate-700/50', className)}>{children}</tbody>;
}

export function TableRow({ children, className }: TableProps) {
  return (
    <tr className={cn('bg-slate-800 hover:bg-slate-700/50 transition-colors', className)}>
      {children}
    </tr>
  );
}

export function TableHeader({ children, className, colSpan, rowSpan }: TableProps) {
  return (
    <th className={cn('px-4 py-3 font-medium', className)} colSpan={colSpan} rowSpan={rowSpan}>{children}</th>
  );
}

export function TableCell({ children, className, colSpan, rowSpan, onClick }: TableProps) {
  return (
    <td className={cn('px-4 py-3 text-slate-300', className)} colSpan={colSpan} rowSpan={rowSpan} onClick={onClick}>{children}</td>
  );
}
