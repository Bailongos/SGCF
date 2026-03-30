import { dbPool } from './src/data';

async function updateAdmin() {
  try {
    const hash = '$2b$10$2qpnswc97tbwpHRTTkSZr.NPP./14J1N.nvmgppHOHwX9GKLTkOP9i';
    await dbPool.query('UPDATE "control financiero".usuarios SET password = $1 WHERE username = $2', [hash, 'admin']);
    console.log('Admin password updated successfully');
  } catch (e) {
    console.error(e);
  } finally {
    await dbPool.end();
  }
}

updateAdmin();
