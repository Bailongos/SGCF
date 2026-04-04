import { dbPool } from './src/data';

async function diagnose() {
  console.log('=== SGCF Database Diagnostic ===\n');

  // 1. Check users
  console.log('1. USUARIOS:');
  const users = await dbPool.query(
    'SELECT id_usuario, username, email, id_rol, id_carrera, activo FROM "control financiero".usuarios ORDER BY id_usuario'
  );
  console.table(users.rows);

  // 2. Check roles
  console.log('\n2. ROLES:');
  const roles = await dbPool.query('SELECT * FROM "control financiero".roles ORDER BY id_rol');
  console.table(roles.rows);

  // 3. Check carreras
  console.log('\n3. CARRERAS:');
  const carreras = await dbPool.query('SELECT * FROM "control financiero".carreras');
  console.log(carreras.rows.length === 0 ? '⚠️  Tabla VACÍA - No hay carreras registradas' : '');
  if (carreras.rows.length > 0) console.table(carreras.rows);

  // 4. Check identidades OAuth
  console.log('\n4. IDENTIDADES OAUTH:');
  const identities = await dbPool.query('SELECT * FROM "control financiero".usuarios_identidades');
  if (identities.rows.length === 0) console.log('ℹ️  Sin registros OAuth aún');
  else console.table(identities.rows);

  // 5. Check bitacora
  console.log('\n5. BITÁCORA (últimos 5):');
  const logs = await dbPool.query('SELECT * FROM "control financiero".bitacora_auditoria ORDER BY id_log DESC LIMIT 5');
  if (logs.rows.length === 0) console.log('ℹ️  Sin registros de auditoría');
  else console.table(logs.rows);

  // 6. Check envs
  console.log('\n6. ENVIRONMENT CHECK:');
  const { envs } = await import('./src/config/envs');
  console.log(`- GOOGLE_CLIENT_ID: ${envs.GOOGLE_CLIENT_ID ? envs.GOOGLE_CLIENT_ID.substring(0, 15) + '...' : '❌ NOT SET'}`);
  console.log(`- MICROSOFT_CLIENT_ID: ${envs.MICROSOFT_CLIENT_ID || '❌ NOT SET'}`);
  console.log(`- MICROSOFT_TENANT_ID: ${envs.MICROSOFT_TENANT_ID || '❌ NOT SET (using common)'}`);

  await dbPool.end();
}

diagnose();
