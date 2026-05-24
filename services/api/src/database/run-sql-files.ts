import { existsSync } from 'node:fs';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { Pool } from 'pg';

export async function runSqlFiles(directory: string) {
  const apiEnvPath = join(__dirname, '../../.env');
  const rootEnvPath = join(__dirname, '../../../.env');

  if (existsSync(rootEnvPath)) {
    loadEnv({ path: rootEnvPath });
  }
  if (existsSync(apiEnvPath)) {
    loadEnv({ path: apiEnvPath, override: true });
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const files = readdirSync(directory)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const sql = readFileSync(join(directory, file), 'utf8');
      console.log(`Running ${file}`);
      await pool.query(sql);
    }
  } finally {
    await pool.end();
  }
}
