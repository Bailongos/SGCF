"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//cuentas.routes.ts
const crud_service_1 = require("../../services/crud.service");
const crud_routes_1 = require("../shared/crud.routes");
const cuentasService = new crud_service_1.CrudService('cuentas_por_cobrar', 'id_cuenta', true);
exports.default = (0, crud_routes_1.buildCrudRoutes)(cuentasService, 'id', {
    resolveScope: (req) => {
        const user = req.user;
        if (user?.id_carrera) {
            return {
                scopeParams: {
                    tableField: `(SELECT id_carrera FROM "control financiero".alumnos a WHERE a.matricula = "control financiero".cuentas_por_cobrar.matricula)`,
                    idCarrera: user.id_carrera
                }
            };
        }
        return undefined;
    }
});
