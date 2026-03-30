"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crud_service_1 = require("../../services/crud.service");
const crud_routes_1 = require("../shared/crud.routes");
const data_1 = require("../../data");
const carrerasService = new crud_service_1.CrudService('carreras', 'id_carrera', true);
const carrerasRoutes = async (fastify) => {
    // Validation Hook for POST/PUT
    fastify.addHook('preHandler', async (request, reply) => {
        if (request.method === 'POST' || request.method === 'PUT') {
            const body = request.body;
            const { id } = request.params;
            if (body.clave !== undefined) {
                // 1. Alphanumeric check
                const claveRegex = /^[a-zA-Z0-9_-]+$/;
                if (!claveRegex.test(body.clave)) {
                    return reply.code(400).send({ message: 'La clave debe ser alfanumérica (letras, números, guiones y guiones bajos)' });
                }
                // 2. Uniqueness check
                const query = id
                    ? 'SELECT 1 FROM "control financiero".carreras WHERE clave = $1 AND id_carrera <> $2'
                    : 'SELECT 1 FROM "control financiero".carreras WHERE clave = $1';
                const values = id ? [body.clave, id] : [body.clave];
                const result = await data_1.dbPool.query(query, values);
                if (result.rows.length > 0) {
                    return reply.code(400).send({ message: 'La clave ya está en uso por otra carrera' });
                }
            }
            if (request.method === 'POST' && !body.clave) {
                return reply.code(400).send({ message: 'La clave es obligatoria para nuevas carreras' });
            }
        }
    });
    // New endpoint: GET /carreras/by-clave/:clave
    fastify.get('/by-clave/:clave', async (request, reply) => {
        const { clave } = request.params;
        const result = await data_1.dbPool.query('SELECT * FROM "control financiero".carreras WHERE clave = $1', [clave]);
        if (result.rows.length === 0)
            return reply.code(404).send({ message: 'Carrera no encontrada' });
        return result.rows[0];
    });
    fastify.register((0, crud_routes_1.buildCrudRoutes)(carrerasService, 'id'));
};
exports.default = carrerasRoutes;
