import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb, closeDb } from './connection.js';
import { applyMigrations } from './migrate.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function setupDatabase(): void {
  const db = getDb();
  const schemaPath = path.resolve(__dirname, '../../src/db/schema.sql');

  let sql: string;
  if (fs.existsSync(schemaPath)) {
    sql = fs.readFileSync(schemaPath, 'utf-8');
  } else {
    // Fallback for compiled output
    const altPath = path.resolve(__dirname, './schema.sql');
    sql = fs.readFileSync(altPath, 'utf-8');
  }

  db.exec(sql);
  logger.info('Database schema applied successfully');

  // Apply migrations using the safer migration script
  applyMigrations();
}

// Run directly
const isMain = process.argv[1] && (
  process.argv[1].endsWith('setup.ts') || process.argv[1].endsWith('setup.js')
);

if (isMain) {
  try {
    setupDatabase();
    logger.info('Database setup complete');
  } catch (error) {
    logger.error('Database setup failed', error);
    process.exit(1);
  } finally {
    closeDb();
  }
}
