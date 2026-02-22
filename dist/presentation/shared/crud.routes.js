"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCrudRoutes = void 0;
const buildCrudRoutes = (service, idParamName = 'id', opts) => {
    const routes = async (fastify) => {
        // GET /
        // GET /
        fastify.get('/', async (request) => {
            const scopeOptions = opts?.resolveScope?.(request);
            return service.getAll(scopeOptions);
        });
        // GET /:id
        fastify.get(`/:${idParamName}`, async (request, reply) => {
            const id = request.params[idParamName];
            const scopeOptions = opts?.resolveScope?.(request);
            const row = await service.getById(id, scopeOptions);
            if (!row) {
                return reply.code(404).send({ message: 'No encontrado o sin permisos' });
            }
            return row;
        });
        // POST /
        fastify.post('/', async (request, reply) => {
            try {
                const body = request.body;
                const created = await service.create(body);
                return reply.code(201).send(created);
            }
            catch (err) {
                fastify.log.error(err);
                return reply.code(500).send({
                    message: 'Error al crear el registro',
                    detail: err.message,
                    code: err.code,
                    severity: err.severity,
                    constraint: err.constraint
                });
            }
        });
        // PUT /:id
        fastify.put(`/:${idParamName}`, async (request, reply) => {
            try {
                const id = request.params[idParamName];
                const body = request.body;
                const scopeOptions = opts?.resolveScope?.(request);
                // Validar alcance primero
                const existing = await service.getById(id, scopeOptions);
                if (!existing) {
                    return reply.code(404).send({ message: 'No encontrado o sin permisos' });
                }
                const updated = await service.update(id, body);
                if (!updated) {
                    return reply.code(404).send({ message: 'No se pudo actualizar' });
                }
                return updated;
            }
            catch (err) {
                fastify.log.error(err);
                return reply.code(500).send({
                    message: 'Error al actualizar el registro',
                    detail: err.message,
                    code: err.code,
                    severity: err.severity,
                    constraint: err.constraint
                });
            }
        });
        // DELETE /:id
        fastify.delete(`/:${idParamName}`, async (request, reply) => {
            const id = request.params[idParamName];
            const scopeOptions = opts?.resolveScope?.(request);
            try {
                // Validar alcance primero
                const existing = await service.getById(id, scopeOptions);
                if (!existing) {
                    return reply.code(404).send({ message: 'No encontrado o sin permisos' });
                }
                const deleted = await service.delete(id);
                if (!deleted) {
                    return reply.code(404).send({ message: 'No se pudo eliminar' });
                }
                return deleted;
            }
            catch (err) {
                fastify.log.error(err);
                // Error de llave foránea en Postgres (FK constraint)
                if (err && err.code === '23503') {
                    return reply.code(409).send({
                        message: 'No se puede eliminar el registro porque está relacionado con otros datos.',
                        detail: err.detail,
                    });
                }
                return reply.code(500).send({
                    message: 'Error interno al eliminar',
                    detail: err?.message ?? String(err),
                });
            }
        });
    };
    return routes;
};
exports.buildCrudRoutes = buildCrudRoutes;
