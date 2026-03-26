export type LearningCategory = 'greeks' | 'strategies' | 'risk' | 'fundamentals';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface LearningModule {
  id: number;
  slug: string;
  title: string;
  category: LearningCategory;
  description: string | null;
  difficulty: Difficulty;
  sortOrder: number;
  content: ModuleContent;
}

export interface ModuleContent {
  sections: ContentSection[];
}

export interface ContentSection {
  type: 'text' | 'interactive' | 'quiz';
  title: string;
  body?: string;
  quiz?: QuizQuestion[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LearningProgress {
  id: number;
  userId: number;
  moduleId: number;
  status: ProgressStatus;
  quizScore: number | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface UserLearningOverview {
  totalModules: number;
  completedModules: number;
  inProgressModules: number;
  averageQuizScore: number | null;
  progress: (LearningProgress & { module: LearningModule })[];
}
