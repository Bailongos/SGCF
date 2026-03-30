import type { FastifyPluginAsync } from 'fastify';
import { dbPool } from '../../data';

const tiposObservacionRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /api/tipos-observacion
  fastify.get('/', async (request, reply) => {
    try {
        const query = `
            SELECT clave, nombre 
            FROM "control financiero".tipos_observacion 
            WHERE activo = TRUE 
            ORDER BY nombre ASC
        `;
        const result = await dbPool.query(query);
        return result.rows;
    } catch (err: any) {
        fastify.log.error(err);
        return reply.code(500).send({ message: 'Error al obtener tipos de observación' });
    }
  });

};

export default tiposObservacionRoutes;
