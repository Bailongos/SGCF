// src/presentation/shared/crud.routes.ts
import type { FastifyPluginAsync } from 'fastify';
import { CrudService, CrudOptions } from '../../services/crud.service';

interface IdParams {
  [key: string]: string;
}

export interface BuildCrudOptions {
  resolveScope?: (request: any) => CrudOptions | undefined;
  createSchema?: object;
  updateSchema?: object;
}

export const buildCrudRoutes = (
  service: CrudService,
  idParamName: string = 'id',
  opts?: BuildCrudOptions,
): FastifyPluginAsync => {
  const routes: FastifyPluginAsync = async (fastify) => {
    // GET /
    // GET /
    fastify.get('/', async (request) => {
      const scopeOptions = opts?.resolveScope?.(request);
      return service.getAll(scopeOptions);
    });

    // GET /:id
    fastify.get<{ Params: IdParams }>(
      `/:${idParamName}`,
      async (request, reply) => {
        const id = request.params[idParamName];
        const scopeOptions = opts?.resolveScope?.(request);
        const row = await service.getById(id, scopeOptions);

        if (!row) {
          return reply.code(404).send({ message: 'No encontrado o sin permisos' });
        }

        return row;
      },
    );

    // POST /
    fastify.post(
      '/',
      { schema: { body: opts?.createSchema } },
      async (request, reply) => {
        try {
          const body = request.body as Record<string, unknown>;
          const userId = (request as any)?.user?.id;
          const created = await service.create(body, userId);
          return reply.code(201).send(created);
        } catch (err: any) {
          fastify.log.error(err);
          return reply.code(500).send({
            message: 'Error al crear el registro',
            detail: err.message,
            code: err.code,
            severity: err.severity,
            constraint: err.constraint
          });
        }
      },
    );

    // PUT /:id
    fastify.put<{ Params: IdParams }>(
      `/:${idParamName}`,
      { schema: { body: opts?.updateSchema } },
      async (request, reply) => {
        try {
          const id = request.params[idParamName];
          const body = request.body as Record<string, unknown>;
          const scopeOptions = opts?.resolveScope?.(request);

          // Validar alcance primero
          const existing = await service.getById(id, scopeOptions);
          if (!existing) {
            return reply.code(404).send({ message: 'No encontrado o sin permisos' });
          }

          const userId = (request as any)?.user?.id;
          const updated = await service.update(id, body, userId);

          if (!updated) {
            return reply.code(404).send({ message: 'No se pudo actualizar' });
          }

          return updated;
        } catch (err: any) {
          fastify.log.error(err);
          return reply.code(500).send({
            message: 'Error al actualizar el registro',
            detail: err.message,
            code: err.code,
            severity: err.severity,
            constraint: err.constraint
          });
        }
      },
    );

    // DELETE /:id
    fastify.delete<{ Params: IdParams }>(
      `/:${idParamName}`,
      async (request, reply) => {
        const id = request.params[idParamName];
        const scopeOptions = opts?.resolveScope?.(request);

        try {
          // Validar alcance primero
          const existing = await service.getById(id, scopeOptions);
          if (!existing) {
            return reply.code(404).send({ message: 'No encontrado o sin permisos' });
          }

          const userId = (request as any)?.user?.id;
          const deleted = await service.delete(id, userId);

          if (!deleted) {
            return reply.code(404).send({ message: 'No se pudo eliminar' });
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
