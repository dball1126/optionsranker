import { getDb } from '../connection.js';

interface LearningModuleRow {
  id: number;
  slug: string;
  title: string;
  category: string;
  description: string | null;
  difficulty: string;
  sort_order: number;
  content: string; // JSON string
}

interface LearningProgressRow {
  id: number;
  user_id: number;
  module_id: number;
  status: string;
  quiz_score: number | null;
  completed_at: string | null;
  updated_at: string;
}

export function findAllModules(): LearningModuleRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM learning_modules ORDER BY sort_order ASC').all() as LearningModuleRow[];
}

export function findModuleById(id: number): LearningModuleRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM learning_modules WHERE id = ?').get(id) as LearningModuleRow | undefined;
}

export function findModuleBySlug(slug: string): LearningModuleRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM learning_modules WHERE slug = ?').get(slug) as LearningModuleRow | undefined;
}

export function findModulesByCategory(category: string): LearningModuleRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM learning_modules WHERE category = ? ORDER BY sort_order ASC').all(category) as LearningModuleRow[];
}

export function findProgressByUserId(userId: number): LearningProgressRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM learning_progress WHERE user_id = ? ORDER BY updated_at DESC').all(userId) as LearningProgressRow[];
}

export function findProgressByUserAndModule(userId: number, moduleId: number): LearningProgressRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM learning_progress WHERE user_id = ? AND module_id = ?').get(userId, moduleId) as LearningProgressRow | undefined;
}

export function upsertProgress(data: {
  userId: number;
  moduleId: number;
  status: string;
  quizScore?: number;
}): LearningProgressRow {
  const db = getDb();
  const existing = findProgressByUserAndModule(data.userId, data.moduleId);

  if (existing) {
    const completedAt = data.status === 'completed' ? "datetime('now')" : 'completed_at';
    db.prepare(`
      UPDATE learning_progress
      SET status = ?, quiz_score = COALESCE(?, quiz_score),
          completed_at = ${data.status === 'completed' ? "datetime('now')" : 'completed_at'},
          updated_at = datetime('now')
      WHERE user_id = ? AND module_id = ?
    `).run(data.status, data.quizScore ?? null, data.userId, data.moduleId);
  } else {
    db.prepare(`
      INSERT INTO learning_progress (user_id, module_id, status, quiz_score, completed_at)
      VALUES (?, ?, ?, ?, ${data.status === 'completed' ? "datetime('now')" : 'NULL'})
    `).run(data.userId, data.moduleId, data.status, data.quizScore ?? null);
  }

  return findProgressByUserAndModule(data.userId, data.moduleId)!;
}

export function getProgressStats(userId: number): {
  total_modules: number;
  completed_modules: number;
  in_progress_modules: number;
  average_quiz_score: number | null;
} {
  const db = getDb();

  const totalRow = db.prepare('SELECT COUNT(*) as count FROM learning_modules').get() as { count: number };

  const completedRow = db.prepare(
    "SELECT COUNT(*) as count FROM learning_progress WHERE user_id = ? AND status = 'completed'"
  ).get(userId) as { count: number };

  const inProgressRow = db.prepare(
    "SELECT COUNT(*) as count FROM learning_progress WHERE user_id = ? AND status = 'in_progress'"
  ).get(userId) as { count: number };

  const avgRow = db.prepare(
    'SELECT AVG(quiz_score) as avg_score FROM learning_progress WHERE user_id = ? AND quiz_score IS NOT NULL'
  ).get(userId) as { avg_score: number | null };

  return {
    total_modules: totalRow.count,
    completed_modules: completedRow.count,
    in_progress_modules: inProgressRow.count,
    average_quiz_score: avgRow.avg_score,
  };
}
