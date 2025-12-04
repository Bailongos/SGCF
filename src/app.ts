import { envs } from './config';
import { testDbConnection } from './data';
import { Server } from './presentation/server';


import { FastifyInstance } from 'fastify';

import alumnosRoutes from '../src/presentation/alumnos/alumnos.routes';
import carrerasRoutes from '../src/presentation/carrera/carrera.routes';
import rolesRoutes from '../src/presentation/roles/roles.routes';
import metodosPagoRoutes from '../src/presentation/metodo-pago/metodo-pago.routes';
import ciclosRoutes from './presentation/ciclos-escolares/ciclos-escolares.routes';
import conceptosRoutes from '../src/presentation/conceptos/conceptos.routes';
import becasRoutes from '../src/presentation/becas/becas.routes';
import usuariosRoutes from '../src/presentation/usuarios/usuarios.routes';
import observacionesRoutes from '../src/presentation/obsercaciones/observaciones.routes';
import cuentasRoutes from '../src/presentation/cuentas/cuentas.routes';
import pagosRoutes from '../src/presentation/pagos/pagos.routes';
import bitacoraRoutes from '../src/presentation/bitacora/bitacora.routes';

export class AppRoutes {
  static register(app: FastifyInstance) {
    app.register(alumnosRoutes, { prefix: '/api/alumnos' });
    app.register(carrerasRoutes, { prefix: '/api/carreras' });
    app.register(rolesRoutes, { prefix: '/api/roles' });
    app.register(metodosPagoRoutes, { prefix: '/api/metodos-pago' });
    app.register(ciclosRoutes, { prefix: '/api/ciclos-escolares' });
    app.register(conceptosRoutes, { prefix: '/api/conceptos' });
    app.register(becasRoutes, { prefix: '/api/becas' });
    app.register(usuariosRoutes, { prefix: '/api/usuarios' });
    app.register(observacionesRoutes, { prefix: '/api/observaciones' });
    app.register(cuentasRoutes, { prefix: '/api/cuentas' });
    app.register(pagosRoutes, { prefix: '/api/pagos' });
    app.register(bitacoraRoutes, { prefix: '/api/bitacora' });
  }
}


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
