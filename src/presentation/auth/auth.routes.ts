import type { FastifyPluginAsync } from 'fastify';
import { AuthService } from './auth.service';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  
  // POST /login (Local)
  fastify.post('/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute'
      }
    },
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', minLength: 3 },
          password: { type: 'string', minLength: 6 }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    try {
      const result = await AuthService.loginUser(request.body);
      return result;
    } catch (err: any) {
      fastify.log.error(err);
      return reply.code(401).send({
        message: err.message || 'Credenciales inválidas',
      });
    }
  });

  // POST /register (Local)
  fastify.post('/register', {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '1 minute'
      }
    },
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password', 'email'],
        properties: {
          username: { type: 'string', minLength: 3 },
          password: { type: 'string', minLength: 6 },
          email: { type: 'string', format: 'email' }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    try {
      const result = await AuthService.registerUser(request.body);
      return reply.code(201).send(result);
    } catch (err: any) {
      fastify.log.error(err);
      return reply.code(400).send({
        message: err.message || 'Error al intentar registrar el usuario',
      });
    }
  });

  // POST /google (OAuth)
  fastify.post('/google', {
    schema: {
      body: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          id_token: { type: 'string' }
        },
        anyOf: [
          { required: ['token'] },
          { required: ['id_token'] }
        ],
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const { token, id_token } = request.body as any;
    const finalToken = token || id_token;
    
    if (!finalToken) return reply.code(400).send({ message: 'Token es requerido' });

    try {
      const result = await AuthService.loginGoogle(finalToken);
      return result;
    } catch (err: any) {
      fastify.log.error(err);
      const status = err.message.includes('pendiente') ? 403 : 401;
      return reply.code(status).send({
        message: err.message || 'Error en autenticación con Google',
      });
    }
  });

  // POST /microsoft (OAuth)
  fastify.post('/microsoft', {
    schema: {
      body: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          id_token: { type: 'string' },
          foto_url: { type: 'string', nullable: true }
        },
        anyOf: [
          { required: ['token'] },
          { required: ['id_token'] }
        ],
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    const { token, id_token, foto_url } = request.body as any;
    const finalToken = token || id_token;

    if (!finalToken) return reply.code(400).send({ message: 'Token es requerido' });

    try {
      const result = await AuthService.loginMicrosoft(finalToken, foto_url);
      return result;
    } catch (err: any) {
      fastify.log.error(err);
      const status = err.message.includes('pendiente') ? 403 : 401;
      return reply.code(status).send({
        message: err.message || 'Error en autenticación con Microsoft',
      });
    }
  });
};

export default authRoutes;
