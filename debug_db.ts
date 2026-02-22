import { dbPool } from './src/data';
import dotenv from 'dotenv';
dotenv.config();

async function debug() {
  try {
    console.log('--- Checking Constraints on cuentas_por_cobrar ---');
    const constraints = await dbPool.query(`
      SELECT conname, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conrelid = '"control financiero".cuentas_por_cobrar'::regclass;
    `);
    console.table(constraints.rows);

    console.log('\n--- Checking concepts in conceptos table ---');
    const concepts = await dbPool.query(`
      SELECT * FROM "control financiero".conceptos;
    `);
    console.table(concepts.rows);

    console.log('\n--- Checking if "dataweek" exists ---');
    const dataweek = await dbPool.query(`
      SELECT * FROM "control financiero".conceptos WHERE clave = 'dataweek';
    `);
    console.log(dataweek.rows.length > 0 ? '✅ dataweek exists' : '❌ dataweek MISSING');

  } catch (err) {
    console.error('Error debugging DB:', err);
  } finally {
    await dbPool.end();
  }
}

debug();
