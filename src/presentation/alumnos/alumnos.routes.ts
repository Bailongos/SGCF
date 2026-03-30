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
  fastify.get('/', async (request) => {
    const user = (request as any).user;
    
    // Manual query to join career info
    let sql = `
        SELECT a.*, c.nombre as nombre_carrera, c.clave as clave_carrera
        FROM "control financiero".alumnos a
        LEFT JOIN "control financiero".carreras c ON a.id_carrera = c.id_carrera
        WHERE 1=1
    `;
    const values: any[] = [];
    if (user?.id_carrera) {
        sql += ' AND a.id_carrera = $1';
        values.push(user.id_carrera);
    }
    
    const { rows } = await dbPool.query(sql, values);
    return rows;
  });

  // ======================================================
  // GET /api/alumnos/:matricula
  // ======================================================
  fastify.get<{ Params: IdParams }>(
    '/:matricula',
    async (request, reply) => {
      const user = (request as any).user;
      const matricula = request.params.matricula;

      let sql = `
        SELECT a.*, c.nombre as nombre_carrera, c.clave as clave_carrera
        FROM "control financiero".alumnos a
        LEFT JOIN "control financiero".carreras c ON a.id_carrera = c.id_carrera
        WHERE a.matricula = $1
      `;
      const values: any[] = [matricula];
      if (user?.id_carrera) {
          sql += ' AND a.id_carrera = $2';
          values.push(user.id_carrera);
      }

      const { rows } = await dbPool.query(sql, values);
      const row = rows[0];

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
      try {
        const body = request.body as Record<string, unknown>;
        const user = (request as any).user;

        // Si es coordinador, solo puede crear alumnos en su carrera
        if (user?.id_carrera !== null && user?.id_carrera !== undefined) {
          if (body.id_carrera != user.id_carrera) {
            return reply.code(403).send({ message: 'No tienes permisos para crear alumnos en esta carrera' });
          }
        }

        // 1) Creamos el alumno con el CrudService (como siempre)
        const alumno = await alumnosService.create(body);

        // 2) Intentamos crear sus cuentas por cobrar (UADEC / ESCUELA)
        try {
          // Obtenemos ciclo actual
          const cicloRes = await dbPool.query(
            `SELECT id_ciclo
             FROM "control financiero".ciclos_escolares
             WHERE es_actual = TRUE
             LIMIT 1`,
          );
          const ciclo = cicloRes.rows[0];

          if (ciclo && (alumno as any).matricula) {
            const matricula = (alumno as any).matricula as string;

            // Insertamos las dos cuentas por cobrar base
            await dbPool.query(
              `INSERT INTO "control financiero".cuentas_por_cobrar (matricula, concepto, id_ciclo, monto, pagado)
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
      } catch (err: any) {
        fastify.log.error(err);
        return reply.code(500).send({
          message: 'Error interno al crear el alumno',
          detail: err?.message ?? String(err),
        });
      }
    },
  );

  // ======================================================
  // PUT /api/alumnos/:matricula
  // ======================================================
  fastify.put<{ Params: IdParams }>(
    '/:matricula',
    async (request, reply) => {
      try {
        const matricula = request.params.matricula;
        const body = request.body as Record<string, unknown>;
        const user = (request as any).user;

        // Validar que el alumno pertenece al scope del coordinador
        const options = {
          scopeParams: {
            tableField: '"id_carrera"',
            idCarrera: user?.id_carrera
          }
        };
        const existing = await alumnosService.getById(matricula, options);
        if (!existing) {
          return reply.code(404).send({ message: 'No encontrado o sin permisos' });
        }

        // Evitar que el coordinador mueva de carrera al alumno hacia otra
        if (user?.id_carrera !== null && user?.id_carrera !== undefined) {
          if (body.id_carrera && body.id_carrera != user.id_carrera) {
            return reply.code(403).send({ message: 'No tienes permisos para cambiar a una carrera fuera de tu alcance' });
          }
        }

        const updated = await alumnosService.update(matricula, body);

        if (!updated) {
          return reply.code(404).send({ message: 'No encontrado' });
        }

        return updated;
      } catch (err: any) {
        fastify.log.error(err);
        return reply.code(500).send({
          message: 'Error interno al actualizar el alumno',
          detail: err?.message ?? String(err),
        });
      }
    },
  );

  // ======================================================
  // DELETE /api/alumnos/:matricula
  // ======================================================
  fastify.delete<{ Params: IdParams }>(
    '/:matricula',
    async (request, reply) => {
      const matricula = request.params.matricula;
      const user = (request as any).user;

      try {
        const options = {
          scopeParams: {
            tableField: '"id_carrera"',
            idCarrera: user?.id_carrera
          }
        };
        const existing = await alumnosService.getById(matricula, options);
        if (!existing) {
          return reply.code(404).send({ message: 'No encontrado o sin permisos' });
        }

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
