// src/presentation/routes.ts
import { FastifyInstance } from 'fastify';

import alumnosRoutes from './alumnos/alumnos.routes';
import carrerasRoutes from './carrera/carrera.routes';
import becasRoutes from './becas/becas.routes';
import rolesRoutes from './roles/roles.routes';
import metodosPagoRoutes from './metodo-pago/metodo-pago.routes';
import ciclosRoutes from './ciclos-escolares/ciclos-escolares.routes';
import conceptosRoutes from './conceptos/conceptos.routes';
import usuariosRoutes from './usuarios/usuarios.routes';
import observacionesRoutes from './obsercaciones/observaciones.routes';
import tiposObservacionRoutes from './tipos-observacion/tipos-observacion.routes';
import cuentasRoutes from './cuentas/cuentas.routes';
import pagosRoutes from './pagos/pagos.routes';
import bitacoraRoutes from './bitacora/bitacora.routes';
import authRoutes from './auth/auth.routes';
import adminRoutes from './admin/admin.routes';

export class AppRoutes {
  static register(app: FastifyInstance) {
    // ======= CATÁLOGOS / BÁSICOS =======
    app.register(alumnosRoutes, { prefix: '/api/alumnos' });
    app.register(carrerasRoutes, { prefix: '/api/carreras' });
    app.register(becasRoutes, { prefix: '/api/becas' });
    app.register(rolesRoutes, { prefix: '/api/roles' });
    app.register(metodosPagoRoutes, { prefix: '/api/metodos-pago' });
    app.register(ciclosRoutes, { prefix: '/api/ciclos-escolares' });
    app.register(conceptosRoutes, { prefix: '/api/conceptos' });

    // ======= USUARIOS / OBSERVACIONES =======
    app.register(usuariosRoutes, { prefix: '/api/usuarios' }); // Consider restricting this
    app.register(observacionesRoutes, { prefix: '/api/observaciones' });
    app.register(tiposObservacionRoutes, { prefix: '/api/tipos-observacion' });

    // ======= FINANCIERO =======
    app.register(cuentasRoutes, { prefix: '/api/cuentas' });
    app.register(pagosRoutes, { prefix: '/api/pagos' });

    // ======= AUDITORÍA =======
    app.register(bitacoraRoutes, { prefix: '/api/bitacora' });

    // ======= AUTENTICACIÓN =======
    app.register(authRoutes, { prefix: '/api/auth' });
    
    // ======= ADMIN =======
    app.register(adminRoutes, { prefix: '/api/admin' });
  }
}
