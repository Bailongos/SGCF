import { CrudService } from '../../services/crud.service';
import { buildCrudRoutes } from '../shared/crud.routes';
import type { FastifyPluginAsync } from 'fastify';
import { dbPool } from '../../data';

const usuariosService = new CrudService('usuarios', 'id_usuario', true);

const usuariosRoutes: FastifyPluginAsync = async (fastify) => {
  // Global Guard for Usuarios Routes: Only Global Admins
  fastify.addHook('preHandler', async (request, reply) => {
    const user = (request as any).user;
    if (!user || user.id_carrera !== null) {
      return reply.code(403).send({ message: 'Acceso denegado: Se requieren permisos de Administrador Global.' });
    }
    
    // Additional validation for POST/PUT if needed
    if (request.method === 'POST' || request.method === 'PUT') {
      const body = request.body as any;
      if (body.id_rol !== undefined && (body.id_carrera !== undefined || body.id_carrera === null)) {
        const roleRes = await dbPool.query('SELECT nombre_rol FROM "control financiero".roles WHERE id_rol = $1', [body.id_rol]);
        const roleName = roleRes.rows[0]?.nombre_rol;

        if (roleName === 'Administrador' && body.id_carrera !== null) {
          return reply.code(400).send({ message: 'El perfil Administrador debe tener alcance global (id_carrera = NULL)' });
        }
        
        if (roleName === 'Coordinador' && body.id_carrera === null) {
          return reply.code(400).send({ message: 'El perfil Coordinador debe estar asociado a una carrera (id_carrera NOT NULL)' });
        }
      }
    }
  });

  fastify.register(buildCrudRoutes(usuariosService, 'id'));
};

export default usuariosRoutes;
