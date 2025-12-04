import { Pool } from 'pg';
import { envs } from '../config';

export const dbPool = new Pool({
  connectionString: envs.DATABASE_URL,
});

export async function testDbConnection() {
  // Simple ping
  await dbPool.query('SELECT 1');
}
