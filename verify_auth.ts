import { dbPool } from './src/data';
import dotenv from 'dotenv';
dotenv.config();

async function verifyAuth() {
  console.log('=== Checking Roles and Permissions ===\n');
  try {
    // 1. Check Roles
    console.log('1. ROLES:');
    const roles = await dbPool.query('SELECT * FROM "control financiero".roles ORDER BY id_rol');
    console.table(roles.rows);

    // 2. Check Permissions
    console.log('\n2. PERMISOS (first 10):');
    const perms = await dbPool.query('SELECT * FROM "control financiero".permisos ORDER BY id_permiso LIMIT 10');
    console.table(perms.rows);

    // 3. Check Role-Permissions Mapping
    console.log('\n3. ROL_PERMISOS (count per role):');
    const mapping = await dbPool.query(`
      SELECT r.nombre_rol, COUNT(rp.id_permiso) as total_permisos
      FROM "control financiero".roles r
      LEFT JOIN "control financiero".rol_permisos rp ON r.id_rol = rp.id_rol
      GROUP BY r.nombre_rol
      ORDER BY total_permisos DESC
    `);
    console.table(mapping.rows);

    // 4. Check if Admin has permissions
    console.log('\n4. ADMIN PERMISSIONS SAMPLE:');
    const adminPerms = await dbPool.query(`
      SELECT p.clave, p.descripcion
      FROM "control financiero".permisos p
      JOIN "control financiero".rol_permisos rp ON p.id_permiso = rp.id_permiso
      JOIN "control financiero".roles r ON rp.id_rol = r.id_rol
      WHERE r.nombre_rol = 'Administrador'
      LIMIT 5
    `);
    console.table(adminPerms.rows);

  } catch (err: any) {
    console.error('❌ Error verifying auth in DB:', err.message);
    if (err.code === 'ENOTFOUND') {
      console.error('⚠️ Could not resolve database host. Check your internet connection or the DATABASE_URL in .env');
    }
  } finally {
    await dbPool.end();
  }
}

verifyAuth();
