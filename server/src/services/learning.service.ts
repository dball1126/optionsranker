import * as learningQueries from '../db/queries/learning.js';
import { notFound } from '../utils/errors.js';
import type { LearningModule, LearningProgress, UserLearningOverview } from '@optionsranker/shared';

function toModule(row: any): LearningModule {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    description: row.description,
    difficulty: row.difficulty,
    sortOrder: row.sort_order,
    content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
  };
}

function toProgress(row: any): LearningProgress {
  return {
    id: row.id,
    userId: row.user_id,
    moduleId: row.module_id,
    status: row.status,
    quizScore: row.quiz_score,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

export function getAllModules(category?: string): LearningModule[] {
  const rows = category
    ? learningQueries.findModulesByCategory(category)
    : learningQueries.findAllModules();
  return rows.map(toModule);
}

export function getModuleById(id: number): LearningModule {
  const row = learningQueries.findModuleById(id);
  if (!row) throw notFound('Learning module not found');
  return toModule(row);
}

export function getModuleBySlug(slug: string): LearningModule {
  const row = learningQueries.findModuleBySlug(slug);
  if (!row) throw notFound('Learning module not found');
  return toModule(row);
}

export function getUserProgress(userId: number): LearningProgress[] {
  return learningQueries.findProgressByUserId(userId).map(toProgress);
}

export function getUserLearningOverview(userId: number): UserLearningOverview {
  const stats = learningQueries.getProgressStats(userId);
  const progressRows = learningQueries.findProgressByUserId(userId);
  const allModules = learningQueries.findAllModules();

  const progress = progressRows.map(p => {
    const moduleRow = allModules.find(m => m.id === p.module_id);
    return {
      ...toProgress(p),
      module: moduleRow ? toModule(moduleRow) : toModule({ ...p, slug: '', title: '', category: '', description: null, difficulty: 'beginner', sort_order: 0, content: '{}' }),
    };
  });

  return {
    totalModules: stats.total_modules,
    completedModules: stats.completed_modules,
    inProgressModules: stats.in_progress_modules,
    averageQuizScore: stats.average_quiz_score ? Math.round(stats.average_quiz_score * 100) / 100 : null,
    progress,
  };
}

export function updateProgress(userId: number, moduleId: number, data: {
  status: string;
  quizScore?: number;
}): LearningProgress {
  // Verify module exists
  const module = learningQueries.findModuleById(moduleId);
  if (!module) throw notFound('Learning module not found');

  const row = learningQueries.upsertProgress({
    userId,
    moduleId,
    status: data.status,
    quizScore: data.quizScore,
  });

  return toProgress(row);
}
