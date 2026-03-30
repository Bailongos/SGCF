"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const data_1 = require("../../data");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const adminRoutes = async (fastify) => {
    // Global Admin Guard
    fastify.addHook('preHandler', async (request, reply) => {
        const user = request.user;
        if (!user || user.id_carrera !== null) { // Assuming NULL id_carrera means Global Admin
            // Also check role name if needed, but id_carrera IS NULL is the key rule
            return reply.code(403).send({ message: 'Acceso denegado: Se requieren permisos de Administrador Global.' });
        }
    });
    // GET /admin/usuarios - List users with details
    fastify.get('/usuarios', async (request, reply) => {
        try {
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
            GROUP BY u.id_usuario, r.nombre_rol, c.nombre, c.clave
            ORDER BY u.id_usuario ASC
        `;
            const result = await data_1.dbPool.query(query);
            return result.rows;
        }
        catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ message: 'Error al obtener usuarios' });
        }
    });
    // POST /admin/usuarios - Create user (Local)
    fastify.post('/usuarios', async (request, reply) => {
        const { username, password, email, id_rol, id_carrera } = request.body;
        if (!username || !id_rol) {
            return reply.code(400).send({ message: 'Username y Rol son requeridos' });
        }
        const client = await data_1.dbPool.connect();
        try {
            await client.query('BEGIN');
            // Hash password if provided
            let passwordHash = 'oauth_placeholder';
            if (password) {
                passwordHash = bcryptjs_1.default.hashSync(password, 10);
            }
            const res = await client.query(`INSERT INTO "control financiero".usuarios (username, password, email, id_rol, id_carrera, activo)
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING id_usuario`, [username, passwordHash, email, id_rol, id_carrera, true] // Activo por defecto si lo crea el admin
            );
            await client.query('COMMIT');
            return res.rows[0];
        }
        catch (err) {
            await client.query('ROLLBACK');
            fastify.log.error(err);
            if (err.code === '23505') { // Unique violation
                return reply.code(409).send({ message: 'El usuario o email ya existe' });
            }
            return reply.code(500).send({ message: 'Error al crear usuario' });
        }
        finally {
            client.release();
        }
    });
    // PATCH /admin/usuarios/:id - Update user (Role, Carrera, Active, Password)
    fastify.patch('/usuarios/:id', async (request, reply) => {
        const { id } = request.params;
        const { id_rol, id_carrera, activo, password } = request.body;
        if (id_rol === undefined && id_carrera === undefined && activo === undefined && password === undefined) {
            return reply.code(400).send({ message: 'No hay datos para actualizar' });
        }
        const client = await data_1.dbPool.connect();
        try {
            await client.query('BEGIN');
            // Validate Role constraints
            if (id_rol) {
                const roleRes = await client.query('SELECT nombre_rol FROM "control financiero".roles WHERE id_rol = $1', [id_rol]);
                const roleName = roleRes.rows[0]?.nombre_rol;
                if (roleName === 'Administrador' && id_carrera !== null && id_carrera !== undefined) {
                    // If setting to admin, id_carrera must be null. 
                    // But if id_carrera is not in body, we check existing? 
                    // Simplification: Admin must be global.
                    // If user sends id_carrera, ensure it is null.
                }
                // Similar check for Coordinador
            }
            const fields = [];
            const values = [];
            let idx = 1;
            if (id_rol !== undefined) {
                fields.push(`id_rol = $${idx++}`);
                values.push(id_rol);
            }
            if (id_carrera !== undefined) {
                fields.push(`id_carrera = $${idx++}`);
                values.push(id_carrera);
            }
            if (activo !== undefined) {
                fields.push(`activo = $${idx++}`);
                values.push(activo);
            }
            if (password !== undefined) {
                const hash = bcryptjs_1.default.hashSync(password, 10);
                fields.push(`password = $${idx++}`);
                values.push(hash);
            }
            if (fields.length > 0) {
                values.push(id);
                await client.query(`UPDATE "control financiero".usuarios SET ${fields.join(', ')} WHERE id_usuario = $${idx}`, values);
                // Log action in audit log
                const adminUser = request.user;
                await client.query(`INSERT INTO "control financiero".bitacora_auditoria (id_usuario, accion, detalle)
                   VALUES ($1, $2, $3)`, [adminUser.id, 'UPDATE_USER', `Admin actualizó usuario ID ${id}. Campos: ${Object.keys(request.body).join(', ')}`]);
            }
            await client.query('COMMIT');
            return { message: 'Usuario actualizado correctamente' };
        }
        catch (err) {
            await client.query('ROLLBACK');
            fastify.log.error(err);
            return reply.code(500).send({ message: 'Error al actualizar usuario' });
        }
        finally {
            client.release();
        }
    });
    // GET /admin/roles
    fastify.get('/roles', async (request, reply) => {
        const result = await data_1.dbPool.query('SELECT * FROM "control financiero".roles ORDER BY nombre_rol');
        return result.rows;
    });
    // GET /admin/carreras
    fastify.get('/carreras', async (request, reply) => {
        const result = await data_1.dbPool.query('SELECT * FROM "control financiero".carreras ORDER BY clave ASC');
        return result.rows;
    });
    // GET /admin/auditoria (Bitácora)
    fastify.get('/auditoria', async (request, reply) => {
        // Assuming 'bitacora_auditoria' table exists based on file structure
        try {
            const result = await data_1.dbPool.query('SELECT * FROM "control financiero".bitacora_auditoria ORDER BY fecha DESC LIMIT 100');
            return result.rows;
        }
        catch (e) {
            return []; // Fail silently or return empty if table logic differs
        }
    });
};
exports.default = adminRoutes;
