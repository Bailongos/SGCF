// src/presentation/shared/crud.routes.ts
import type { FastifyPluginAsync } from 'fastify';
import { CrudService } from '../../services/crud.service';

interface IdParams {
  [key: string]: string;
}

export const buildCrudRoutes = (
  service: CrudService,
  idParamName: string = 'id',
): FastifyPluginAsync => {
  const routes: FastifyPluginAsync = async (fastify) => {
    // GET /
    fastify.get('/', async () => {
      return service.getAll();
    });

    // GET /:id
    fastify.get<{ Params: IdParams }>(
      `/:${idParamName}`,
      async (request, reply) => {
        const id = request.params[idParamName];
        const row = await service.getById(id);

        if (!row) {
          return reply.code(404).send({ message: 'No encontrado' });
        }

        return row;
      },
    );

    // POST /
    fastify.post(
      '/',
      async (request, reply) => {
        const body = request.body as Record<string, unknown>;
        const created = await service.create(body);
        return reply.code(201).send(created);
      },
    );

    // PUT /:id
    fastify.put<{ Params: IdParams }>(
      `/:${idParamName}`,
      async (request, reply) => {
        const id = request.params[idParamName];
        const body = request.body as Record<string, unknown>;
        const updated = await service.update(id, body);

        if (!updated) {
          return reply.code(404).send({ message: 'No encontrado' });
        }

        return updated;
      },
    );

    // DELETE /:id
    fastify.delete<{ Params: IdParams }>(
      `/:${idParamName}`,
      async (request, reply) => {
        const id = request.params[idParamName];

        try {
          const deleted = await service.delete(id);

          if (!deleted) {
            return reply.code(404).send({ message: 'No encontrado' });
          }

          return deleted;
        } catch (err: any) {
          fastify.log.error(err);

          // Error de llave foránea en Postgres (FK constraint)
          if (err && err.code === '23503') {
            return reply.code(409).send({
              message:
                'No se puede eliminar el registro porque está relacionado con otros datos.',
              detail: err.detail,
            });
          }

          return reply.code(500).send({
            message: 'Error interno al eliminar',
            detail: err?.message ?? String(err),
          });
        }
      },
    );
  };

  return routes;
};
