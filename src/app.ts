import { envs } from './config';
import { testDbConnection } from './data';
import { Server } from './presentation/server';


import { FastifyInstance } from 'fastify';

import { AppRoutes } from './presentation/routes';

(async () => {
  try {
    // Verificar conexión con la BD antes de levantar el server
    await testDbConnection();

    const server = new Server({
      port: envs.PORT,
    });

    await server.start();
  } catch (error) {
    console.error('Error al iniciar SGCF:', error);
    process.exit(1);
  }
})();
