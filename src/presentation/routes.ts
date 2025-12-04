import { FastifyInstance } from 'fastify';
import alumnosRoutes from './alumnos/alumnos.routes';

export class AppRoutes {
  static register(app: FastifyInstance) {
    // Aquí registras todos tus módulos
    app.register(alumnosRoutes, { prefix: '/api/alumnos' });

    // luego podrás agregar:
    // app.register(carrerasRoutes, { prefix: '/api/carreras' });
    // app.register(pagosRoutes, { prefix: '/api/pagos' });
  }
}
