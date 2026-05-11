import type { FastifyPluginAsync } from 'fastify';
import { dbPool } from '../../data';
import bcrypt from 'bcryptjs';

const adminRoutes: FastifyPluginAsync = async (fastify) => {

  // Global Admin Guard
  fastify.addHook('preHandler', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
       return reply.code(401).send({ message: 'No autenticado.' });
    }
    // Note: We used to block id_carrera !== null here. 
    // Now we allow them but filter data in each handler.
  });

  // GET /admin/usuarios - List users with details
  fastify.get('/usuarios', async (request, reply) => {
    try {
        const idCarrera = (request as any).user.id_carrera;
        const query = `
            SELECT 
                u.id_usuario, u.username, u.email, u.activo,
                u.id_rol, r.nombre_rol,
                u.id_carrera, c.nombre as nombre_carrera, c.clave as clave_carrera,
                COALESCE(json_agg(ui.proveedor) FILTER (WHERE ui.proveedor IS NOT NULL), '[]') as identidades
            FROM "control financiero".usuarios u
            JOIN "control financiero".roles r ON u.id_rol = r.id_rol
            LEFT JOIN "control financiero".carreras c ON u.id_carrera = c.id_carrera
            LEFT JOIN "control financiero".usuarios_identidades ui ON u.id_usuario = ui.id_usuario
            ${idCarrera !== null ? 'WHERE u.id_carrera = $1' : ''}
            GROUP BY u.id_usuario, r.nombre_rol, c.nombre, c.clave
            ORDER BY u.id_usuario ASC
        `;
        const result = await dbPool.query(query, idCarrera !== null ? [idCarrera] : []);
        return result.rows;
    } catch (err: any) {
        fastify.log.error(err);
        return reply.code(500).send({ message: 'Error al obtener usuarios' });
    }
  });

  // POST /admin/usuarios - Create user (Local)
  fastify.post('/usuarios', async (request, reply) => {
      const { username, password, email, id_rol, id_carrera } = request.body as any;

      if (!username || !id_rol) {
          return reply.code(400).send({ message: 'Username y Rol son requeridos' });
      }

      const client = await dbPool.connect();
      try {
          await client.query('BEGIN');
          
          // Hash password if provided
          let passwordHash = 'oauth_placeholder';
          if (password) {
              passwordHash = bcrypt.hashSync(password, 10);
          }

          const currentUser = (request as any).user;
          let targetCarrera = id_carrera;

          // Si el admin es local, forzar que el usuario creado sea de su carrera
          if (currentUser.id_carrera !== null) {
              targetCarrera = currentUser.id_carrera;
          }

          const res = await client.query(
              `INSERT INTO "control financiero".usuarios (username, password, email, id_rol, id_carrera, activo)
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING id_usuario`,
              [username, passwordHash, email, id_rol, targetCarrera, true] 
          );
          
          await client.query('COMMIT');
          return res.rows[0];

      } catch (err: any) {
          await client.query('ROLLBACK');
          fastify.log.error(err);
           if (err.code === '23505') { // Unique violation
              return reply.code(409).send({ message: 'El usuario o email ya existe' });
          }
          return reply.code(500).send({ message: 'Error al crear usuario' });
      } finally {
          client.release();
      }
  });

  // PATCH /admin/usuarios/:id - Update user (Role, Carrera, Active, Password)
  fastify.patch('/usuarios/:id', async (request, reply) => {
      const { id } = request.params as any;
      const { id_rol, id_carrera, activo, password } = request.body as any;

      if (id_rol === undefined && id_carrera === undefined && activo === undefined && password === undefined) {
          return reply.code(400).send({ message: 'No hay datos para actualizar' });
      }

      const currentUser = (request as any).user;
      const client = await dbPool.connect();
      try {
          await client.query('BEGIN');

          // Si el admin es local, verificar que el usuario a editar pertenezca a su carrera
          if (currentUser.id_carrera !== null) {
              const checkUser = await client.query(
                  'SELECT id_carrera FROM "control financiero".usuarios WHERE id_usuario = $1',
                  [id]
              );
              if (checkUser.rows.length === 0 || checkUser.rows[0].id_carrera !== currentUser.id_carrera) {
                  await client.query('ROLLBACK');
                  return reply.code(403).send({ message: 'No tiene permiso para editar usuarios de otra carrera.' });
              }
          }

          // Validate Role constraints
          if (id_rol) {
              const roleRes = await client.query('SELECT nombre_rol FROM "control financiero".roles WHERE id_rol = $1', [id_rol]);
              const roleName = roleRes.rows[0]?.nombre_rol;
              
              if (roleName === 'Administrador' && currentUser.id_carrera !== null) {
                  await client.query('ROLLBACK');
                  return reply.code(403).send({ message: 'Un administrador local no puede asignar el rol de Administrador Global.' });
              }
          }
          
          const fields: string[] = [];
          const values: any[] = [];
          let idx = 1;

          if (id_rol !== undefined) { fields.push(`id_rol = $${idx++}`); values.push(id_rol); }
          // Si es admin local, no puede cambiar la carrera (se mantiene la suya)
          if (id_carrera !== undefined && currentUser.id_carrera === null) { 
              fields.push(`id_carrera = $${idx++}`); values.push(id_carrera); 
          }
          if (activo !== undefined) { fields.push(`activo = $${idx++}`); values.push(activo); }
          if (password !== undefined) { 
              const hash = bcrypt.hashSync(password, 10);
              fields.push(`password = $${idx++}`); values.push(hash); 
          }

          if (fields.length > 0) {
              values.push(id);
              await client.query(
                  `UPDATE "control financiero".usuarios SET ${fields.join(', ')} WHERE id_usuario = $${idx}`,
                  values
              );

              // Log action in audit log
              await client.query(
                  `INSERT INTO "control financiero".bitacora_auditoria (id_usuario, accion, detalle)
                   VALUES ($1, $2, $3)`,
                  [currentUser.id, 'UPDATE_USER', `Admin actualizó usuario ID ${id}. Campos: ${Object.keys(request.body as any).join(', ')}`]
              );
          }

          await client.query('COMMIT');
          return { message: 'Usuario actualizado correctamente' };

      } catch (err: any) {
          await client.query('ROLLBACK');
          fastify.log.error(err);
          return reply.code(500).send({ message: 'Error al actualizar usuario' });
      } finally {
          client.release();
      }
  });

  // GET /admin/roles
  fastify.get('/roles', async (request, reply) => {
      const result = await dbPool.query('SELECT * FROM "control financiero".roles ORDER BY nombre_rol');
      return result.rows;
  });

  // GET /admin/carreras
  fastify.get('/carreras', async (request, reply) => {
      const idCarrera = (request as any).user.id_carrera;
      const query = `SELECT * FROM "control financiero".carreras 
                     ${idCarrera !== null ? 'WHERE id_carrera = $1' : ''} 
                     ORDER BY clave ASC`;
      const result = await dbPool.query(query, idCarrera !== null ? [idCarrera] : []);
      return result.rows;
  });

   // GET /admin/auditoria (Bitácora)
  fastify.get('/auditoria', async (request, reply) => {
      // Assuming 'bitacora_auditoria' table exists based on file structure
       try {
        const result = await dbPool.query('SELECT * FROM "control financiero".bitacora_auditoria ORDER BY fecha DESC LIMIT 100');
        return result.rows;
       } catch (e) {
           return []; // Fail silently or return empty if table logic differs
       }
  });

};

export default adminRoutes;
