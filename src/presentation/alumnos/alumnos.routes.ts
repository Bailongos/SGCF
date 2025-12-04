import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { AlumnosService } from '../../services/alumnos.service';

const alumnosRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /api/alumnos
  fastify.get('/', async () => {
    return AlumnosService.getAll();
  });
};

export default alumnosRoutes;
