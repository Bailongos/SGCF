"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppRoutes = void 0;
const alumnos_routes_1 = __importDefault(require("./alumnos/alumnos.routes"));
const carrera_routes_1 = __importDefault(require("./carrera/carrera.routes"));
const becas_routes_1 = __importDefault(require("./becas/becas.routes"));
const roles_routes_1 = __importDefault(require("./roles/roles.routes"));
const metodo_pago_routes_1 = __importDefault(require("./metodo-pago/metodo-pago.routes"));
const ciclos_escolares_routes_1 = __importDefault(require("./ciclos-escolares/ciclos-escolares.routes"));
const conceptos_routes_1 = __importDefault(require("./conceptos/conceptos.routes"));
const usuarios_routes_1 = __importDefault(require("./usuarios/usuarios.routes"));
const observaciones_routes_1 = __importDefault(require("./obsercaciones/observaciones.routes"));
const cuentas_routes_1 = __importDefault(require("./cuentas/cuentas.routes"));
const pagos_routes_1 = __importDefault(require("./pagos/pagos.routes"));
const bitacora_routes_1 = __importDefault(require("./bitacora/bitacora.routes"));
const auth_routes_1 = __importDefault(require("./auth/auth.routes"));
const admin_routes_1 = __importDefault(require("./admin/admin.routes"));
class AppRoutes {
    static register(app) {
        // ======= CATÁLOGOS / BÁSICOS =======
        app.register(alumnos_routes_1.default, { prefix: '/api/alumnos' });
        app.register(carrera_routes_1.default, { prefix: '/api/carreras' });
        app.register(becas_routes_1.default, { prefix: '/api/becas' });
        app.register(roles_routes_1.default, { prefix: '/api/roles' });
        app.register(metodo_pago_routes_1.default, { prefix: '/api/metodos-pago' });
        app.register(ciclos_escolares_routes_1.default, { prefix: '/api/ciclos-escolares' });
        app.register(conceptos_routes_1.default, { prefix: '/api/conceptos' });
        // ======= USUARIOS / OBSERVACIONES =======
        app.register(usuarios_routes_1.default, { prefix: '/api/usuarios' }); // Consider restricting this
        app.register(observaciones_routes_1.default, { prefix: '/api/observaciones' });
        // ======= FINANCIERO =======
        app.register(cuentas_routes_1.default, { prefix: '/api/cuentas' });
        app.register(pagos_routes_1.default, { prefix: '/api/pagos' });
        // ======= AUDITORÍA =======
        app.register(bitacora_routes_1.default, { prefix: '/api/bitacora' });
        // ======= AUTENTICACIÓN =======
        app.register(auth_routes_1.default, { prefix: '/api/auth' });
        // ======= ADMIN =======
        app.register(admin_routes_1.default, { prefix: '/api/admin' });
    }
}
exports.AppRoutes = AppRoutes;
