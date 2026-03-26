import { BookOpen, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import type { LearningModule, ProgressStatus } from '@optionsranker/shared';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface LessonCardProps {
  module: LearningModule;
  progress?: ProgressStatus;
  onClick: () => void;
}

const difficultyColors: Record<string, 'profit' | 'warning' | 'loss'> = {
  beginner: 'profit',
  intermediate: 'warning',
  advanced: 'loss',
};

const categoryLabels: Record<string, string> = {
  fundamentals: 'Fundamentals',
  greeks: 'Greeks',
  strategies: 'Strategies',
  risk: 'Risk Management',
};

export function LessonCard({ module, progress, onClick }: LessonCardProps) {
  const isCompleted = progress === 'completed';
  const isInProgress = progress === 'in_progress';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left bg-slate-800 border rounded-xl p-5 transition-all duration-200',
        'hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50',
        isCompleted
          ? 'border-emerald-500/30'
          : isInProgress
          ? 'border-amber-500/30'
          : 'border-slate-700/50 hover:border-slate-600/50',
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
          ) : isInProgress ? (
            <Clock className="h-5 w-5 text-amber-400 flex-shrink-0" />
          ) : (
            <BookOpen className="h-5 w-5 text-slate-500 flex-shrink-0" />
          )}
          <h3 className="text-sm font-semibold text-slate-100">{module.title}</h3>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-600 flex-shrink-0 mt-0.5" />
      </div>

      {module.description && (
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-3 pl-7">
          {module.description}
        </p>
      )}

      <div className="flex items-center gap-2 pl-7">
        <Badge variant={difficultyColors[module.difficulty]}>
          {module.difficulty}
        </Badge>
        <Badge variant="info">{categoryLabels[module.category]}</Badge>
      </div>
    </button>
  );
}
