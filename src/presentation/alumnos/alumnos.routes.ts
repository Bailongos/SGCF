// src/presentation/alumnos/alumnos.routes.ts
import type { FastifyPluginAsync } from 'fastify';
import { CrudService } from '../../services/crud.service';
import { dbPool } from '../../data';

interface IdParams {
  [key: string]: string;
}

// idIsNumber = false porque la PK es texto (matricula)
const alumnosService = new CrudService('alumnos', 'matricula', false);

const alumnosRoutes: FastifyPluginAsync = async (fastify) => {
  // ======================================================
  // GET /api/alumnos
  // ======================================================
  fastify.get('/', async () => {
    return alumnosService.getAll();
  });

  // ======================================================
  // GET /api/alumnos/:matricula
  // ======================================================
  fastify.get<{ Params: IdParams }>(
    '/:matricula',
    async (request, reply) => {
      const matricula = request.params.matricula;
      const row = await alumnosService.getById(matricula);

      if (!row) {
        return reply.code(404).send({ message: 'No encontrado' });
      }

      return row;
    },
  );

  // ======================================================
  // POST /api/alumnos
  // Aquí es donde CREAR ALUMNO + CUENTAS POR COBRAR
  // ======================================================
  fastify.post(
    '/',
    async (request, reply) => {
      const body = request.body as Record<string, unknown>;

      // 1) Creamos el alumno con el CrudService (como siempre)
      const alumno = await alumnosService.create(body);

      // 2) Intentamos crear sus cuentas por cobrar (UADEC / ESCUELA)
      try {
        // Obtenemos ciclo actual
        const cicloRes = await dbPool.query(
          `SELECT id_ciclo
           FROM ciclos_escolares
           WHERE es_actual = TRUE
           LIMIT 1`,
        );
        const ciclo = cicloRes.rows[0];

        if (ciclo && (alumno as any).matricula) {
          const matricula = (alumno as any).matricula as string;

          // Insertamos las dos cuentas por cobrar base
          await dbPool.query(
            `INSERT INTO cuentas_por_cobrar (matricula, concepto, id_ciclo, monto, pagado)
             VALUES 
               ($1, 'UADEC',   $2, 4500.00, FALSE),
               ($1, 'ESCUELA', $2, 2500.00, FALSE)
             ON CONFLICT (matricula, concepto, id_ciclo) DO NOTHING`,
            [matricula, ciclo.id_ciclo],
          );
        }
      } catch (err) {
        // No rompemos la creación del alumno si falla esta parte,
        // solo lo dejamos registrado en logs
        fastify.log.error({
          msg: 'Error al generar cuentas por cobrar para el alumno',
          err,
        });
      }

      // Respondemos con el alumno creado (como antes)
      return reply.code(201).send(alumno);
    },
  );

  // ======================================================
  // PUT /api/alumnos/:matricula
  // ======================================================
  fastify.put<{ Params: IdParams }>(
    '/:matricula',
    async (request, reply) => {
      const matricula = request.params.matricula;
      const body = request.body as Record<string, unknown>;
      const updated = await alumnosService.update(matricula, body);

      if (!updated) {
        return reply.code(404).send({ message: 'No encontrado' });
      }

      return updated;
    },
  );

  // ======================================================
  // DELETE /api/alumnos/:matricula
  // ======================================================
  fastify.delete<{ Params: IdParams }>(
    '/:matricula',
    async (request, reply) => {
      const matricula = request.params.matricula;

      try {
        const deleted = await alumnosService.delete(matricula);

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

export default alumnosRoutes;
