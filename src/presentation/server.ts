// server.ts
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { AppRoutes } from './routes';
import { dbPool } from '../data';
import { authMiddleware } from './shared/auth.middleware';


interface ServerOptions {
  port: number;
}

export class Server {
  private app: FastifyInstance;
  private port: number;

  constructor(options: ServerOptions) {
    this.port = options.port;
    this.app = Fastify({ logger: true });
  }

  async start() {
    // Plugins / middlewares globales
    // await this.app.register(cors, { origin: true });
    await this.app.register(cors, {
      origin: true, // permite cualquier origen (en dev está bien)
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-user-carrera'],
    });

    // Seguridad: Cabeceras HTTP (Helmet)
    await this.app.register(helmet, {
      contentSecurityPolicy: false, // Desactivar si el frontend consume la API directamente desde otro puerto
    });

    // Seguridad: Prevención de ataques de fuerza bruta (Rate Limit)
    await this.app.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
      errorResponseBuilder: (request, context) => ({
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Demasiadas peticiones. Por favor, reintenta en ${context.after}.`
      })
    });
    
    // Health
    this.app.get('/health', async () => ({
      ok: true,
      message: 'SGCF API funcionando 🚀',
    }));

    // Rutas de la app (módulos)
    
    // Aplicar middleware de autenticación a todas las rutas bajo /api (opcional) o global
    this.app.addHook('preHandler', async (request, reply) => {
      // Omitir healthcheck y rutas de autenticación
      if (request.url.startsWith('/health') || request.url.startsWith('/api/auth')) return;
      await authMiddleware(request, reply);
    });

    AppRoutes.register(this.app);

    // Cerrar pool cuando el server se apague
    this.app.addHook('onClose', async () => {
      await dbPool.end();
    });

    await this.app.listen({ port: this.port, host: '0.0.0.0' });
  }

  get instance() {
    return this.app;
  }
}
