"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
// server.ts
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const routes_1 = require("./routes");
const data_1 = require("../data");
const auth_middleware_1 = require("./shared/auth.middleware");
class Server {
    constructor(options) {
        this.port = options.port;
        this.app = (0, fastify_1.default)({ logger: true });
    }
    async start() {
        // Plugins / middlewares globales
        // await this.app.register(cors, { origin: true });
        await this.app.register(cors_1.default, {
            origin: true, // permite cualquier origen (en dev está bien)
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-user-carrera'],
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
            if (request.url.startsWith('/health') || request.url.startsWith('/api/auth'))
                return;
            await (0, auth_middleware_1.authMiddleware)(request, reply);
        });
        routes_1.AppRoutes.register(this.app);
        // Cerrar pool cuando el server se apague
        this.app.addHook('onClose', async () => {
            await data_1.dbPool.end();
        });
        await this.app.listen({ port: this.port, host: '0.0.0.0' });
    }
    get instance() {
        return this.app;
    }
}
exports.Server = Server;
