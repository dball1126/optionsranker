import { STRATEGY_TEMPLATES } from '@optionsranker/shared';
import type { StrategyTemplate } from '@optionsranker/shared';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { useStrategyStore } from '@/stores/strategyStore';

const sentimentColors: Record<string, 'profit' | 'loss' | 'neutral' | 'info'> = {
  bullish: 'profit',
  bearish: 'loss',
  neutral: 'neutral',
  volatile: 'info',
};

const difficultyLabels: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export function StrategySelector() {
  const { selectedStrategy, selectStrategy, setCustom } = useStrategyStore();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300">Select Strategy</h3>
        <button
          onClick={setCustom}
          className={cn(
            'text-xs px-3 py-1 rounded-md transition-colors',
            !selectedStrategy
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
          )}
        >
          Custom
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {STRATEGY_TEMPLATES.map((template) => (
          <StrategyCard
            key={template.type}
            template={template}
            isSelected={selectedStrategy?.type === template.type}
            onClick={() => selectStrategy(template)}
          />
        ))}
      </div>
    </div>
  );
}

function StrategyCard({
  template,
  isSelected,
  onClick,
}: {
  template: StrategyTemplate;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-left p-3 rounded-lg border transition-all duration-200',
        isSelected
          ? 'bg-emerald-600/10 border-emerald-500/30 ring-1 ring-emerald-500/20'
          : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="text-sm font-medium text-slate-100">{template.name}</h4>
        <Badge variant={sentimentColors[template.sentiment]}>
          {template.sentiment}
        </Badge>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{template.description}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-slate-500">{difficultyLabels[template.difficulty]}</span>
        <span className="text-xs text-slate-600">|</span>
        <span className="text-xs text-slate-500">{template.legs.length} leg{template.legs.length > 1 ? 's' : ''}</span>
      </div>
    </button>
  );
}
