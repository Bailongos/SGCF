"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_service_1 = require("./auth.service");
const authRoutes = async (fastify) => {
    // POST /login (Local)
    fastify.post('/login', async (request, reply) => {
        try {
            const result = await auth_service_1.AuthService.loginUser(request.body);
            return result;
        }
        catch (err) {
            fastify.log.error(err);
            return reply.code(401).send({
                message: err.message || 'Credenciales inválidas',
            });
        }
    });
    // POST /google (OAuth)
    fastify.post('/google', async (request, reply) => {
        const { token } = request.body; // id_token
        if (!token)
            return reply.code(400).send({ message: 'Token es requerido' });
        try {
            const result = await auth_service_1.AuthService.loginGoogle(token);
            return result;
        }
        catch (err) {
            fastify.log.error(err);
            const status = err.message.includes('pendiente') ? 403 : 401;
            return reply.code(status).send({
                message: err.message || 'Error en autenticación con Google',
            });
        }
    });
    // POST /microsoft (OAuth)
    fastify.post('/microsoft', async (request, reply) => {
        const { token } = request.body; // id_token
        if (!token)
            return reply.code(400).send({ message: 'Token es requerido' });
        try {
            const result = await auth_service_1.AuthService.loginMicrosoft(token);
            return result;
        }
        catch (err) {
            fastify.log.error(err);
            const status = err.message.includes('pendiente') ? 403 : 401;
            return reply.code(status).send({
                message: err.message || 'Error en autenticación con Microsoft',
            });
        }
    });
};
exports.default = authRoutes;
