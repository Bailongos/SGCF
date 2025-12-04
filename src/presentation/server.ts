import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { AppRoutes } from './routes';
import { dbPool } from '../data';

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
    await this.app.register(cors, { origin: true });

    // Health
    this.app.get('/health', async () => ({
      ok: true,
      message: 'SGCF API funcionando 🚀',
    }));

    // Rutas de la app (módulos)
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
