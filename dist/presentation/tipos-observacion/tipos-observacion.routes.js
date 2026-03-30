"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const data_1 = require("../../data");
const tiposObservacionRoutes = async (fastify) => {
    // GET /api/tipos-observacion
    fastify.get('/', async (request, reply) => {
        try {
            const query = `
            SELECT clave, nombre 
            FROM "control financiero".tipos_observacion 
            WHERE activo = TRUE 
            ORDER BY nombre ASC
        `;
            const result = await data_1.dbPool.query(query);
            return result.rows;
        }
        catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ message: 'Error al obtener tipos de observación' });
        }
    });
};
exports.default = tiposObservacionRoutes;
