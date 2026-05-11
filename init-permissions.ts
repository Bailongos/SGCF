import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initPermissions() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Creating permissions tables...');
    
    // 1. Create permisos table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "control financiero".permisos (
        id_permiso SERIAL PRIMARY KEY,
        clave VARCHAR(100) NOT NULL UNIQUE,
        descripcion TEXT,
        categoria VARCHAR(50)
      )
    `);
    
    // 2. Create rol_permisos table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "control financiero".rol_permisos (
        id_rol INTEGER NOT NULL REFERENCES "control financiero".roles(id_rol) ON DELETE CASCADE,
        id_permiso INTEGER NOT NULL REFERENCES "control financiero".permisos(id_permiso) ON DELETE CASCADE,
        PRIMARY KEY (id_rol, id_permiso)
      )
    `);
    
    // 3. Create usuario_permisos table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "control financiero".usuario_permisos (
        id_usuario INTEGER NOT NULL REFERENCES "control financiero".usuarios(id_usuario) ON DELETE CASCADE,
        id_permiso INTEGER NOT NULL REFERENCES "control financiero".permisos(id_permiso) ON DELETE CASCADE,
        otorgado BOOLEAN NOT NULL DEFAULT TRUE,
        PRIMARY KEY (id_usuario, id_permiso)
      )
    `);
    
    console.log('Tables created successfully.');
    
    // 4. Insert base permissions
    console.log('Inserting base permissions...');
    const permissions = [
      ['view.inicio', 'Ver página de inicio', 'view'],
      ['view.alumnos', 'Ver alumnos', 'view'],
      ['view.dashboard.alumnos', 'Ver dashboard de alumnos', 'view'],
      ['view.pagos', 'Ver pagos', 'view'],
      ['view.observaciones', 'Ver observaciones', 'view'],
      ['view.becas', 'Ver becas', 'view'],
      ['view.reportes', 'Ver reportes', 'view'],
      ['view.usuarios', 'Ver usuarios', 'view'],
      ['view.roles', 'Ver roles', 'view'],
      ['view.carreras', 'Ver carreras', 'view'],
      ['action.alumno.create', 'Crear alumnos', 'action'],
      ['action.alumno.edit', 'Editar alumnos', 'action'],
      ['action.alumno.delete', 'Eliminar alumnos', 'action'],
      ['action.pago.create', 'Crear pagos', 'action'],
      ['action.pago.edit', 'Editar pagos', 'action'],
      ['action.observacion.create', 'Crear observaciones', 'action'],
      ['action.observacion.edit', 'Editar observaciones', 'action'],
      ['action.usuario.create', 'Crear usuarios', 'action'],
      ['action.usuario.edit', 'Editar usuarios', 'action'],
      ['action.usuario.delete', 'Eliminar usuarios', 'action'],
      ['action.beca.create', 'Crear becas', 'action'],
      ['action.beca.edit', 'Editar becas', 'action'],
      ['admin.full', 'Acceso total (admin)', 'admin'],
    ];
    
    for (const [clave, descripcion, categoria] of permissions) {
      await client.query(
        `INSERT INTO "control financiero".permisos (clave, descripcion, categoria)
         VALUES ($1, $2, $3)
         ON CONFLICT (clave) DO NOTHING`,
        [clave, descripcion, categoria]
      );
    }
    
    console.log(`${permissions.length} permissions inserted.`);
    
    // 5. Assign permissions to roles
    console.log('Assigning permissions to roles...');
    
    // Get role IDs
    const rolesRes = await client.query(
      `SELECT id_rol, nombre_rol FROM "control financiero".roles`
    );
    const roles = rolesRes.rows;
    console.log('Found roles:', roles);
    
    // Admin gets all permissions
    const adminRole = roles.find((r: any) => r.nombre_rol === 'Administrador');
    if (adminRole) {
      console.log(`Assigning all permissions to Administrador (ID: ${adminRole.id_rol})`);
      await client.query(
        `INSERT INTO "control financiero".rol_permisos (id_rol, id_permiso)
         SELECT $1, id_permiso FROM "control financiero".permisos
         ON CONFLICT DO NOTHING`,
        [adminRole.id_rol]
      );
    }
    
    // Coordinador gets most view and action permissions (except admin)
    const coordRole = roles.find((r: any) => r.nombre_rol === 'Coordinador');
    if (coordRole) {
      console.log(`Assigning coordinator permissions to Coordinador (ID: ${coordRole.id_rol})`);
      const coordPerms = [
        'view.inicio', 'view.alumnos', 'view.dashboard.alumnos', 'view.pagos', 
        'view.observaciones', 'view.becas',
        'action.alumno.create', 'action.alumno.edit', 'action.pago.create', 
        'action.observacion.create', 'action.beca.create'
      ];
      
      for (const clave of coordPerms) {
        const permRes = await client.query(
          `SELECT id_permiso FROM "control financiero".permisos WHERE clave = $1`,
          [clave]
        );
        if (permRes.rows.length > 0) {
          await client.query(
            `INSERT INTO "control financiero".rol_permisos (id_rol, id_permiso)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [coordRole.id_rol, permRes.rows[0].id_permiso]
          );
        }
      }
    }
    
    // Caja (cash) gets limited permissions
    const cajaRole = roles.find((r: any) => r.nombre_rol === 'Caja');
    if (cajaRole) {
      console.log(`Assigning cashier permissions to Caja (ID: ${cajaRole.id_rol})`);
      const cajaPerms = ['view.inicio', 'view.alumnos', 'view.pagos', 'action.pago.create'];
      
      for (const clave of cajaPerms) {
        const permRes = await client.query(
          `SELECT id_permiso FROM "control financiero".permisos WHERE clave = $1`,
          [clave]
        );
        if (permRes.rows.length > 0) {
          await client.query(
            `INSERT INTO "control financiero".rol_permisos (id_rol, id_permiso)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [cajaRole.id_rol, permRes.rows[0].id_permiso]
          );
        }
      }
    }
    
    // Pendiente (pending) gets minimal permissions
    const pendingRole = roles.find((r: any) => r.nombre_rol === 'Pendiente');
    if (pendingRole) {
      console.log(`Assigning minimal permissions to Pendiente (ID: ${pendingRole.id_rol})`);
      const pendingPerms = ['view.inicio'];
      
      for (const clave of pendingPerms) {
        const permRes = await client.query(
          `SELECT id_permiso FROM "control financiero".permisos WHERE clave = $1`,
          [clave]
        );
        if (permRes.rows.length > 0) {
          await client.query(
            `INSERT INTO "control financiero".rol_permisos (id_rol, id_permiso)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [pendingRole.id_rol, permRes.rows[0].id_permiso]
          );
        }
      }
    }
    
    console.log('Permissions assigned to roles.');
    
    await client.query('COMMIT');
    console.log('✅ Permissions initialized successfully!');
    
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Error initializing permissions:', e);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

initPermissions();
