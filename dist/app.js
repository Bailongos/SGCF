"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppRoutes = void 0;
const config_1 = require("./config");
const data_1 = require("./data");
const server_1 = require("./presentation/server");
const alumnos_routes_1 = __importDefault(require("../src/presentation/alumnos/alumnos.routes"));
const carrera_routes_1 = __importDefault(require("../src/presentation/carrera/carrera.routes"));
const roles_routes_1 = __importDefault(require("../src/presentation/roles/roles.routes"));
const metodo_pago_routes_1 = __importDefault(require("../src/presentation/metodo-pago/metodo-pago.routes"));
const ciclos_escolares_routes_1 = __importDefault(require("./presentation/ciclos-escolares/ciclos-escolares.routes"));
const conceptos_routes_1 = __importDefault(require("../src/presentation/conceptos/conceptos.routes"));
const becas_routes_1 = __importDefault(require("../src/presentation/becas/becas.routes"));
const usuarios_routes_1 = __importDefault(require("../src/presentation/usuarios/usuarios.routes"));
const observaciones_routes_1 = __importDefault(require("../src/presentation/obsercaciones/observaciones.routes"));
const cuentas_routes_1 = __importDefault(require("../src/presentation/cuentas/cuentas.routes"));
const pagos_routes_1 = __importDefault(require("../src/presentation/pagos/pagos.routes"));
const bitacora_routes_1 = __importDefault(require("../src/presentation/bitacora/bitacora.routes"));
class AppRoutes {
    static register(app) {
        app.register(alumnos_routes_1.default, { prefix: '/api/alumnos' });
        app.register(carrera_routes_1.default, { prefix: '/api/carreras' });
        app.register(roles_routes_1.default, { prefix: '/api/roles' });
        app.register(metodo_pago_routes_1.default, { prefix: '/api/metodos-pago' });
        app.register(ciclos_escolares_routes_1.default, { prefix: '/api/ciclos-escolares' });
        app.register(conceptos_routes_1.default, { prefix: '/api/conceptos' });
        app.register(becas_routes_1.default, { prefix: '/api/becas' });
        app.register(usuarios_routes_1.default, { prefix: '/api/usuarios' });
        app.register(observaciones_routes_1.default, { prefix: '/api/observaciones' });
        app.register(cuentas_routes_1.default, { prefix: '/api/cuentas' });
        app.register(pagos_routes_1.default, { prefix: '/api/pagos' });
        app.register(bitacora_routes_1.default, { prefix: '/api/bitacora' });
    }
}
exports.AppRoutes = AppRoutes;
(async () => {
    try {
        // Verificar conexión con la BD antes de levantar el server
        await (0, data_1.testDbConnection)();
        const server = new server_1.Server({
            port: config_1.envs.PORT,
        });
        await server.start();
    }
    catch (error) {
        console.error('Error al iniciar SGCF:', error);
        process.exit(1);
    }
})();
