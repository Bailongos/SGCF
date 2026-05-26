import { FastifyRequest, FastifyReply } from 'fastify';
import { JwtAdapter } from '../../config/jwt';

/**
 * Middleware para validar la sesión del usuario.
 * Soporta Bearer Token (JWT) y x-user-id (fallback para compatibilidad).
 */
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authorization = request.headers['authorization'];
  
  // 1. Intentar con Bearer Token (JWT)
  if (authorization && authorization.startsWith('Bearer ')) {
    const token = authorization.split(' ')[1];
    const payload = await JwtAdapter.validateToken<any>(token);

    if (payload) {
      (request as any).user = {
        id: payload.id,
        id_carrera: payload.id_carrera,
        role: payload.role
      };
      return;
    }
    // Si el token falló pero está presente, lo consideramos un error
    return reply.code(401).send({ message: 'Token de acceso inválido o expirado' });
  }

  // Si no hay token de autorización
  return reply.code(401).send({ message: 'No autenticado. Se requiere Token de sesión válido' });
}
