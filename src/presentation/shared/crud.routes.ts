// src/presentation/shared/crud.routes.ts
import { FastifyPluginAsync } from 'fastify';
import { CrudService } from '../../services/crud.service';

export const buildCrudRoutes = (
  service: CrudService,
  idParamName: string = 'id', // nombre del parámetro en la URL
): FastifyPluginAsync => {
  const routes: FastifyPluginAsync = async (fastify) => {
    // GET / -> lista todo
    fastify.get('/', async () => {
      return service.getAll();
    });

    // GET /:id -> uno por id
    fastify.get<{ Params: { [key: string]: string } }>(
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

    // POST / -> crear
    fastify.post('/', async (request, reply) => {
      const body = request.body as Record<string, any>;
      const created = await service.create(body);
      return reply.code(201).send(created);
    });

    // PUT /:id -> actualizar
    fastify.put<{ Params: { [key: string]: string } }>(
      `/:${idParamName}`,
      async (request, reply) => {
        const id = request.params[idParamName];
        const body = request.body as Record<string, any>;
        const updated = await service.update(id, body);

        if (!updated) {
          return reply.code(404).send({ message: 'No encontrado' });
        }

        return updated;
      },
    );

    // DELETE /:id -> borrar
    fastify.delete<{ Params: { [key: string]: string } }>(
      `/:${idParamName}`,
      async (request, reply) => {
        const id = request.params[idParamName];
        const deleted = await service.delete(id);

        if (!deleted) {
          return reply.code(404).send({ message: 'No encontrado' });
        }

        return deleted;
      },
    );
  };

  return routes;
};
