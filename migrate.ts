import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Add id_carrera if it doesn't exist
    await client.query(`
      ALTER TABLE "control financiero".usuarios 
      ADD COLUMN IF NOT EXISTS id_carrera INTEGER REFERENCES "control financiero".carreras(id_carrera);
    `);

    // Drop matricula_alumno if it exists
    await client.query(`
      ALTER TABLE "control financiero".usuarios 
      DROP COLUMN IF EXISTS matricula_alumno;
    `);

    // Update 'Alumno' role to 'Coordinador'
    await client.query(`
      UPDATE "control financiero".roles 
      SET nombre_rol = 'Coordinador' 
      WHERE nombre_rol = 'Alumno';
    `);

    // Fix cuentas_por_cobrar constraint
    await client.query(`
      DO $$ 
      BEGIN
          -- 1. Ensure all current concepts exist in the conceptos table
          INSERT INTO "control financiero".conceptos (clave, descripcion)
          SELECT DISTINCT concepto, concepto 
          FROM "control financiero".cuentas_por_cobrar
          WHERE concepto NOT IN (SELECT clave FROM "control financiero".conceptos)
          ON CONFLICT (clave) DO NOTHING;

          -- 2. Drop the old check constraint
          ALTER TABLE "control financiero".cuentas_por_cobrar 
          DROP CONSTRAINT IF EXISTS cuentas_por_cobrar_concepto_check;

          -- 3. Add the foreign key
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'fk_cuentas_por_cobrar_concepto'
          ) THEN
              ALTER TABLE "control financiero".cuentas_por_cobrar
              ADD CONSTRAINT fk_cuentas_por_cobrar_concepto
              FOREIGN KEY (concepto) 
              REFERENCES "control financiero".conceptos(clave)
              ON UPDATE CASCADE;
          END IF;
      END $$;
    `);

    console.log('Migration completed successfully.');
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
