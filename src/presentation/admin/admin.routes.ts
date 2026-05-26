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

    // Validar roles permitidos para las rutas de administración
    const allowedRoles = ['Administrador', 'Coordinador'];
    if (!allowedRoles.includes(user.role)) {
       return reply.code(403).send({ message: 'No tienes los permisos necesarios para acceder a las rutas de administración.' });
    }
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
            ${idCarrera !== null ? 'WHERE u.id_carrera = $1 OR u.id_carrera IS NULL' : ''}
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
  fastify.post('/usuarios', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'id_rol'],
        properties: {
          username: { type: 'string', minLength: 3 },
          password: { type: 'string', minLength: 6 },
          email: { type: 'string', format: 'email' },
          id_rol: { type: 'integer' },
          id_carrera: { type: 'integer', nullable: true }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
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
  fastify.patch('/usuarios/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' }
        }
      },
      body: {
        type: 'object',
        properties: {
          id_rol: { type: 'integer' },
          id_carrera: { type: 'integer', nullable: true },
          activo: { type: 'boolean' },
          password: { type: 'string', minLength: 6 }
        },
        additionalProperties: false,
        minProperties: 1
      }
    }
  }, async (request, reply) => {
      const { id } = request.params as any;
      const { id_rol, id_carrera, activo, password } = request.body as any;

      if (id_rol === undefined && id_carrera === undefined && activo === undefined && password === undefined) {
          return reply.code(400).send({ message: 'No hay datos para actualizar' });
      }

      const currentUser = (request as any).user;
      const client = await dbPool.connect();
      try {
          await client.query('BEGIN');

          // Si el admin es local, verificar que el usuario a editar pertenezca a su carrera o sea pendiente
          let userCurrentCarrera = null;
          if (currentUser.id_carrera !== null) {
              const checkUser = await client.query(
                  'SELECT id_carrera FROM "control financiero".usuarios WHERE id_usuario = $1',
                  [id]
              );
              if (checkUser.rows.length === 0 || 
                  (checkUser.rows[0].id_carrera !== null && checkUser.rows[0].id_carrera !== currentUser.id_carrera)) {
                  await client.query('ROLLBACK');
                  return reply.code(403).send({ message: 'No tiene permiso para editar usuarios de otra carrera.' });
              }
              userCurrentCarrera = checkUser.rows[0].id_carrera;
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
          
          if (id_carrera !== undefined) {
              if (currentUser.id_carrera === null) {
                  // Admin global: puede asignar cualquier carrera
                  fields.push(`id_carrera = $${idx++}`); values.push(id_carrera);
              } else {
                  // Admin local: validar que el id_carrera coincida con su propia carrera
                  if (id_carrera !== currentUser.id_carrera) {
                      await client.query('ROLLBACK');
                      return reply.code(403).send({ message: 'Un administrador local solo puede asignar usuarios a su propia carrera.' });
                  }
                  fields.push(`id_carrera = $${idx++}`); values.push(currentUser.id_carrera);
              }
          } else if (currentUser.id_carrera !== null && userCurrentCarrera === null) {
              // Si el admin es local, y el usuario no tiene carrera asignada, asignarle automáticamente la carrera del admin
              fields.push(`id_carrera = $${idx++}`); values.push(currentUser.id_carrera);
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

  // GET /admin/roles-permisos
  fastify.get('/roles-permisos', async (request, reply) => {
      const idCarrera = (request as any).user.id_carrera;
      if (idCarrera !== null) {
          return reply.code(403).send({ message: 'No autorizado' });
      }

      try {
          const rolesRes = await dbPool.query('SELECT * FROM "control financiero".roles ORDER BY nombre_rol');
          const permisosRes = await dbPool.query('SELECT * FROM "control financiero".permisos ORDER BY categoria, clave');
          const rolPermisosRes = await dbPool.query('SELECT * FROM "control financiero".rol_permisos');
          
          return {
              roles: rolesRes.rows,
              permisos: permisosRes.rows,
              rol_permisos: rolPermisosRes.rows
          };
      } catch (err: any) {
          fastify.log.error(err);
          return reply.code(500).send({ message: 'Error al obtener roles y permisos' });
      }
  });

  // POST /admin/roles-permisos
  fastify.post('/roles-permisos', {
    schema: {
      body: {
        type: 'object',
        required: ['id_rol', 'id_permisos'],
        properties: {
          id_rol: { type: 'integer' },
          id_permisos: {
            type: 'array',
            items: { type: 'integer' }
          }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
      const idCarrera = (request as any).user.id_carrera;
      if (idCarrera !== null) {
          return reply.code(403).send({ message: 'No autorizado' });
      }

      const { id_rol, id_permisos } = request.body as { id_rol: number; id_permisos: number[] };
      if (!id_rol || !Array.isArray(id_permisos)) {
          return reply.code(400).send({ message: 'id_rol y id_permisos son requeridos' });
      }

      const client = await dbPool.connect();
      try {
          await client.query('BEGIN');
          // Eliminar permisos actuales de ese rol
          await client.query('DELETE FROM "control financiero".rol_permisos WHERE id_rol = $1', [id_rol]);
          // Insertar los nuevos permisos
          for (const id_permiso of id_permisos) {
              await client.query('INSERT INTO "control financiero".rol_permisos (id_rol, id_permiso) VALUES ($1, $2)', [id_rol, id_permiso]);
          }
          await client.query('COMMIT');
          return { success: true };
      } catch (err: any) {
          await client.query('ROLLBACK');
          fastify.log.error(err);
          return reply.code(500).send({ message: 'Error al guardar los permisos del rol' });
      } finally {
          client.release();
      }
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
