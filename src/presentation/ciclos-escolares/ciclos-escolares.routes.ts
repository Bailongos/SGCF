// src/presentation/ciclos-escolares/ciclos-escolares.routes.ts
import type { FastifyPluginAsync } from 'fastify';
import { CrudService } from '../../services/crud.service';
import { buildCrudRoutes } from '../shared/crud.routes';
import { dbPool } from '../../data';

type Periodo = 'ENE-JUN' | 'AGO-DIC';

const ciclosService = new CrudService('ciclos_escolares', 'id_ciclo', true);

// CRUD base
const baseCrudRoutes = buildCrudRoutes(ciclosService, 'id');

const ciclosRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(baseCrudRoutes);

  // POST /api/ciclos-escolares/auto
  fastify.post('/auto', async (request, reply) => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // 1-12
      const todayStr = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'

      // Solo para debug/log
      fastify.log.info({
        msg: 'Calculando ciclo escolar automático',
        now: now.toISOString(),
        todayStr,
        year,
        month,
      });

      // 1️⃣ ¿Ya hay un ciclo que cubra la fecha de HOY?
      const currentRes = await dbPool.query(
        `
        SELECT *
          FROM ciclos_escolares
         WHERE fecha_inicio <= $1::date
           AND fecha_fin    >= $1::date
         ORDER BY fecha_inicio DESC
         LIMIT 1
        `,
        [todayStr],
      );

      if (currentRes.rows.length > 0) {
        const cicloActual = currentRes.rows[0];

        // Marcamos este como el único "actual"
        await dbPool.query(
          `UPDATE ciclos_escolares
              SET es_actual = (id_ciclo = $1)`,
          [cicloActual.id_ciclo],
        );

        return reply.code(200).send(cicloActual);
      }

      // 2️⃣ No hay ciclo que cubra HOY → lo creamos para el año/periodo actual
      const periodo: Periodo = month <= 6 ? 'ENE-JUN' : 'AGO-DIC';

      let nombre: string;
      let fecha_inicio: string;
      let fecha_fin: string;

      if (periodo === 'ENE-JUN') {
        nombre = `Ene-Jun ${year}`;
        fecha_inicio = `${year}-01-01`;
        fecha_fin = `${year}-06-30`;
      } else {
        nombre = `Ago-Dic ${year}`;
        fecha_inicio = `${year}-08-01`;
        // ajusta si quieres 31 o 20 de diciembre
        fecha_fin = `${year}-12-20`;
      }

      const creado = await ciclosService.create({
        nombre,
        fecha_inicio,
        fecha_fin,
        es_actual: true,
      });

      await dbPool.query(
        `UPDATE ciclos_escolares
            SET es_actual = (id_ciclo = $1)`,
        [(creado as any).id_ciclo],
      );

      return reply.code(201).send(creado);
    } catch (err: any) {
      fastify.log.error({
        msg: 'Error al crear ciclo escolar automático',
        err,
      });
      return reply.code(500).send({
        message: 'Error al crear ciclo escolar automático',
        detail: err?.message ?? String(err),
      });
    }
  });
};

export default ciclosRoutes;
