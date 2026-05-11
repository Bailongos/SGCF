import { dbPool } from './src/data';
import dotenv from 'dotenv';
dotenv.config();

async function checkRol9() {
  try {
    console.log('=== Checking Role 9 Details ===');
    
    // Check role name for id 9
    const roleRes = await dbPool.query('SELECT * FROM "control financiero".roles WHERE id_rol = 9');
    if (roleRes.rows.length > 0) {
      console.log('Role with ID 9:', roleRes.rows[0]);
    } else {
      console.log('❌ Role with ID 9 NOT FOUND');
      
      // List all roles to see what exists
      const allRoles = await dbPool.query('SELECT * FROM "control financiero".roles ORDER BY id_rol');
      console.log('Available Roles:');
      console.table(allRoles.rows);
    }

    // Check users with rol 9
    console.log('\n=== Users with Role 9 ===');
    const usersRes = await dbPool.query(`
      SELECT id_usuario, username, email, id_rol, id_carrera, activo 
      FROM "control financiero".usuarios 
      WHERE id_rol = 9
    `);
    if (usersRes.rows.length > 0) {
      console.table(usersRes.rows);
    } else {
      console.log('No users found with role 9.');
    }

    // Check if there is ANY user with id_carrera IS NULL (potential global admins)
    console.log('\n=== Users with Global Access (id_carrera IS NULL) ===');
    const globalUsers = await dbPool.query(`
      SELECT u.id_usuario, u.username, r.nombre_rol, u.id_carrera
      FROM "control financiero".usuarios u
      JOIN "control financiero".roles r ON u.id_rol = r.id_rol
      WHERE u.id_carrera IS NULL
    `);
    console.table(globalUsers.rows);

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await dbPool.end();
  }
}

checkRol9();
