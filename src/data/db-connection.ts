import { Pool } from 'pg';
import { envs } from '../config';

export const dbPool = new Pool({
  connectionString: envs.DATABASE_URL,
});

// Configurar search_path global al conectar
dbPool.on('connect', async (client) => {
  await client.query('SET search_path TO "control financiero"');
});

export async function testDbConnection() {
  // Simple ping
  await dbPool.query('SELECT 1');
}
