import type { FastifyPluginAsync } from 'fastify';
import { dbPool } from '../../data';

interface QueryParams {
  matricula?: string;
  tipo?: string;
  desde?: string;
  hasta?: string;
  autor?: string;
}

const observacionesRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /api/observaciones
  fastify.get<{ Querystring: QueryParams }>('/', async (request, reply) => {
    const user = (request as any).user;
    const { matricula, tipo, desde, hasta, autor } = request.query;

    try {
        let sql = `
            SELECT obs.*, t.nombre as tipo_nombre
            FROM "control financiero".observaciones obs
            JOIN "control financiero".tipos_observacion t ON obs.tipo_clave = t.clave
        `;
        
        const conditions: string[] = [];
        const values: any[] = [];
        let idx = 1;

        // 1. Mandatory scope check (Coordinador)
        if (user?.id_carrera) {
            conditions.push(`EXISTS (SELECT 1 FROM "control financiero".alumnos a WHERE a.matricula = obs.matricula AND a.id_carrera = $${idx++})`);
            values.push(user.id_carrera);
        }

        // 2. Optional filters
        if (matricula) {
            conditions.push(`obs.matricula = $${idx++}`);
            values.push(matricula);
        }
        if (tipo) {
            conditions.push(`obs.tipo_clave = $${idx++}`);
            values.push(tipo);
        }
        if (autor) {
            conditions.push(`obs.id_autor = $${idx++}`);
            values.push(autor);
        }
        if (desde) {
            conditions.push(`obs.fecha >= $${idx++}::date`);
            values.push(desde);
        }
        if (hasta) {
            conditions.push(`obs.fecha <= $${idx++}::date`);
            values.push(hasta);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY obs.fecha DESC';

        const result = await dbPool.query(sql, values);
        return result.rows;

    } catch (err: any) {
        fastify.log.error(err);
        return reply.code(500).send({ message: 'Error al obtener observaciones' });
    }
  });

  // POST /api/observaciones
  fastify.post('/', async (request, reply) => {
    const user = (request as any).user;
    const { matricula, detalle, tipo_clave, id_autor } = request.body as any;

    if (!matricula || !detalle || !tipo_clave) {
        return reply.code(400).send({ message: 'Matrícula, detalle y tipo_clave son requeridos' });
    }

    try {
        // 1. Validate tipo_clave exists and is active
        const tipoRes = await dbPool.query(
            'SELECT 1 FROM "control financiero".tipos_observacion WHERE clave = $1 AND activo = TRUE',
            [tipo_clave]
        );
        if (tipoRes.rows.length === 0) {
            return reply.code(400).send({ message: `El tipo de observación '${tipo_clave}' no existe o está inactivo` });
        }

        // 2. Validate matricula exists and scope (if Coordinator)
        const alumnoRes = await dbPool.query(
            'SELECT id_carrera FROM "control financiero".alumnos WHERE matricula = $1',
            [matricula]
        );
        if (alumnoRes.rows.length === 0) {
            return reply.code(404).send({ message: 'Alumno no encontrado' });
        }

        if (user?.id_carrera && alumnoRes.rows[0].id_carrera !== user.id_carrera) {
            return reply.code(403).send({ message: 'No tienes permisos para agregar observaciones a este alumno' });
        }

        // 3. Insert
        const insertRes = await dbPool.query(
            `INSERT INTO "control financiero".observaciones (matricula, detalle, tipo_clave, id_autor, fecha)
             VALUES ($1, $2, $3, $4, NOW())
             RETURNING *`,
            [matricula, detalle, tipo_clave, id_autor || user?.id]
        );

        return reply.code(201).send(insertRes.rows[0]);

    } catch (err: any) {
        fastify.log.error(err);
        return reply.code(500).send({ message: 'Error al crear la observación' });
    }
  });

  // GET /api/observaciones/:id
  fastify.get('/:id', async (request, reply) => {
      const { id } = request.params as any;
      const user = (request as any).user;

      try {
          const query = `
            SELECT obs.*, t.nombre as tipo_nombre
            FROM "control financiero".observaciones obs
            JOIN "control financiero".tipos_observacion t ON obs.tipo_clave = t.clave
            WHERE obs.id_observacion = $1
          `;
          const result = await dbPool.query(query, [id]);
          const row = result.rows[0];

          if (!row) return reply.code(404).send({ message: 'No encontrado' });

          // Scope check
          if (user?.id_carrera) {
              const alumnoRes = await dbPool.query('SELECT id_carrera FROM "control financiero".alumnos WHERE matricula = $1', [row.matricula]);
              if (alumnoRes.rows[0]?.id_carrera !== user.id_carrera) {
                  return reply.code(403).send({ message: 'Acceso denegado' });
              }
          }

          return row;
      } catch (err: any) {
          fastify.log.error(err);
          return reply.code(500).send({ message: 'Error al obtener observación' });
      }
  });

};

export default observacionesRoutes;
