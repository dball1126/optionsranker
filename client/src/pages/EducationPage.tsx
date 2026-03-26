import { useState, useEffect } from 'react';
import type { LearningModule, LearningProgress, LearningCategory, ContentSection } from '@optionsranker/shared';
import { ArrowLeft } from 'lucide-react';
import { learningApi } from '@/api/learning';
import { Tabs } from '@/components/ui/Tabs';
import { LessonCard } from '@/components/education/LessonCard';
import { ProgressBar } from '@/components/education/ProgressBar';
import { QuizQuestion } from '@/components/education/QuizQuestion';
import { GreekExplainer } from '@/components/education/GreekExplainer';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/stores/authStore';

const CATEGORY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'fundamentals', label: 'Fundamentals' },
  { id: 'greeks', label: 'Greeks' },
  { id: 'strategies', label: 'Strategies' },
  { id: 'risk', label: 'Risk Management' },
];

export function EducationPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = !!accessToken;
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [progressMap, setProgressMap] = useState<Record<number, LearningProgress>>({});
  const [selectedModule, setSelectedModule] = useState<LearningModule | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [totalCompleted, setTotalCompleted] = useState(0);

  useEffect(() => {
    loadModules();
    if (isAuthenticated) loadProgress();
  }, [isAuthenticated]);

  const loadModules = async () => {
    setIsLoading(true);
    try {
      const response = await learningApi.getModules();
      setModules(response.data);
    } catch {
      // Show empty state
    } finally {
      setIsLoading(false);
    }
  };

  const loadProgress = async () => {
    try {
      const response = await learningApi.getProgress();
      const map: Record<number, LearningProgress> = {};
      response.data.progress.forEach((p) => {
        map[p.moduleId] = p;
      });
      setProgressMap(map);
      setTotalCompleted(response.data.completedModules);
    } catch {
      // Silently handle
    }
  };

  const filteredModules = activeCategory === 'all'
    ? modules
    : modules.filter((m) => m.category === activeCategory);

  if (selectedModule) {
    return (
      <ModuleReader
        module={selectedModule}
        onBack={() => setSelectedModule(null)}
        onComplete={loadProgress}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Options Education</h1>
        <p className="text-sm text-slate-400 mt-1">
          Learn options trading from fundamentals to advanced strategies
        </p>
      </div>

      {/* Progress overview */}
      {isAuthenticated && modules.length > 0 && (
        <Card>
          <CardBody>
            <ProgressBar
              value={totalCompleted}
              max={modules.length}
              label={`${totalCompleted} of ${modules.length} modules completed`}
              size="md"
            />
          </CardBody>
        </Card>
      )}

      {/* Category tabs */}
      <Tabs
        tabs={CATEGORY_TABS}
        activeTab={activeCategory}
        onChange={setActiveCategory}
      />

      {/* Module grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredModules.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-500">No modules found in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModules.map((module) => (
            <LessonCard
              key={module.id}
              module={module}
              progress={progressMap[module.id]?.status}
              onClick={() => setSelectedModule(module)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleReader({
  module,
  onBack,
  onComplete,
}: {
  module: LearningModule;
  onBack: () => void;
  onComplete: () => void;
}) {
  const [quizScore, setQuizScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  useEffect(() => {
    // Count total quiz questions
    let count = 0;
    module.content.sections.forEach((section) => {
      if (section.quiz) count += section.quiz.length;
    });
    setTotalQuestions(count);
  }, [module]);

  const handleQuizAnswer = (isCorrect: boolean) => {
    if (isCorrect) setQuizScore((s) => s + 1);

    // Check if all questions answered
    const answeredSoFar = quizScore + (isCorrect ? 1 : 0);
    // This is approximate; we track completion when all quiz sections are done
  };

  const handleMarkComplete = async () => {
    try {
      const score = totalQuestions > 0 ? Math.round((quizScore / totalQuestions) * 100) : 100;
      await learningApi.updateProgress(module.id, {
        status: 'completed',
        quizScore: score,
      });
      onComplete();
      onBack();
    } catch {
      // Handle error
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Modules
      </button>

      <div>
        <h1 className="text-2xl font-bold text-slate-100">{module.title}</h1>
        {module.description && (
          <p className="text-sm text-slate-400 mt-2">{module.description}</p>
        )}
      </div>

      {module.content.sections.map((section, i) => (
        <SectionRenderer key={i} section={section} onQuizAnswer={handleQuizAnswer} />
      ))}

      {/* Interactive Greek explainer for Greek modules */}
      {module.category === 'greeks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GreekExplainer greekName="delta" />
          <GreekExplainer greekName="gamma" />
        </div>
      )}

      <div className="flex justify-center pt-4">
        <Button size="lg" onClick={handleMarkComplete}>
          Mark as Complete
        </Button>
      </div>
    </div>
  );
}

function SectionRenderer({
  section,
  onQuizAnswer,
}: {
  section: ContentSection;
  onQuizAnswer: (isCorrect: boolean) => void;
}) {
  if (section.type === 'quiz' && section.quiz) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-100">{section.title}</h2>
        </CardHeader>
        <CardBody className="space-y-6">
          {section.quiz.map((q, i) => (
            <QuizQuestion
              key={i}
              question={q}
              questionNumber={i + 1}
              onAnswer={onQuizAnswer}
            />
          ))}
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-slate-100">{section.title}</h2>
      </CardHeader>
      <CardBody>
        {section.body && (
          <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {section.body}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
