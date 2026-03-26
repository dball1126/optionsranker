import { useState } from 'react';
import type { QuizQuestion as QuizQuestionType } from '@optionsranker/shared';
import { CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuizQuestionProps {
  question: QuizQuestionType;
  questionNumber: number;
  onAnswer: (isCorrect: boolean) => void;
}

export function QuizQuestion({ question, questionNumber, onAnswer }: QuizQuestionProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleSelect = (index: number) => {
    if (showResult) return;
    setSelectedIndex(index);
    setShowResult(true);
    onAnswer(index === question.correctIndex);
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-slate-100">
        <span className="text-slate-500 mr-2">Q{questionNumber}.</span>
        {question.question}
      </h4>

      <div className="space-y-2">
        {question.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrect = index === question.correctIndex;
          const showCorrectness = showResult;

          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={showResult}
              className={cn(
                'w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg border text-sm transition-all duration-200',
                !showCorrectness && 'hover:bg-slate-700/50 hover:border-slate-600',
                !showCorrectness && 'border-slate-700/50 bg-slate-800/50',
                showCorrectness && isCorrect && 'bg-emerald-500/10 border-emerald-500/30',
                showCorrectness && isSelected && !isCorrect && 'bg-rose-500/10 border-rose-500/30',
                showCorrectness && !isSelected && !isCorrect && 'border-slate-700/30 opacity-50',
                'disabled:cursor-default',
              )}
            >
              <span
                className={cn(
                  'flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium',
                  showCorrectness && isCorrect
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                    : showCorrectness && isSelected && !isCorrect
                    ? 'border-rose-500 bg-rose-500/20 text-rose-400'
                    : 'border-slate-600 text-slate-400',
                )}
              >
                {showCorrectness && isCorrect ? (
                  <CheckCircle className="h-4 w-4" />
                ) : showCorrectness && isSelected && !isCorrect ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  String.fromCharCode(65 + index)
                )}
              </span>
              <span
                className={cn(
                  'text-sm',
                  showCorrectness && isCorrect ? 'text-emerald-300' : 'text-slate-300',
                )}
              >
                {option}
              </span>
            </button>
          );
        })}
      </div>

      {showResult && (
        <div
          className={cn(
            'p-3 rounded-lg text-sm',
            selectedIndex === question.correctIndex
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-amber-500/10 border border-amber-500/20 text-amber-300',
          )}
        >
          {question.explanation}
        </div>
      )}
    </div>
  );
}
