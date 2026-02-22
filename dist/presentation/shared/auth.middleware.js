"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jwt_1 = require("../../config/jwt");
/**
 * Middleware para validar la sesión del usuario.
 * Soporta Bearer Token (JWT) y x-user-id (fallback para compatibilidad).
 */
async function authMiddleware(request, reply) {
    const authorization = request.headers['authorization'];
    // 1. Intentar con Bearer Token (JWT)
    if (authorization && authorization.startsWith('Bearer ')) {
        const token = authorization.split(' ')[1];
        const payload = await jwt_1.JwtAdapter.validateToken(token);
        if (payload) {
            request.user = {
                id: payload.id,
                id_carrera: payload.id_carrera,
                role: payload.role
            };
            return;
        }
        // Si el token falló pero está presente, lo consideramos un error
        return reply.code(401).send({ message: 'Token de acceso inválido o expirado' });
    }
    // 2. Fallback a headers manuales (Compatibilidad o Debug)
    const userId = request.headers['x-user-id'];
    const userCarrera = request.headers['x-user-carrera'];
    if (userId) {
        request.user = {
            id: userId,
            id_carrera: userCarrera ? parseInt(userCarrera, 10) : null
        };
        return;
    }
    // 3. Si no hay nada, error
    return reply.code(401).send({ message: 'No autenticado. Se requiere Token u Headers de sesión' });
}
